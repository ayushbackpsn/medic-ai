import pytest
from fastapi.testclient import TestClient
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_demo_login():
    response = client.post("/api/auth/login", json={"username": "asha_demo", "password": "demo123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ASHA"

def test_ml_stateless_prediction():
    payload = {
        "patient_data": {"age": 60, "gender": "Male", "is_pregnant": False},
        "vitals": {
            "systolic_bp": 175,
            "diastolic_bp": 110,
            "heart_rate": 115,
            "respiratory_rate": 26,
            "temperature_c": 38.5,
            "spo2": 88,
            "blood_glucose": 210,
            "weight_kg": 75,
            "height_cm": 170
        },
        "medical_history": {"hypertension": True, "diabetes": True},
        "symptoms": [{"symptom_name": "Chest Pain", "severity": "Severe", "duration_days": 1}]
    }
    response = client.post("/api/ml/predict", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["risk_level"] in ["HIGH", "CRITICAL"]
    assert len(res["risk_factors"]) > 0

def test_authenticated_patient_flow():
    # Login as ASHA
    login_res = client.post("/api/auth/login", json={"username": "asha_demo", "password": "demo123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Register Patient
    p_data = {
        "full_name": "Test Patient",
        "age": 40,
        "gender": "Female",
        "phone_number": "9998887776",
        "village": "Rampur",
        "district": "Sehore",
        "state": "Madhya Pradesh",
        "medical_history": {"diabetes": True}
    }
    p_res = client.post("/api/patients", json=p_data, headers=headers)
    assert p_res.status_code == 200
    patient = p_res.json()
    assert patient["full_name"] == "Test Patient"

    # Run Assessment
    asm_data = {
        "patient_id": patient["id"],
        "vitals": {
            "systolic_bp": 130,
            "diastolic_bp": 85,
            "heart_rate": 78,
            "respiratory_rate": 18,
            "temperature_c": 37.2,
            "spo2": 97,
            "blood_glucose": 110,
            "weight_kg": 60,
            "height_cm": 160
        },
        "symptoms": [{"symptom_name": "Fever", "severity": "Mild", "duration_days": 2}]
    }
    asm_res = client.post("/api/assessment", json=asm_data, headers=headers)
    assert asm_res.status_code == 200
    asm = asm_res.json()
    assert asm["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    # Create Referral
    ref_data = {
        "patient_id": patient["id"],
        "health_record_id": asm["health_record_id"],
        "risk_assessment_id": asm["id"],
        "phc_id": 1,
        "reason": "Test high risk referral"
    }
    ref_res = client.post("/api/referrals", json=ref_data, headers=headers)
    assert ref_res.status_code == 200
    ref = ref_res.json()
    assert ref["status"] == "PENDING"
