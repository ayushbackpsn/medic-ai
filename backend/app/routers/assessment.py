from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json
import uuid
from datetime import datetime

from app.database.database import get_db
from app.models.models import User, Patient, HealthRecord, VitalSigns, Symptom, RiskAssessment, Recommendation
from app.schemas.schemas import AssessmentRequest, AssessmentOut
from app.routers.auth import get_current_user
from ml.predict import assess_risk

router = APIRouter(prefix="/api", tags=["Assessment & ML"])

def generate_recommendation_content(risk_level: str, symptoms: list, vitals: dict):
    symptom_names = [s.get("symptom_name", "").lower() for s in symptoms]
    actions = []
    
    if risk_level == "LOW":
        title = "Routine Monitoring & Home Care"
        actions = [
            "Monitor vital signs every 1-2 weeks.",
            "Ensure adequate hydration and balanced nutrition.",
            "Instruct patient/family to seek immediate medical help if symptoms worsen.",
            "Provide general wellness & hygiene guidance."
        ]
        urgency = "Non-urgent. Regular follow-up at next routine ASHA visit."
        
    elif risk_level == "MEDIUM":
        title = "Follow-Up & Medical Consultation Recommended"
        actions = [
            "Schedule a visit to the local Primary Health Centre (PHC) within 48-72 hours.",
            "Monitor BP, SpO2, and temperature daily.",
            "Administer prescribed OTC relief measures for fever/pain if appropriate.",
            "Check for any emerging warning signs (difficulty breathing, continuous vomiting)."
        ]
        urgency = "Moderate. Consult PHC medical officer soon."
        
    elif risk_level == "HIGH":
        title = "Prompt Healthcare Referral Required"
        actions = [
            "Immediate referral to the nearest Primary Health Centre (PHC) / Community Health Centre (CHC).",
            "Keep patient seated comfortably and assist with transport.",
            "Monitor oxygen levels and blood pressure continuously.",
            "Provide emergency contact details to the family."
        ]
        urgency = "High Priority! Prompt evaluation needed."
        
    else: # CRITICAL
        title = "EMERGENCY MEDICAL ATTENTION REQUIRED"
        actions = [
            "IMMEDIATE EMERGENCY REFERRAL TO DISTRICT HOSPITAL / PHC EMERGENCY UNIT!",
            "Arrange immediate emergency ambulance / transport.",
            "Keep patient in a clear airway position; provide supplemental oxygen if available.",
            "Alert destination PHC / Emergency Staff in advance."
        ]
        urgency = "CRITICAL EMERGENCY! Do not delay transport."

    return title, actions, urgency

@router.post("/assessment", response_model=AssessmentOut)
def run_assessment(
    req: AssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Get medical history dict
    med_hist = {}
    if patient.medical_history:
        med_hist = {
            "diabetes": patient.medical_history.diabetes,
            "hypertension": patient.medical_history.hypertension,
            "heart_disease": patient.medical_history.heart_disease,
            "asthma": patient.medical_history.asthma,
            "kidney_disease": patient.medical_history.kidney_disease
        }
    elif req.medical_history:
        med_hist = req.medical_history.dict()
        
    # Run ML risk assessment engine
    ml_result = assess_risk(
        patient_data={"age": patient.age, "gender": patient.gender, "is_pregnant": patient.is_pregnant},
        vitals=req.vitals.dict(),
        medical_history=med_hist,
        symptoms=[s.dict() for s in req.symptoms]
    )
    
    # Save Health Record
    record_id = f"REC-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    health_record = HealthRecord(
        id=record_id,
        patient_id=patient.id,
        asha_worker_id=current_user.id
    )
    db.add(health_record)
    
    # Save Vitals
    vitals = req.vitals
    bmi = round(vitals.weight_kg / ((vitals.height_cm / 100) ** 2), 1)
    vital_signs = VitalSigns(
        health_record_id=record_id,
        systolic_bp=vitals.systolic_bp,
        diastolic_bp=vitals.diastolic_bp,
        heart_rate=vitals.heart_rate,
        respiratory_rate=vitals.respiratory_rate,
        temperature_c=vitals.temperature_c,
        spo2=vitals.spo2,
        blood_glucose=vitals.blood_glucose,
        weight_kg=vitals.weight_kg,
        height_cm=vitals.height_cm,
        bmi=bmi
    )
    db.add(vital_signs)
    
    # Save Symptoms
    for sym in req.symptoms:
        s_obj = Symptom(
            health_record_id=record_id,
            symptom_name=sym.symptom_name,
            severity=sym.severity,
            duration_days=sym.duration_days
        )
        db.add(s_obj)
        
    # Save Risk Assessment
    assessment_id = f"ASM-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    risk_obj = RiskAssessment(
        id=assessment_id,
        health_record_id=record_id,
        risk_level=ml_result["risk_level"],
        confidence_score=ml_result["confidence_score"],
        risk_factors_json=json.dumps(ml_result["risk_factors"]),
        assessment_source="ONLINE_ML"
    )
    db.add(risk_obj)
    
    # Save Recommendation
    rec_title, rec_actions, rec_urgency = generate_recommendation_content(
        ml_result["risk_level"],
        [s.dict() for s in req.symptoms],
        req.vitals.dict()
    )
    rec_obj = Recommendation(
        risk_assessment_id=assessment_id,
        title=rec_title,
        actions_json=json.dumps(rec_actions),
        urgency_note=rec_urgency
    )
    db.add(rec_obj)
    
    db.commit()
    
    return AssessmentOut(
        id=assessment_id,
        health_record_id=record_id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        risk_level=ml_result["risk_level"],
        confidence_score=ml_result["confidence_score"],
        risk_factors=ml_result["risk_factors"],
        recommendation_title=rec_title,
        recommendations=rec_actions,
        urgency_note=rec_urgency,
        created_at=datetime.utcnow(),
        assessment_source="ONLINE_ML"
    )

@router.get("/assessment/{assessment_id}", response_model=AssessmentOut)
def get_assessment(assessment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    risk_obj = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
    if not risk_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    record = risk_obj.health_record
    patient = record.patient
    rec = risk_obj.recommendation
    
    return AssessmentOut(
        id=risk_obj.id,
        health_record_id=record.id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        risk_level=risk_obj.risk_level,
        confidence_score=risk_obj.confidence_score,
        risk_factors=json.loads(risk_obj.risk_factors_json) if risk_obj.risk_factors_json else [],
        recommendation_title=rec.title if rec else "Recommendation",
        recommendations=json.loads(rec.actions_json) if rec and rec.actions_json else [],
        urgency_note=rec.urgency_note if rec else "",
        created_at=risk_obj.created_at,
        assessment_source=risk_obj.assessment_source or "ONLINE_ML"
    )

from app.schemas.schemas import AssessmentRequest, AssessmentOut, PredictRequest

@router.post("/ml/predict")
def predict_stateless(req: PredictRequest):
    return assess_risk(req.patient_data, req.vitals, req.medical_history or {}, req.symptoms or [])

