from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.database.database import get_db
from app.models.models import User, Patient, MedicalHistory, HealthRecord, VitalSigns, Symptom, RiskAssessment, Referral
from app.schemas.schemas import PatientCreate, PatientOut, MedicalHistoryBase
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[PatientOut])
def get_patients(
    search: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)
    
    # If ASHA worker, filter by asha worker
    if current_user.role == "ASHA":
        query = query.filter(Patient.asha_worker_id == current_user.id)
        
    if search:
        query = query.filter(Patient.full_name.ilike(f"%{search}%") | Patient.id.ilike(f"%{search}%"))
    if village:
        query = query.filter(Patient.village.ilike(f"%{village}%"))
        
    patients = query.order_by(Patient.created_at.desc()).all()
    return patients

@router.post("", response_model=PatientOut)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient_id = patient_in.id or f"PAT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    existing = db.query(Patient).filter(Patient.id == patient_id).first()
    if existing:
        return existing

    patient = Patient(
        id=patient_id,
        asha_worker_id=current_user.id,
        full_name=patient_in.full_name,
        age=patient_in.age,
        gender=patient_in.gender,
        phone_number=patient_in.phone_number,
        address=patient_in.address,
        village=patient_in.village,
        district=patient_in.district,
        state=patient_in.state,
        is_pregnant=patient_in.is_pregnant,
        gestational_age_weeks=patient_in.gestational_age_weeks,
        emergency_contact=patient_in.emergency_contact
    )
    db.add(patient)
    db.flush()

    if patient_in.medical_history:
        mh = MedicalHistory(
            patient_id=patient_id,
            diabetes=patient_in.medical_history.diabetes,
            hypertension=patient_in.medical_history.hypertension,
            heart_disease=patient_in.medical_history.heart_disease,
            asthma=patient_in.medical_history.asthma,
            kidney_disease=patient_in.medical_history.kidney_disease,
            previous_hospitalization=patient_in.medical_history.previous_hospitalization,
            other_conditions=patient_in.medical_history.other_conditions,
            current_medications=patient_in.medical_history.current_medications,
            allergies=patient_in.medical_history.allergies
        )
        db.add(mh)

    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient.full_name = patient_in.full_name
    patient.age = patient_in.age
    patient.gender = patient_in.gender
    patient.phone_number = patient_in.phone_number
    patient.address = patient_in.address
    patient.village = patient_in.village
    patient.district = patient_in.district
    patient.state = patient_in.state
    patient.is_pregnant = patient_in.is_pregnant
    patient.gestational_age_weeks = patient_in.gestational_age_weeks
    patient.emergency_contact = patient_in.emergency_contact

    if patient_in.medical_history:
        if patient.medical_history:
            mh = patient.medical_history
            mh.diabetes = patient_in.medical_history.diabetes
            mh.hypertension = patient_in.medical_history.hypertension
            mh.heart_disease = patient_in.medical_history.heart_disease
            mh.asthma = patient_in.medical_history.asthma
            mh.kidney_disease = patient_in.medical_history.kidney_disease
            mh.previous_hospitalization = patient_in.medical_history.previous_hospitalization
            mh.other_conditions = patient_in.medical_history.other_conditions
            mh.current_medications = patient_in.medical_history.current_medications
            mh.allergies = patient_in.medical_history.allergies
        else:
            mh = MedicalHistory(
                patient_id=patient_id,
                **patient_in.medical_history.dict()
            )
            db.add(mh)

    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{patient_id}/history")
def get_patient_history(patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    records = db.query(HealthRecord).filter(HealthRecord.patient_id == patient_id).order_by(HealthRecord.recorded_at.desc()).all()
    
    history_data = []
    for r in records:
        vitals = r.vitals
        symptoms = [s.symptom_name for s in r.symptoms]
        risk = r.risk_assessment
        history_data.append({
            "record_id": r.id,
            "recorded_at": r.recorded_at.isoformat(),
            "vitals": {
                "bp": f"{vitals.systolic_bp}/{vitals.diastolic_bp}" if vitals else "N/A",
                "heart_rate": vitals.heart_rate if vitals else "N/A",
                "spo2": vitals.spo2 if vitals else "N/A",
                "temperature": vitals.temperature_c if vitals else "N/A",
                "bmi": vitals.bmi if vitals else "N/A"
            } if vitals else None,
            "symptoms": symptoms,
            "risk_level": risk.risk_level if risk else "UNKNOWN",
            "confidence_score": risk.confidence_score if risk else 0.0,
            "risk_factors": eval(risk.risk_factors_json) if risk and risk.risk_factors_json else []
        })
        
    return {
        "patient": {
            "id": patient.id,
            "name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "village": patient.village
        },
        "history": history_data
    }
