from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: str
    user_id: int

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str # ASHA, PHC_STAFF, ADMIN
    phc_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    phc_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True

# Medical History Schema
class MedicalHistoryBase(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    asthma: bool = False
    kidney_disease: bool = False
    previous_hospitalization: bool = False
    other_conditions: Optional[str] = ""
    current_medications: Optional[str] = ""
    allergies: Optional[str] = ""

class MedicalHistoryOut(MedicalHistoryBase):
    id: int
    patient_id: str
    class Config:
        from_attributes = True

# Patient Schemas
class PatientCreate(BaseModel):
    id: Optional[str] = None
    full_name: str
    age: int = Field(..., ge=0, le=120)
    gender: str
    phone_number: Optional[str] = ""
    address: Optional[str] = ""
    village: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    is_pregnant: bool = False
    gestational_age_weeks: Optional[int] = None
    emergency_contact: Optional[str] = ""
    medical_history: Optional[MedicalHistoryBase] = None

class PatientOut(BaseModel):
    id: str
    asha_worker_id: Optional[int] = None
    full_name: str
    age: int
    gender: str
    phone_number: Optional[str] = ""
    address: Optional[str] = ""
    village: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = ""
    is_pregnant: bool = False
    gestational_age_weeks: Optional[int] = None
    emergency_contact: Optional[str] = ""
    created_at: datetime
    medical_history: Optional[MedicalHistoryOut] = None

    class Config:
        from_attributes = True

# Vitals Schema
class VitalSignsCreate(BaseModel):
    systolic_bp: float = Field(..., ge=40, le=300)
    diastolic_bp: float = Field(..., ge=20, le=200)
    heart_rate: float = Field(..., ge=30, le=250)
    respiratory_rate: float = Field(..., ge=5, le=80)
    temperature_c: float = Field(..., ge=30, le=45)
    spo2: float = Field(..., ge=0, le=100)
    blood_glucose: float = Field(..., ge=20, le=800)
    weight_kg: float = Field(..., ge=1, le=300)
    height_cm: float = Field(..., ge=30, le=250)

class VitalSignsOut(VitalSignsCreate):
    id: int
    health_record_id: str
    bmi: float
    class Config:
        from_attributes = True

# Symptom Schema
class SymptomItem(BaseModel):
    symptom_name: str
    severity: str = "Mild" # Mild, Moderate, Severe
    duration_days: int = 1

class SymptomOut(SymptomItem):
    id: int
    health_record_id: str
    class Config:
        from_attributes = True

# Assessment Schemas
class AssessmentRequest(BaseModel):
    patient_id: str
    vitals: VitalSignsCreate
    symptoms: List[SymptomItem]
    medical_history: Optional[MedicalHistoryBase] = None

class AssessmentOut(BaseModel):
    id: str
    health_record_id: str
    patient_id: str
    patient_name: str
    risk_level: str
    confidence_score: float
    risk_factors: List[str]
    recommendation_title: str
    recommendations: List[str]
    urgency_note: str
    created_at: datetime
    assessment_source: str

# Referral Schemas
class ReferralCreate(BaseModel):
    patient_id: str
    health_record_id: str
    risk_assessment_id: str
    phc_id: int
    reason: str

class ReferralUpdateStatus(BaseModel):
    status: str # ACCEPTED, IN_TREATMENT, COMPLETED, REJECTED
    remarks: Optional[str] = ""

class ReferralOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_age: int
    patient_gender: str
    health_record_id: str
    risk_assessment_id: str
    risk_level: str
    reason: str
    remarks: Optional[str] = ""
    status: str
    asha_worker_name: str
    phc_id: int
    phc_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Sync Queue Record Schema
class SyncQueueItem(BaseModel):
    local_id: str
    type: str # PATIENT, ASSESSMENT, REFERRAL
    payload: dict
    created_at: str

class SyncBatchRequest(BaseModel):
    items: List[SyncQueueItem]

class PredictRequest(BaseModel):
    patient_data: dict
    vitals: dict
    medical_history: Optional[dict] = {}
    symptoms: Optional[List[dict]] = []

