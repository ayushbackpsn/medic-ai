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

def generate_prescriptions_for_medium(symptoms: list, vitals: dict):
    """
    Prescribe primary care / ASHA Essential Drug Kit medicines
    ONLY for MEDIUM risk patients based on presenting symptoms and vitals.
    """
    symptom_names = [s.get("symptom_name", "").lower() for s in symptoms]
    temp = float(vitals.get("temperature_c", 37.0) or 37.0)
    prescriptions = []

    # 1. Fever / High Temperature / Headache / Body Pain
    has_fever = any("fever" in name for name in symptom_names) or temp >= 37.8
    has_pain = any(p in name for name in symptom_names for p in ["headache", "severe_pain", "body", "pain"])
    if has_fever or has_pain:
        prescriptions.append({
            "medicine_name": "Paracetamol (PCM) 500mg",
            "dosage": "1 Tablet (500mg)",
            "frequency": "Every 6 to 8 hours as needed (Max 3-4 tablets/day)",
            "duration": "3 Days",
            "instructions": "Take after meals with water for fever & pain relief. Consult PHC doctor if fever lasts > 3 days."
        })

    # 2. Cough / Cold / Sore Throat
    if any(c in name for name in symptom_names for c in ["cough", "cold", "sore throat"]):
        prescriptions.append({
            "medicine_name": "Cetirizine 10mg",
            "dosage": "1 Tablet (10mg)",
            "frequency": "Once daily at bedtime",
            "duration": "3 - 5 Days",
            "instructions": "Relieves runny nose, sneezing, and allergic cough. May cause mild drowsiness."
        })
        prescriptions.append({
            "medicine_name": "Steam Inhalation & Warm Saline Gargle",
            "dosage": "Inhale steam for 5-10 minutes",
            "frequency": "2 - 3 Times daily",
            "duration": "4 - 5 Days",
            "instructions": "Loosens mucus congestion and soothes throat."
        })

    # 3. Diarrhea / Loose Stools
    if any("diarrhea" in name for name in symptom_names):
        prescriptions.append({
            "medicine_name": "Oral Rehydration Salts (ORS)",
            "dosage": "1 Sachet in 1 Liter clean boiled/filtered water",
            "frequency": "Drink continuously after every loose stool",
            "duration": "3 Days",
            "instructions": "Restores lost electrolytes and prevents severe dehydration."
        })
        prescriptions.append({
            "medicine_name": "Zinc Sulfate 20mg",
            "dosage": "1 Tablet (20mg)",
            "frequency": "Once daily after meals",
            "duration": "14 Days",
            "instructions": "Promotes gut healing and reduces recurrence of diarrhea."
        })

    # 4. Vomiting / Nausea
    if any("vomit" in name or "nausea" in name for name in symptom_names):
        prescriptions.append({
            "medicine_name": "Domperidone 10mg / Ondansetron 4mg",
            "dosage": "1 Tablet",
            "frequency": "Twice daily, 30 minutes before food",
            "duration": "2 Days",
            "instructions": "Take with small sips of water. Avoid heavy or oily foods."
        })

    # 5. Acidity / Abdominal Pain
    if any("abdominal" in name or "acidity" in name or "stomach" in name for name in symptom_names):
        prescriptions.append({
            "medicine_name": "Antacid Gel / Pantoprazole 40mg",
            "dosage": "1 Tablet (or 2 tsp antacid gel)",
            "frequency": "Once daily in morning 30 mins before breakfast",
            "duration": "3 - 5 Days",
            "instructions": "Relieves burning sensation and gastric irritation."
        })

    # 6. Dizziness / Weakness / Fatigue
    if any("dizziness" in name or "weakness" in name or "fatigue" in name for name in symptom_names):
        prescriptions.append({
            "medicine_name": "Oral Electrolyte Solution (Electral / Glucose-D)",
            "dosage": "1-2 Glasses daily",
            "frequency": "Twice daily (Morning & Evening)",
            "duration": "3 Days",
            "instructions": "Rest in a cool, ventilated room. Maintain continuous hydration."
        })

    # Fallback if no specific condition matched
    if not prescriptions:
        prescriptions.append({
            "medicine_name": "Paracetamol 500mg (ASHA Kit)",
            "dosage": "1 Tablet",
            "frequency": "Every 8 hours as needed for discomfort",
            "duration": "2 - 3 Days",
            "instructions": "Take after meals for relief while awaiting PHC doctor consultation."
        })
        prescriptions.append({
            "medicine_name": "Oral Rehydration Salts (ORS)",
            "dosage": "1 Sachet in 1 Liter water",
            "frequency": "Throughout the day",
            "duration": "2 Days",
            "instructions": "Drink plenty of fluids and get adequate bed rest."
        })

    return prescriptions


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
        title = "Follow-Up, Medical Consultation & Primary Medication"
        actions = [
            "Consult Primary Health Centre (PHC) Medical Officer within 48-72 hours.",
            "Administer prescribed ASHA Kit essential medicines below according to dosage.",
            "Monitor BP, SpO2, and temperature daily.",
            "Watch for warning signs (increasing breathlessness, persistent vomiting, high fever)."
        ]
        urgency = "Moderate. Start primary medications and visit PHC within 48-72h."
        
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
    
    # Prescriptions generated ONLY for MEDIUM risk level
    prescriptions = []
    if ml_result["risk_level"] == "MEDIUM":
        prescriptions = generate_prescriptions_for_medium([s.dict() for s in req.symptoms], req.vitals.dict())
    
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
        prescriptions=prescriptions,
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
    
    # Extract symptoms and vitals from record for prescriptions if MEDIUM
    prescriptions = []
    if risk_obj.risk_level == "MEDIUM":
        syms = [{"symptom_name": s.symptom_name, "severity": s.severity} for s in record.symptoms] if record.symptoms else []
        v_dict = {"temperature_c": record.vitals.temperature_c} if record.vitals else {}
        prescriptions = generate_prescriptions_for_medium(syms, v_dict)
    
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
        prescriptions=prescriptions,
        urgency_note=rec.urgency_note if rec else "",
        created_at=risk_obj.created_at,
        assessment_source=risk_obj.assessment_source or "ONLINE_ML"
    )

from app.schemas.schemas import AssessmentRequest, AssessmentOut, PredictRequest

@router.post("/ml/predict")
def predict_stateless(req: PredictRequest):
    return assess_risk(req.patient_data, req.vitals, req.medical_history or {}, req.symptoms or [])

