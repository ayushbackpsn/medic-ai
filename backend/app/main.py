from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import uuid

from app.database.database import engine, Base, SessionLocal
from app.models.models import User, PHC, Patient, MedicalHistory, HealthRecord, VitalSigns, Symptom, RiskAssessment, Recommendation, Referral
from app.routers import auth, patients, assessment, referrals, sync, dashboard
from app.routers.auth import get_password_hash
from app.routers.assessment import generate_recommendation_content

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ASHA Rural Health Triage System API",
    description="Offline-First AI Decision Support & Triage System for Rural Healthcare Workers",
    version="2.0.0"
)

# Enable CORS for frontend PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(assessment.router)
app.include_router(referrals.router)
app.include_router(sync.router)
app.include_router(dashboard.router)

@app.on_event("startup")
def seed_demo_data():
    db: Session = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "asha_demo").first():
            print("Seeding initial demo database records...")


            
            # 1. Create PHC
            phc1 = PHC(name="Rampur Primary Health Centre", code="PHC-RMP-01", village="Rampur", district="Sehore", state="Madhya Pradesh", contact_number="+91 98765 43210")
            phc2 = PHC(name="Chandpur Community Health Centre", code="CHC-CHP-02", village="Chandpur", district="Sehore", state="Madhya Pradesh", contact_number="+91 98765 12345")
            db.add(phc1)
            db.add(phc2)
            db.flush()

            # 2. Create Demo Users
            asha_user = User(username="asha_demo", hashed_password=get_password_hash("demo123"), full_name="Anita Sharma (ASHA Worker)", role="ASHA", is_active=True)
            phc_user = User(username="phc_demo", hashed_password=get_password_hash("demo123"), full_name="Dr. Rajesh Kumar (PHC Medical Officer)", role="PHC_STAFF", phc_id=phc1.id, is_active=True)
            admin_user = User(username="admin_demo", hashed_password=get_password_hash("demo123"), full_name="Admin Director", role="ADMIN", is_active=True)
            
            db.add(asha_user)
            db.add(phc_user)
            db.add(admin_user)
            db.flush()

            # 3. Create Sample Patients with various risk profiles
            demo_patients_data = [
                {
                    "name": "Sunita Devi", "age": 28, "gender": "Female", "village": "Rampur", "is_pregnant": True, "gest_weeks": 24,
                    "phone": "9811122233", "vitals": {"systolic_bp": 118, "diastolic_bp": 76, "heart_rate": 78, "respiratory_rate": 16, "temperature_c": 36.8, "spo2": 98, "blood_glucose": 95, "weight_kg": 58, "height_cm": 158},
                    "symptoms": [{"symptom_name": "Fatigue", "severity": "Mild", "duration_days": 3}], "risk": "LOW", "conf": 0.94
                },
                {
                    "name": "Ramesh Chandra", "age": 52, "gender": "Male", "village": "Rampur", "is_pregnant": False,
                    "phone": "9822233344", "vitals": {"systolic_bp": 148, "diastolic_bp": 92, "heart_rate": 86, "respiratory_rate": 18, "temperature_c": 37.2, "spo2": 96, "blood_glucose": 145, "weight_kg": 74, "height_cm": 168},
                    "symptoms": [{"symptom_name": "Headache", "severity": "Moderate", "duration_days": 2}, {"symptom_name": "Dizziness", "severity": "Mild", "duration_days": 1}],
                    "mh": {"hypertension": True, "diabetes": True}, "risk": "MEDIUM", "conf": 0.88
                },
                {
                    "name": "Kamla Bai", "age": 64, "gender": "Female", "village": "Chandpur", "is_pregnant": False,
                    "phone": "9833344455", "vitals": {"systolic_bp": 165, "diastolic_bp": 102, "heart_rate": 108, "respiratory_rate": 24, "temperature_c": 38.5, "spo2": 91, "blood_glucose": 210, "weight_kg": 62, "height_cm": 152},
                    "symptoms": [{"symptom_name": "Chest Pain", "severity": "Severe", "duration_days": 1}, {"symptom_name": "Breathlessness", "severity": "Severe", "duration_days": 1}],
                    "mh": {"hypertension": True, "heart_disease": True}, "risk": "HIGH", "conf": 0.91, "referral": True
                },
                {
                    "name": "Vikram Singh", "age": 45, "gender": "Male", "village": "Rampur", "is_pregnant": False,
                    "phone": "9844455566", "vitals": {"systolic_bp": 85, "diastolic_bp": 55, "heart_rate": 128, "respiratory_rate": 28, "temperature_c": 39.8, "spo2": 86, "blood_glucose": 75, "weight_kg": 68, "height_cm": 172},
                    "symptoms": [{"symptom_name": "Unconsciousness", "severity": "Severe", "duration_days": 1}, {"symptom_name": "Fever", "severity": "Severe", "duration_days": 4}],
                    "mh": {"asthma": True}, "risk": "CRITICAL", "conf": 0.96, "referral": True
                },
                {
                    "name": "Geeta Patel", "age": 32, "gender": "Female", "village": "Rampur", "is_pregnant": False,
                    "phone": "9855566677", "vitals": {"systolic_bp": 120, "diastolic_bp": 80, "heart_rate": 72, "respiratory_rate": 15, "temperature_c": 36.6, "spo2": 99, "blood_glucose": 90, "weight_kg": 55, "height_cm": 160},
                    "symptoms": [{"symptom_name": "Cold", "severity": "Mild", "duration_days": 2}], "risk": "LOW", "conf": 0.98
                },
                {
                    "name": "Mohan Lal", "age": 58, "gender": "Male", "village": "Chandpur", "is_pregnant": False,
                    "phone": "9866677788", "vitals": {"systolic_bp": 138, "diastolic_bp": 88, "heart_rate": 82, "respiratory_rate": 19, "temperature_c": 38.1, "spo2": 95, "blood_glucose": 130, "weight_kg": 70, "height_cm": 165},
                    "symptoms": [{"symptom_name": "Fever", "severity": "Moderate", "duration_days": 3}, {"symptom_name": "Cough", "severity": "Moderate", "duration_days": 3}], "risk": "MEDIUM", "conf": 0.84
                },
                {
                    "name": "Radha Bai", "age": 22, "gender": "Female", "village": "Rampur", "is_pregnant": True, "gest_weeks": 32,
                    "phone": "9877788899", "vitals": {"systolic_bp": 152, "diastolic_bp": 98, "heart_rate": 96, "respiratory_rate": 22, "temperature_c": 37.0, "spo2": 94, "blood_glucose": 105, "weight_kg": 64, "height_cm": 155},
                    "symptoms": [{"symptom_name": "Swelling", "severity": "Severe", "duration_days": 2}, {"symptom_name": "Headache", "severity": "Severe", "duration_days": 1}], "risk": "HIGH", "conf": 0.90, "referral": True
                },
                {
                    "name": "Suresh Kumar", "age": 60, "gender": "Male", "village": "Chandpur", "is_pregnant": False,
                    "phone": "9888899900", "vitals": {"systolic_bp": 170, "diastolic_bp": 105, "heart_rate": 115, "respiratory_rate": 26, "temperature_c": 37.4, "spo2": 89, "blood_glucose": 260, "weight_kg": 78, "height_cm": 170},
                    "symptoms": [{"symptom_name": "Chest Pain", "severity": "Severe", "duration_days": 1}, {"symptom_name": "Breathlessness", "severity": "Severe", "duration_days": 1}],
                    "mh": {"diabetes": True, "hypertension": True, "heart_disease": True}, "risk": "CRITICAL", "conf": 0.97, "referral": True
                },
                {
                    "name": "Pooja Verma", "age": 27, "gender": "Female", "village": "Rampur", "is_pregnant": False,
                    "phone": "9899900011", "vitals": {"systolic_bp": 115, "diastolic_bp": 75, "heart_rate": 74, "respiratory_rate": 16, "temperature_c": 36.7, "spo2": 99, "blood_glucose": 88, "weight_kg": 52, "height_cm": 162},
                    "symptoms": [{"symptom_name": "Fatigue", "severity": "Mild", "duration_days": 1}], "risk": "LOW", "conf": 0.96
                },
                {
                    "name": "Dinesh Sharma", "age": 49, "gender": "Male", "village": "Rampur", "is_pregnant": False,
                    "phone": "9800011122", "vitals": {"systolic_bp": 142, "diastolic_bp": 90, "heart_rate": 88, "respiratory_rate": 20, "temperature_c": 38.3, "spo2": 94, "blood_glucose": 160, "weight_kg": 80, "height_cm": 174},
                    "symptoms": [{"symptom_name": "Fever", "severity": "Moderate", "duration_days": 4}, {"symptom_name": "Vomiting", "severity": "Moderate", "duration_days": 2}],
                    "mh": {"hypertension": True}, "risk": "HIGH", "conf": 0.87, "referral": True
                }
            ]

            for idx, pd_item in enumerate(demo_patients_data):
                pid = f"PAT-2026-{1000+idx}"
                pat = Patient(
                    id=pid,
                    asha_worker_id=asha_user.id,
                    full_name=pd_item["name"],
                    age=pd_item["age"],
                    gender=pd_item["gender"],
                    phone_number=pd_item["phone"],
                    village=pd_item["village"],
                    district="Sehore",
                    state="Madhya Pradesh",
                    is_pregnant=pd_item.get("is_pregnant", False),
                    gestational_age_weeks=pd_item.get("gest_weeks")
                )
                db.add(pat)
                db.flush()

                # Medical History
                mh_info = pd_item.get("mh", {})
                mh = MedicalHistory(
                    patient_id=pid,
                    diabetes=mh_info.get("diabetes", False),
                    hypertension=mh_info.get("hypertension", False),
                    heart_disease=mh_info.get("heart_disease", False),
                    asthma=mh_info.get("asthma", False),
                    kidney_disease=mh_info.get("kidney_disease", False)
                )
                db.add(mh)

                # Health Record & Vitals
                rec_id = f"REC-2026-{2000+idx}"
                hr = HealthRecord(id=rec_id, patient_id=pid, asha_worker_id=asha_user.id)
                db.add(hr)

                v = pd_item["vitals"]
                bmi = round(v["weight_kg"] / ((v["height_cm"] / 100) ** 2), 1)
                vs = VitalSigns(
                    health_record_id=rec_id,
                    systolic_bp=v["systolic_bp"],
                    diastolic_bp=v["diastolic_bp"],
                    heart_rate=v["heart_rate"],
                    respiratory_rate=v["respiratory_rate"],
                    temperature_c=v["temperature_c"],
                    spo2=v["spo2"],
                    blood_glucose=v["blood_glucose"],
                    weight_kg=v["weight_kg"],
                    height_cm=v["height_cm"],
                    bmi=bmi
                )
                db.add(vs)

                # Symptoms
                for s in pd_item["symptoms"]:
                    db.add(Symptom(
                        health_record_id=rec_id,
                        symptom_name=s["symptom_name"],
                        severity=s["severity"],
                        duration_days=s["duration_days"]
                    ))

                # Risk Assessment
                asm_id = f"ASM-2026-{3000+idx}"
                r_factors = []
                if v["spo2"] < 95: r_factors.append(f"Low Oxygen Saturation ({v['spo2']}%)")
                if v["systolic_bp"] >= 140: r_factors.append(f"High Blood Pressure ({v['systolic_bp']}/{v['diastolic_bp']} mmHg)")
                if v["temperature_c"] >= 38.0: r_factors.append(f"Fever ({v['temperature_c']}°C)")
                if not r_factors: r_factors.append("Normal vitals")

                ra = RiskAssessment(
                    id=asm_id,
                    health_record_id=rec_id,
                    risk_level=pd_item["risk"],
                    confidence_score=pd_item["conf"],
                    risk_factors_json=json.dumps(r_factors),
                    assessment_source="ONLINE_ML"
                )
                db.add(ra)

                # Recommendation
                title, actions, urgency = generate_recommendation_content(pd_item["risk"], pd_item["symptoms"], v)
                rec = Recommendation(
                    risk_assessment_id=asm_id,
                    title=title,
                    actions_json=json.dumps(actions),
                    urgency_note=urgency
                )
                db.add(rec)

                # Referral if HIGH or CRITICAL
                if pd_item.get("referral"):
                    ref_id = f"REF-2026-{4000+idx}"
                    ref = Referral(
                        id=ref_id,
                        patient_id=pid,
                        health_record_id=rec_id,
                        risk_assessment_id=asm_id,
                        asha_worker_id=asha_user.id,
                        phc_id=phc1.id,
                        status="PENDING" if idx % 2 == 0 else "ACCEPTED",
                        reason=f"Patient categorized as {pd_item['risk']} risk with factors: {', '.join(r_factors)}"
                    )
                    db.add(ref)

            db.commit()
            print("Demo database records successfully seeded!")

    except Exception as e:
        print(f"Error seeding demo data: {e}")
        db.rollback()
    finally:
        db.close()

seed_demo_data()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "ASHA Rural Health Diagnostic & Triage System",
        "version": "2.0.0",
        "disclaimer": "AI-assisted triage decision support only. Does not replace professional medical evaluation."
    }
