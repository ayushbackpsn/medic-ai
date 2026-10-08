import os
import zipfile
import io
import json
import pandas as pd
import numpy as np

def prepare_data(data_dir=None):
    script_dir = os.path.dirname(os.path.abspath(__file__)) # sw/backend/ml
    backend_dir = os.path.dirname(script_dir)               # sw/backend
    project_root = os.path.dirname(backend_dir)             # sw
    
    if data_dir is None:
        data_dir = os.path.join(backend_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    triagegeist_path = os.path.join(project_root, "triagegeist.zip")
    archive_path = os.path.join(project_root, "archive (1).zip")
    severity_path = os.path.join(project_root, "Symptom-severity.csv")
    
    print("Extracting and processing dataset files...")
    
    # 1. Process triagegeist.zip if present
    patients_df = pd.DataFrame()
    if os.path.exists(triagegeist_path):
        with zipfile.ZipFile(triagegeist_path, 'r') as z:
            # Read train.csv
            train_df = pd.read_csv(io.BytesIO(z.read('train.csv')), encoding='latin1')
            
            # Read patient_history.csv
            hx_df = pd.read_csv(io.BytesIO(z.read('patient_history.csv')), encoding='latin1')
            
            # Read chief_complaints.csv
            cc_df = pd.read_csv(io.BytesIO(z.read('chief_complaints.csv')), encoding='latin1')
            
            # Merge on patient_id
            merged = train_df.merge(hx_df, on='patient_id', how='left').merge(cc_df, on='patient_id', how='left')
            
            print(f"Merged triagegeist dataset shape: {merged.shape}")
            
            # Map columns to standardized schema
            # triage_acuity: 1 (Emergency/Critical), 2 (High), 3 (Medium), 4 (Medium-Low), 5 (Low)
            def map_acuity_to_risk(acuity):
                if acuity == 1:
                    return 'CRITICAL'
                elif acuity == 2:
                    return 'HIGH'
                elif acuity in [3, 4]:
                    return 'MEDIUM'
                else:
                    return 'LOW'
            
            merged['risk_level'] = merged['triage_acuity'].apply(map_acuity_to_risk)
            
            # Extract features
            patients_df = pd.DataFrame({
                'patient_id': merged['patient_id'],
                'age': merged['age'].fillna(35).astype(int),
                'gender': merged['sex'].fillna('Unknown'),
                'pregnancy_status': merged.get('hx_pregnant', 0).fillna(0).astype(int),
                'systolic_bp': merged['systolic_bp'].fillna(120),
                'diastolic_bp': merged['diastolic_bp'].fillna(80),
                'heart_rate': merged['heart_rate'].fillna(75),
                'respiratory_rate': merged['respiratory_rate'].fillna(16),
                'temperature': merged['temperature_c'].fillna(37.0),
                'spo2': merged['spo2'].fillna(98.0),
                'blood_glucose': np.random.normal(110, 20, len(merged)).clip(70, 300), # Realistic baseline if not in dataset
                'weight': merged['weight_kg'].fillna(65.0),
                'height': merged['height_cm'].fillna(165.0),
                'bmi': merged['bmi'].fillna(23.5),
                
                # Medical history flags
                'diabetes': (merged.get('hx_diabetes_type1', 0).fillna(0) | merged.get('hx_diabetes_type2', 0).fillna(0)).astype(int),
                'hypertension': merged.get('hx_hypertension', 0).fillna(0).astype(int),
                'heart_disease': (merged.get('hx_heart_failure', 0).fillna(0) | merged.get('hx_coronary_artery_disease', 0).fillna(0)).astype(int),
                'asthma': (merged.get('hx_asthma', 0).fillna(0) | merged.get('hx_copd', 0).fillna(0)).astype(int),
                'kidney_disease': merged.get('hx_ckd', 0).fillna(0).astype(int),
                
                # Symptoms flags based on chief complaints / clinical indicators
                'fever': (merged['temperature_c'] > 38.0).astype(int),
                'cough': merged['chief_complaint_raw'].astype(str).str.contains('cough', case=False, na=False).astype(int),
                'headache': merged['chief_complaint_raw'].astype(str).str.contains('headache', case=False, na=False).astype(int),
                'chest_pain': merged['chief_complaint_raw'].astype(str).str.contains('chest pain', case=False, na=False).astype(int),
                'breathlessness': ((merged['spo2'] < 94) | merged['chief_complaint_raw'].astype(str).str.contains('shortness of breath|breath', case=False, na=False)).astype(int),
                'vomiting': merged['chief_complaint_raw'].astype(str).str.contains('vomit|nausea', case=False, na=False).astype(int),
                'diarrhea': merged['chief_complaint_raw'].astype(str).str.contains('diarrhea', case=False, na=False).astype(int),
                'dizziness': merged['chief_complaint_raw'].astype(str).str.contains('dizzy|dizziness', case=False, na=False).astype(int),
                'bleeding': merged['chief_complaint_raw'].astype(str).str.contains('bleed|bleeding', case=False, na=False).astype(int),
                'seizure': (merged.get('hx_epilepsy', 0).fillna(0) | merged['chief_complaint_raw'].astype(str).str.contains('seizure', case=False, na=False)).astype(int),
                'unconsciousness': (merged['gcs_total'] < 14).astype(int),
                'severe_pain': (merged['pain_score'] >= 7).astype(int),
                
                'risk_level': merged['risk_level']
            })

    # Save standardized dataset
    out_csv = os.path.join(data_dir, "triage_dataset.csv")
    patients_df.to_csv(out_csv, index=False)
    print(f"Saved standardized dataset to {out_csv} with {len(patients_df)} rows.")

    # 2. Extract disease symptoms and recommendations knowledge base from archive (1).zip
    if os.path.exists(archive_path):
        with zipfile.ZipFile(archive_path, 'r') as z:
            if 'disease_symptoms.csv' in z.namelist():
                dis_sym = pd.read_csv(io.BytesIO(z.read('disease_symptoms.csv')), encoding='latin1')
                dis_sym.to_csv(os.path.join(data_dir, "symptom_disease.csv"), index=False)
            if 'disease_precaution.csv' in z.namelist():
                dis_prec = pd.read_csv(io.BytesIO(z.read('disease_precaution.csv')), encoding='latin1')
                dis_prec.to_csv(os.path.join(data_dir, "recommendations.csv"), index=False)
    
    print("Dataset preparation complete.")

if __name__ == "__main__":
    prepare_data()
