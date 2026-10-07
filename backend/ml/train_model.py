import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix

FEATURE_COLS = [
    'age', 'pregnancy_status',
    'systolic_bp', 'diastolic_bp', 'heart_rate', 'respiratory_rate',
    'temperature', 'spo2', 'blood_glucose', 'weight', 'height', 'bmi',
    'diabetes', 'hypertension', 'heart_disease', 'asthma', 'kidney_disease',
    'fever', 'cough', 'headache', 'chest_pain', 'breathlessness',
    'vomiting', 'diarrhea', 'dizziness', 'bleeding', 'seizure',
    'unconsciousness', 'severe_pain'
]

TARGET_COL = 'risk_level'


def generate_synthetic_dataset(n=5000):
    """Generate labeled synthetic triage data for Render deployment when CSV is unavailable."""
    print("[DEMO DATA] Generating synthetic training dataset (no CSV found)...")
    np.random.seed(42)
    rows = []
    for _ in range(n):
        severity = np.random.choice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                                    p=[0.35, 0.30, 0.22, 0.13])
        age = int(np.random.randint(1, 85))
        preg = int(np.random.choice([0, 1], p=[0.85, 0.15]))

        if severity == 'LOW':
            sbp = int(np.random.randint(100, 130))
            dbp = int(np.random.randint(60, 85))
            hr = int(np.random.randint(60, 90))
            rr = int(np.random.randint(12, 18))
            temp = round(np.random.uniform(36.0, 37.5), 1)
            spo2 = int(np.random.randint(96, 100))
            bg = int(np.random.randint(70, 110))
        elif severity == 'MEDIUM':
            sbp = int(np.random.randint(130, 150))
            dbp = int(np.random.randint(85, 95))
            hr = int(np.random.randint(85, 100))
            rr = int(np.random.randint(18, 22))
            temp = round(np.random.uniform(37.5, 38.5), 1)
            spo2 = int(np.random.randint(93, 97))
            bg = int(np.random.randint(110, 180))
        elif severity == 'HIGH':
            sbp = int(np.random.randint(150, 175))
            dbp = int(np.random.randint(95, 110))
            hr = int(np.random.randint(100, 120))
            rr = int(np.random.randint(22, 28))
            temp = round(np.random.uniform(38.5, 40.0), 1)
            spo2 = int(np.random.randint(88, 94))
            bg = int(np.random.randint(180, 280))
        else:  # CRITICAL
            sbp = int(np.random.randint(60, 90))
            dbp = int(np.random.randint(40, 60))
            hr = int(np.random.randint(120, 150))
            rr = int(np.random.randint(28, 40))
            temp = round(np.random.uniform(40.0, 42.0), 1)
            spo2 = int(np.random.randint(75, 89))
            bg = int(np.random.randint(30, 60))

        wt = int(np.random.randint(40, 100))
        ht = int(np.random.randint(140, 185))
        bmi = round(wt / ((ht / 100) ** 2), 1)

        sympt = {s: 0 for s in ['fever', 'cough', 'headache', 'chest_pain', 'breathlessness',
                                  'vomiting', 'diarrhea', 'dizziness', 'bleeding', 'seizure',
                                  'unconsciousness', 'severe_pain']}
        if severity in ('HIGH', 'CRITICAL'):
            for k in np.random.choice(list(sympt.keys()), size=np.random.randint(3, 7), replace=False):
                sympt[k] = 1
        elif severity == 'MEDIUM':
            for k in np.random.choice(list(sympt.keys()), size=np.random.randint(1, 4), replace=False):
                sympt[k] = 1

        rows.append({
            'age': age, 'pregnancy_status': preg,
            'systolic_bp': sbp, 'diastolic_bp': dbp,
            'heart_rate': hr, 'respiratory_rate': rr,
            'temperature': temp, 'spo2': spo2, 'blood_glucose': bg,
            'weight': wt, 'height': ht, 'bmi': bmi,
            'diabetes': int(np.random.random() < 0.15),
            'hypertension': int(np.random.random() < 0.20),
            'heart_disease': int(np.random.random() < 0.08),
            'asthma': int(np.random.random() < 0.10),
            'kidney_disease': int(np.random.random() < 0.06),
            **sympt,
            'risk_level': severity
        })

    df = pd.DataFrame(rows)
    print(f"[DEMO DATA] Synthetic dataset generated: {len(df)} rows, distribution:\n{df['risk_level'].value_counts().to_dict()}")
    return df


def train(data_path=None, model_dir=None):
    # Resolve paths relative to this file so it works from any working directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)

    if model_dir is None:
        model_dir = script_dir
    if data_path is None:
        data_path = os.path.join(backend_dir, "data", "triage_dataset.csv")

    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "triage_model.joblib")

    # Skip training if model already exists (e.g. committed to git)
    if os.path.exists(model_path):
        print(f"Trained model already exists at {model_path}. Skipping training.")
        return

    # Load dataset or generate synthetic fallback
    if os.path.exists(data_path):
        print(f"Loading data from {data_path}...")
        df = pd.read_csv(data_path)
        # Fill missing values
        for col in FEATURE_COLS:
            if col in df.columns:
                df[col] = df[col].fillna(
                    df[col].median() if df[col].dtype in ['float64', 'int64'] else 0
                )
        # Ensure all feature cols exist
        for col in FEATURE_COLS:
            if col not in df.columns:
                df[col] = 0
    else:
        print(f"[WARNING] Dataset not found at {data_path}. Using synthetic DEMO DATA.")
        df = generate_synthetic_dataset(n=8000)

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training Random Forest model on {len(X_train)} samples...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
    cm = confusion_matrix(y_test, y_pred, labels=['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).tolist()
    report = classification_report(y_test, y_pred, output_dict=True)

    print(f"Model Metrics:\n  Accuracy:  {acc:.4f}\n  Precision: {prec:.4f}\n  Recall:    {rec:.4f}\n  F1 Score:  {f1:.4f}")

    joblib.dump(clf, model_path)

    meta_path = os.path.join(model_dir, "model_meta.json")
    meta = {
        "feature_cols": FEATURE_COLS,
        "metrics": {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "confusion_matrix": cm,
            "classification_report": report
        }
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Model saved to {model_path}")
    print(f"Metadata saved to {meta_path}")


if __name__ == "__main__":
    train()
