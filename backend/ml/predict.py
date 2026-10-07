import os
import json
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "triage_model.joblib")
META_PATH = os.path.join(os.path.dirname(__file__), "model_meta.json")

def load_model():
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        try:
            clf = joblib.load(MODEL_PATH)
            with open(META_PATH, 'r') as f:
                meta = json.load(f)
            return clf, meta["feature_cols"]
        except Exception as e:
            print(f"Error loading model: {e}")
    return None, None

def assess_risk(patient_data: dict, vitals: dict, medical_history: dict, symptoms: list) -> dict:
    clf, feature_cols = load_model()
    
    # Extract feature dictionary
    symptom_set = {s.get("symptom_name", "").lower(): s.get("severity", "Mild") for s in symptoms}
    
    # Calculate BMI if missing
    weight = float(vitals.get("weight_kg") or vitals.get("weight") or 65.0)
    height_cm = float(vitals.get("height_cm") or vitals.get("height") or 165.0)
    bmi = float(vitals.get("bmi") or (weight / ((height_cm / 100) ** 2)))
    
    features = {
        'age': int(patient_data.get("age") or 35),
        'pregnancy_status': 1 if patient_data.get("is_pregnant") or patient_data.get("pregnancy_status") else 0,
        'systolic_bp': float(vitals.get("systolic_bp") or 120),
        'diastolic_bp': float(vitals.get("diastolic_bp") or 80),
        'heart_rate': float(vitals.get("heart_rate") or 75),
        'respiratory_rate': float(vitals.get("respiratory_rate") or 16),
        'temperature': float(vitals.get("temperature_c") or vitals.get("temperature") or 37.0),
        'spo2': float(vitals.get("spo2") or 98.0),
        'blood_glucose': float(vitals.get("blood_glucose") or 110.0),
        'weight': weight,
        'height': height_cm,
        'bmi': round(bmi, 1),
        
        'diabetes': 1 if medical_history.get("diabetes") else 0,
        'hypertension': 1 if medical_history.get("hypertension") else 0,
        'heart_disease': 1 if medical_history.get("heart_disease") else 0,
        'asthma': 1 if medical_history.get("asthma") else 0,
        'kidney_disease': 1 if medical_history.get("kidney_disease") else 0,
        
        'fever': 1 if "fever" in symptom_set or features_temp_high(vitals) else 0,
        'cough': 1 if "cough" in symptom_set else 0,
        'headache': 1 if "headache" in symptom_set else 0,
        'chest_pain': 1 if "chest pain" in symptom_set or "chest_pain" in symptom_set else 0,
        'breathlessness': 1 if "breathlessness" in symptom_set or features_spo2_low(vitals) else 0,
        'vomiting': 1 if "vomiting" in symptom_set else 0,
        'diarrhea': 1 if "diarrhea" in symptom_set else 0,
        'dizziness': 1 if "dizziness" in symptom_set else 0,
        'bleeding': 1 if "bleeding" in symptom_set else 0,
        'seizure': 1 if "seizure" in symptom_set else 0,
        'unconsciousness': 1 if "unconsciousness" in symptom_set else 0,
        'severe_pain': 1 if "severe pain" in symptom_set or "severe_pain" in symptom_set else 0,
    }
    
    risk_factors = []
    
    # Identify clinical risk factors
    if features['spo2'] < 92:
        risk_factors.append(f"Critically Low Oxygen Saturation ({features['spo2']}%)")
    elif features['spo2'] < 95:
        risk_factors.append(f"Low Oxygen Saturation ({features['spo2']}%)")
        
    if features['systolic_bp'] >= 160 or features['diastolic_bp'] >= 100:
        risk_factors.append(f"Severe Hypertension ({features['systolic_bp']}/{features['diastolic_bp']} mmHg)")
    elif features['systolic_bp'] >= 140 or features['diastolic_bp'] >= 90:
        risk_factors.append(f"High Blood Pressure ({features['systolic_bp']}/{features['diastolic_bp']} mmHg)")
    elif features['systolic_bp'] < 90:
        risk_factors.append(f"Hypotension / Low Blood Pressure ({features['systolic_bp']} mmHg)")

    if features['temperature'] >= 39.0:
        risk_factors.append(f"High Fever ({features['temperature']}°C)")
    elif features['temperature'] >= 38.0:
        risk_factors.append(f"Fever ({features['temperature']}°C)")

    if features['heart_rate'] > 120:
        risk_factors.append(f"Severe Tachycardia ({features['heart_rate']} bpm)")
    elif features['heart_rate'] > 100:
        risk_factors.append(f"Elevated Heart Rate ({features['heart_rate']} bpm)")

    if features['unconsciousness']:
        risk_factors.append("Altered Consciousness / Unconsciousness")
    if features['seizure']:
        risk_factors.append("Seizure activity present")
    if features['chest_pain']:
        risk_factors.append("Acute Chest Pain reported")
    if features['breathlessness']:
        risk_factors.append("Shortness of Breath / Breathlessness")
    if features['bleeding']:
        risk_factors.append("Active Bleeding reported")

    # ML Model Prediction
    if clf and feature_cols:
        x_vec = np.array([[features[col] for col in feature_cols]])
        prob = clf.predict_proba(x_vec)[0]
        classes = clf.classes_
        predicted_risk = str(clf.predict(x_vec)[0])
        conf_score = float(np.max(prob))
    else:
        # Clinical Rule Fallback Engine
        predicted_risk, conf_score = deterministic_fallback(features, risk_factors)

    # Emergency Rule Overrides
    if features['unconsciousness'] or features['seizure'] or (features['spo2'] < 88) or (features['systolic_bp'] > 180):
        predicted_risk = "CRITICAL"
        conf_score = max(conf_score, 0.95)
    elif (features['chest_pain'] and features['age'] > 40) or (features['spo2'] < 92) or (features['breathlessness'] and features['fever']):
        if predicted_risk in ["LOW", "MEDIUM"]:
            predicted_risk = "HIGH"
            conf_score = max(conf_score, 0.88)
            
    if not risk_factors:
        risk_factors.append("Standard vital signs within normal range")
        
    return {
        "risk_level": predicted_risk,
        "confidence_score": round(conf_score, 2),
        "risk_factors": risk_factors,
        "features_evaluated": features
    }

def features_temp_high(vitals):
    return float(vitals.get("temperature_c") or vitals.get("temperature") or 37.0) >= 38.0

def features_spo2_low(vitals):
    return float(vitals.get("spo2") or 98.0) < 95.0

def deterministic_fallback(features, risk_factors):
    score = 0
    if features['spo2'] < 92: score += 4
    elif features['spo2'] < 95: score += 2
    if features['systolic_bp'] >= 160 or features['diastolic_bp'] >= 100: score += 3
    elif features['systolic_bp'] >= 140: score += 1
    if features['unconsciousness']: score += 5
    if features['seizure']: score += 4
    if features['chest_pain']: score += 3
    if features['breathlessness']: score += 3
    if features['fever']: score += 1
    if features['diabetes'] or features['hypertension']: score += 1
    
    if score >= 6:
        return "CRITICAL", 0.92
    elif score >= 4:
        return "HIGH", 0.85
    elif score >= 2:
        return "MEDIUM", 0.78
    else:
        return "LOW", 0.90
