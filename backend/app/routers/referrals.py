from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.database.database import get_db
from app.models.models import User, Patient, RiskAssessment, Referral, PHC
from app.schemas.schemas import ReferralCreate, ReferralUpdateStatus, ReferralOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])

@router.post("", response_model=ReferralOut)
def create_referral(
    ref_in: ReferralCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == ref_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    risk_obj = db.query(RiskAssessment).filter(RiskAssessment.id == ref_in.risk_assessment_id).first()
    if not risk_obj:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    phc = db.query(PHC).filter(PHC.id == ref_in.phc_id).first()
    if not phc:
        # Fall back to first available PHC if requested id not found
        phc = db.query(PHC).first()
        if not phc:
            phc = PHC(name="Central Rural PHC", code="PHC-001", district="District Hospital", state="State")
            db.add(phc)
            db.flush()

    referral_id = f"REF-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    referral = Referral(
        id=referral_id,
        patient_id=patient.id,
        health_record_id=ref_in.health_record_id,
        risk_assessment_id=risk_obj.id,
        asha_worker_id=current_user.id,
        phc_id=phc.id,
        status="PENDING",
        reason=ref_in.reason
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    
    return ReferralOut(
        id=referral.id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        patient_age=patient.age,
        patient_gender=patient.gender,
        health_record_id=ref_in.health_record_id,
        risk_assessment_id=risk_obj.id,
        risk_level=risk_obj.risk_level,
        reason=referral.reason,
        remarks=referral.remarks or "",
        status=referral.status,
        asha_worker_name=current_user.full_name,
        phc_id=phc.id,
        phc_name=phc.name,
        created_at=referral.created_at,
        updated_at=referral.updated_at
    )

@router.get("", response_model=List[ReferralOut])
def get_referrals(
    status_filter: Optional[str] = Query(None),
    phc_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Referral)
    
    if current_user.role == "ASHA":
        query = query.filter(Referral.asha_worker_id == current_user.id)
    elif current_user.role == "PHC_STAFF" and current_user.phc_id:
        query = query.filter(Referral.phc_id == current_user.phc_id)
        
    if status_filter:
        query = query.filter(Referral.status == status_filter.upper())
    if phc_id:
        query = query.filter(Referral.phc_id == phc_id)
        
    referrals = query.order_by(Referral.created_at.desc()).all()
    
    result = []
    for r in referrals:
        patient = r.patient
        risk_obj = db.query(RiskAssessment).filter(RiskAssessment.id == r.risk_assessment_id).first()
        phc = r.phc
        asha = r.asha_worker
        
        result.append(ReferralOut(
            id=r.id,
            patient_id=patient.id if patient else r.patient_id,
            patient_name=patient.full_name if patient else "Unknown Patient",
            patient_age=patient.age if patient else 0,
            patient_gender=patient.gender if patient else "Unknown",
            health_record_id=r.health_record_id,
            risk_assessment_id=r.risk_assessment_id,
            risk_level=risk_obj.risk_level if risk_obj else "HIGH",
            reason=r.reason,
            remarks=r.remarks or "",
            status=r.status,
            asha_worker_name=asha.full_name if asha else "ASHA Worker",
            phc_id=r.phc_id,
            phc_name=phc.name if phc else "PHC Centre",
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return result

@router.get("/{referral_id}", response_model=ReferralOut)
def get_referral(referral_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Referral).filter(Referral.id == referral_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
        
    patient = r.patient
    risk_obj = db.query(RiskAssessment).filter(RiskAssessment.id == r.risk_assessment_id).first()
    phc = r.phc
    asha = r.asha_worker
    
    return ReferralOut(
        id=r.id,
        patient_id=patient.id if patient else r.patient_id,
        patient_name=patient.full_name if patient else "Unknown Patient",
        patient_age=patient.age if patient else 0,
        patient_gender=patient.gender if patient else "Unknown",
        health_record_id=r.health_record_id,
        risk_assessment_id=r.risk_assessment_id,
        risk_level=risk_obj.risk_level if risk_obj else "HIGH",
        reason=r.reason,
        remarks=r.remarks or "",
        status=r.status,
        asha_worker_name=asha.full_name if asha else "ASHA Worker",
        phc_id=r.phc_id,
        phc_name=phc.name if phc else "PHC Centre",
        created_at=r.created_at,
        updated_at=r.updated_at
    )

@router.put("/{referral_id}", response_model=ReferralOut)
def update_referral_status(
    referral_id: str,
    update_in: ReferralUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(Referral).filter(Referral.id == referral_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
        
    r.status = update_in.status.upper()
    if update_in.remarks:
        r.remarks = update_in.remarks
    r.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(r)
    
    patient = r.patient
    risk_obj = db.query(RiskAssessment).filter(RiskAssessment.id == r.risk_assessment_id).first()
    phc = r.phc
    asha = r.asha_worker
    
    return ReferralOut(
        id=r.id,
        patient_id=patient.id if patient else r.patient_id,
        patient_name=patient.full_name if patient else "Unknown Patient",
        patient_age=patient.age if patient else 0,
        patient_gender=patient.gender if patient else "Unknown",
        health_record_id=r.health_record_id,
        risk_assessment_id=r.risk_assessment_id,
        risk_level=risk_obj.risk_level if risk_obj else "HIGH",
        reason=r.reason,
        remarks=r.remarks or "",
        status=r.status,
        asha_worker_name=asha.full_name if asha else "ASHA Worker",
        phc_id=r.phc_id,
        phc_name=phc.name if phc else "PHC Centre",
        created_at=r.created_at,
        updated_at=r.updated_at
    )
