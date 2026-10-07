from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import json
import uuid

from app.database.database import get_db
from app.models.models import User, Patient, MedicalHistory, HealthRecord, VitalSigns, Symptom, RiskAssessment, Recommendation, Referral, SyncLog
from app.schemas.schemas import SyncBatchRequest
from app.routers.auth import get_current_user
from ml.predict import assess_risk
from app.routers.assessment import generate_recommendation_content

router = APIRouter(prefix="/api/sync", tags=["Sync"])

@router.post("")
def sync_data(
    batch: SyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    synced_count = 0
    errors = []
    
    for item in batch.items:
        try:
            item_type = item.type.upper()
            payload = item.payload
            
            if item_type == "PATIENT":
                pid = payload.get("id") or item.local_id
                existing = db.query(Patient).filter(Patient.id == pid).first()
                if not existing:
                    p = Patient(
                        id=pid,
                        asha_worker_id=current_user.id,
                        full_name=payload.get("full_name"),
                        age=payload.get("age", 35),
                        gender=payload.get("gender", "Unknown"),
                        phone_number=payload.get("phone_number", ""),
                        address=payload.get("address", ""),
                        village=payload.get("village", ""),
                        district=payload.get("district", ""),
                        state=payload.get("state", ""),
                        is_pregnant=payload.get("is_pregnant", False),
                        gestational_age_weeks=payload.get("gestational_age_weeks"),
                        emergency_contact=payload.get("emergency_contact", "")
                    )
                    db.add(p)
                    db.flush()
                    
                    mh_data = payload.get("medical_history")
                    if mh_data:
                        mh = MedicalHistory(
                            patient_id=pid,
                            diabetes=mh_data.get("diabetes", False),
                            hypertension=mh_data.get("hypertension", False),
                            heart_disease=mh_data.get("heart_disease", False),
                            asthma=mh_data.get("asthma", False),
                            kidney_disease=mh_data.get("kidney_disease", False),
                            previous_hospitalization=mh_data.get("previous_hospitalization", False),
                            other_conditions=mh_data.get("other_conditions", ""),
                            current_medications=mh_data.get("current_medications", ""),
                            allergies=mh_data.get("allergies", "")
                        )
                        db.add(mh)
                    synced_count += 1

            elif item_type == "ASSESSMENT":
                pid = payload.get("patient_id")
                patient = db.query(Patient).filter(Patient.id == pid).first()
                if patient:
                    record_id = payload.get("health_record_id") or f"REC-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
                    existing_rec = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
                    if not existing_rec:
                        hr = HealthRecord(id=record_id, patient_id=pid, asha_worker_id=current_user.id)
                        db.add(hr)
                        
                        vitals_data = payload.get("vitals", {})
                        bmi = float(vitals_data.get("bmi") or (vitals_data.get("weight_kg", 65) / ((vitals_data.get("height_cm", 165) / 100) ** 2)))
                        vs = VitalSigns(
                            health_record_id=record_id,
                            systolic_bp=vitals_data.get("systolic_bp", 120),
                            diastolic_bp=vitals_data.get("diastolic_bp", 80),
                            heart_rate=vitals_data.get("heart_rate", 75),
                            respiratory_rate=vitals_data.get("respiratory_rate", 16),
                            temperature_c=vitals_data.get("temperature_c", 37.0),
                            spo2=vitals_data.get("spo2", 98.0),
                            blood_glucose=vitals_data.get("blood_glucose", 110.0),
                            weight_kg=vitals_data.get("weight_kg", 65.0),
                            height_cm=vitals_data.get("height_cm", 165.0),
                            bmi=round(bmi, 1)
                        )
                        db.add(vs)
                        
                        symptoms_data = payload.get("symptoms", [])
                        for sym in symptoms_data:
                            db.add(Symptom(
                                health_record_id=record_id,
                                symptom_name=sym.get("symptom_name", ""),
                                severity=sym.get("severity", "Mild"),
                                duration_days=sym.get("duration_days", 1)
                            ))
                            
                        asm_id = payload.get("id") or item.local_id
                        risk_level = payload.get("risk_level", "LOW")
                        conf = payload.get("confidence_score", 0.85)
                        factors = payload.get("risk_factors", [])
                        
                        ra = RiskAssessment(
                            id=asm_id,
                            health_record_id=record_id,
                            risk_level=risk_level,
                            confidence_score=conf,
                            risk_factors_json=json.dumps(factors),
                            assessment_source="OFFLINE_SYNC"
                        )
                        db.add(ra)
                        
                        title, actions, urgency = generate_recommendation_content(risk_level, symptoms_data, vitals_data)
                        rec = Recommendation(
                            risk_assessment_id=asm_id,
                            title=title,
                            actions_json=json.dumps(actions),
                            urgency_note=urgency
                        )
                        db.add(rec)
                        synced_count += 1

            elif item_type == "REFERRAL":
                ref_id = payload.get("id") or item.local_id
                existing_ref = db.query(Referral).filter(Referral.id == ref_id).first()
                if not existing_ref:
                    rf = Referral(
                        id=ref_id,
                        patient_id=payload.get("patient_id"),
                        health_record_id=payload.get("health_record_id"),
                        risk_assessment_id=payload.get("risk_assessment_id"),
                        asha_worker_id=current_user.id,
                        phc_id=payload.get("phc_id", 1),
                        status=payload.get("status", "PENDING"),
                        reason=payload.get("reason", "High Risk Assessment Referral")
                    )
                    db.add(rf)
                    synced_count += 1

        except Exception as e:
            errors.append(f"Item {item.local_id}: {str(e)}")
            
    # Log sync event
    sync_log = SyncLog(
        asha_worker_id=current_user.id,
        records_synced=synced_count,
        status="SUCCESS" if not errors else "PARTIAL",
        synced_at=datetime.utcnow()
    )
    db.add(sync_log)
    db.commit()
    
    return {
        "status": "success",
        "synced_records_count": synced_count,
        "errors": errors,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/status")
def get_sync_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    last_log = db.query(SyncLog).filter(SyncLog.asha_worker_id == current_user.id).order_by(SyncLog.synced_at.desc()).first()
    return {
        "last_sync_at": last_log.synced_at.isoformat() if last_log else None,
        "last_sync_count": last_log.records_synced if last_log else 0,
        "status": "CONNECTED"
    }
