from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, autoincrement=True, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False) # ASHA, PHC_STAFF, ADMIN
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    phc = relationship("PHC", back_populates="staff")
    patients = relationship("Patient", back_populates="asha_worker")
    referrals = relationship("Referral", back_populates="asha_worker")

class PHC(Base):
    __tablename__ = "phcs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True)
    village = Column(String)
    district = Column(String)
    state = Column(String)
    contact_number = Column(String)

    staff = relationship("User", back_populates="phc")
    referrals = relationship("Referral", back_populates="phc")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True) # PAT-YYYY-XXXX or client generated ID
    asha_worker_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    phone_number = Column(String)
    address = Column(String)
    village = Column(String)
    district = Column(String)
    state = Column(String)
    is_pregnant = Column(Boolean, default=False)
    gestational_age_weeks = Column(Integer, nullable=True)
    emergency_contact = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    asha_worker = relationship("User", back_populates="patients")
    medical_history = relationship("MedicalHistory", back_populates="patient", uselist=False)
    health_records = relationship("HealthRecord", back_populates="patient")
    referrals = relationship("Referral", back_populates="patient")

class MedicalHistory(Base):
    __tablename__ = "medical_histories"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    diabetes = Column(Boolean, default=False)
    hypertension = Column(Boolean, default=False)
    heart_disease = Column(Boolean, default=False)
    asthma = Column(Boolean, default=False)
    kidney_disease = Column(Boolean, default=False)
    previous_hospitalization = Column(Boolean, default=False)
    other_conditions = Column(String, nullable=True)
    current_medications = Column(String, nullable=True)
    allergies = Column(String, nullable=True)

    patient = relationship("Patient", back_populates="medical_history")

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    asha_worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="health_records")
    vitals = relationship("VitalSigns", back_populates="health_record", uselist=False)
    symptoms = relationship("Symptom", back_populates="health_record")
    risk_assessment = relationship("RiskAssessment", back_populates="health_record", uselist=False)

class VitalSigns(Base):
    __tablename__ = "vital_signs"

    id = Column(Integer, primary_key=True, index=True)
    health_record_id = Column(String, ForeignKey("health_records.id"), nullable=False)
    systolic_bp = Column(Float, nullable=False)
    diastolic_bp = Column(Float, nullable=False)
    heart_rate = Column(Float, nullable=False)
    respiratory_rate = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    spo2 = Column(Float, nullable=False)
    blood_glucose = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)

    health_record = relationship("HealthRecord", back_populates="vitals")

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Integer, primary_key=True, index=True)
    health_record_id = Column(String, ForeignKey("health_records.id"), nullable=False)
    symptom_name = Column(String, nullable=False)
    severity = Column(String, default="Mild") # Mild, Moderate, Severe
    duration_days = Column(Integer, default=1)

    health_record = relationship("HealthRecord", back_populates="symptoms")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String, primary_key=True, index=True)
    health_record_id = Column(String, ForeignKey("health_records.id"), nullable=False)
    risk_level = Column(String, nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    confidence_score = Column(Float, nullable=False)
    risk_factors_json = Column(Text, nullable=False) # JSON array of strings
    assessment_source = Column(String, default="ONLINE_ML") # ONLINE_ML, OFFLINE_FALLBACK
    created_at = Column(DateTime, default=datetime.utcnow)

    health_record = relationship("HealthRecord", back_populates="risk_assessment")
    recommendation = relationship("Recommendation", back_populates="risk_assessment", uselist=False)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    risk_assessment_id = Column(String, ForeignKey("risk_assessments.id"), nullable=False)
    title = Column(String, nullable=False)
    actions_json = Column(Text, nullable=False) # JSON array
    urgency_note = Column(String, nullable=True)

    risk_assessment = relationship("RiskAssessment", back_populates="recommendation")

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    health_record_id = Column(String, ForeignKey("health_records.id"), nullable=False)
    risk_assessment_id = Column(String, ForeignKey("risk_assessments.id"), nullable=False)
    asha_worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, IN_TREATMENT, COMPLETED, REJECTED
    reason = Column(Text, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="referrals")
    asha_worker = relationship("User", back_populates="referrals")
    phc = relationship("PHC", back_populates="referrals")

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    asha_worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    records_synced = Column(Integer, default=0)
    status = Column(String, default="SUCCESS")
    synced_at = Column(DateTime, default=datetime.utcnow)
