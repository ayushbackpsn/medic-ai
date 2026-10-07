from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date

from app.database.database import get_db
from app.models.models import User, Patient, HealthRecord, RiskAssessment, Referral, PHC
from app.schemas.schemas import UserCreate, UserOut
from app.routers.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/api", tags=["Dashboard & Admin"])

@router.get("/dashboard/stats")
def get_asha_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "ASHA":
        total_patients = db.query(Patient).filter(Patient.asha_worker_id == current_user.id).count()
        total_referrals = db.query(Referral).filter(Referral.asha_worker_id == current_user.id).count()
        pending_referrals = db.query(Referral).filter(Referral.asha_worker_id == current_user.id, Referral.status == "PENDING").count()
        
        # Assessments
        records = db.query(HealthRecord).filter(HealthRecord.asha_worker_id == current_user.id).all()
        record_ids = [r.id for r in records]
        
        high_risk = db.query(RiskAssessment).filter(RiskAssessment.health_record_id.in_(record_ids), RiskAssessment.risk_level == "HIGH").count() if record_ids else 0
        critical_risk = db.query(RiskAssessment).filter(RiskAssessment.health_record_id.in_(record_ids), RiskAssessment.risk_level == "CRITICAL").count() if record_ids else 0
        assessments_today = db.query(HealthRecord).filter(HealthRecord.asha_worker_id == current_user.id, func.date(HealthRecord.recorded_at) == date.today()).count()
        
    else:
        total_patients = db.query(Patient).count()
        total_referrals = db.query(Referral).count()
        pending_referrals = db.query(Referral).filter(Referral.status == "PENDING").count()
        high_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "HIGH").count()
        critical_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "CRITICAL").count()
        assessments_today = db.query(HealthRecord).filter(func.date(HealthRecord.recorded_at) == date.today()).count()
        
    return {
        "total_patients": total_patients,
        "assessments_today": assessments_today,
        "high_risk_patients": high_risk,
        "critical_patients": critical_risk,
        "total_referrals": total_referrals,
        "pending_referrals": pending_referrals
    }

@router.get("/admin/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin authorization required")
        
    total_patients = db.query(Patient).count()
    total_asha_workers = db.query(User).filter(User.role == "ASHA").count()
    total_phcs = db.query(PHC).count()
    total_assessments = db.query(RiskAssessment).count()
    
    # Risk Distribution
    risk_counts = db.query(RiskAssessment.risk_level, func.count(RiskAssessment.id)).group_by(RiskAssessment.risk_level).all()
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for level, count in risk_counts:
        if level in risk_dist:
            risk_dist[level] = count
            
    # Referral Distribution by Status
    ref_counts = db.query(Referral.status, func.count(Referral.id)).group_by(Referral.status).all()
    ref_dist = {"PENDING": 0, "ACCEPTED": 0, "IN_TREATMENT": 0, "COMPLETED": 0, "REJECTED": 0}
    for st, count in ref_counts:
        if st in ref_dist:
            ref_dist[st] = count

    # Patients by Age Group
    patients = db.query(Patient.age).all()
    age_dist = {"0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0}
    for (age,) in patients:
        if age <= 18: age_dist["0-18"] += 1
        elif age <= 35: age_dist["19-35"] += 1
        elif age <= 50: age_dist["36-50"] += 1
        elif age <= 65: age_dist["51-65"] += 1
        else: age_dist["65+"] += 1

    return {
        "total_patients": total_patients,
        "total_asha_workers": total_asha_workers,
        "total_phcs": total_phcs,
        "total_assessments": total_assessments,
        "risk_distribution": risk_dist,
        "referral_distribution": ref_dist,
        "age_distribution": age_dist
    }

@router.get("/admin/users", response_model=list[UserOut])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin authorization required")
    return db.query(User).all()

@router.post("/admin/users", response_model=UserOut)
def create_user(
    u: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin authorization required")
        
    existing = db.query(User).filter(User.username == u.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    user = User(
        username=u.username,
        hashed_password=get_password_hash(u.password),
        full_name=u.full_name,
        role=u.role.upper(),
        phc_id=u.phc_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
