# ASHA – Offline AI-Based Rural Health Diagnostic & Triage System

A complete full-stack decision-support and emergency triage application built for ASHA (Accredited Social Health Activists) and community health workers operating in rural areas with low or intermittent internet connectivity.

---

## 🌟 Key Features

1. **Role-Based Authentication & Workflows**:
   - **ASHA Worker**: Patient registration, vital signs intake, symptom collection, AI risk assessment, referral creation, multilingual voice input, speech-to-text voice assistant bot, offline synchronization.
   - **PHC / Hospital Staff**: Referral management dashboard, patient risk level inspection, referral acceptance/treatment status tracking (`ACCEPTED`, `IN_TREATMENT`, `COMPLETED`, `REJECTED`), doctor clinical remarks.
   - **Administrator**: Comprehensive stats dashboard, user management (registering ASHA workers & PHC staff), PHC management, age group & risk level analytics.

2. **Offline-First PWA Architecture**:
   - Built as a Progressive Web App (PWA) with Service Worker caching and IndexedDB offline storage.
   - Operates 100% offline without internet for core operations: patient intake, vitals range validation, client-side JS clinical triage engine, recommendation generation, and local referral creation.
   - Automatic background synchronization via an idempotent sync queue whenever network connection is restored.

3. **Machine Learning Triage Pipeline**:
   - **Random Forest Classifier** trained on clinical dataset (`triagegeist.zip` merged with `archive (1).zip` and `Symptom-severity.csv` containing 80,000+ patient records).
   - Classifies risk levels into `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.
   - Generates confidence scores and extracts contributing clinical risk factors (e.g., low SpO2, severe hypertension, acute chest pain, fever).
   - Client-side fallback triage engine executing modified NEWS2 score rules when backend is unreachable.

4. **Multilingual & Interactive Voice Assistant Bot**:
   - Supports **English**, **Hindi (हिंदी)**, and **Tamil (தமிழ்)** with dynamic UI translation files (`en.json`, `hi.json`, `ta.json`).
   - Web Speech API integration for hands-free voice input on form fields.
   - **ASHA Voice Assistant Bot**: Interactive floating Speech-to-Text (STT) and Text-to-Speech (TTS) widget providing voice-guided symptom intake and triage advice.

5. **Medical Safety & Disclaimers**:
   - Prominently displays clear medical decision-support disclaimers: *"AI-assisted triage decision support only. Does not replace professional medical evaluation."*
   - Automatic emergency alerts for critical clinical indicators (unconsciousness, seizure, severe chest pain, severe hypoxemia).

---

## 🔑 Demo Credentials

Development/Demo accounts pre-seeded in database:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **ASHA Worker** | `asha_demo` | `demo123` | Patient Registration, Vitals Intake, AI Risk Triage, Referrals, Offline Sync |
| **PHC Staff** | `phc_demo` | `demo123` | Hospital Referral Portal, Patient Review, Treatment Status Updates |
| **Administrator** | `admin_demo` | `demo123` | Admin Dashboard, System Analytics, User Management |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons, React Router DOM, IndexedDB (`idb`), Service Worker (PWA), Web Speech API.
- **Backend**: Python 3.13 / FastAPI, SQLAlchemy ORM, Pydantic v2, Pytest, JWT Auth (python-jose), Passlib (bcrypt).
- **Database**: SQLite (local default `asha_health.db`) / PostgreSQL compatible.
- **Machine Learning**: pandas, scikit-learn (Random Forest Classifier), numpy, joblib.

---

## 📁 Dataset & ML Training Instructions

Dataset files located in root directory:
- `triagegeist.zip`: 80,000 patient clinical records (vitals, chief complaints, medical history, triage acuity).
- `archive (1).zip`: Disease, symptom, precaution, and risk factor knowledge bases.
- `Symptom-severity.csv`: Symptom severity weights.

### 1. Extract & Prepare Dataset
Run the preparation script to merge datasets into standardized `backend/data/triage_dataset.csv`:
```bash
python backend/ml/prepare_dataset.py
```

### 2. Train Random Forest Model
Train the Random Forest model and generate evaluation metrics (`Accuracy`, `Precision`, `Recall`, `F1 Score`, `Confusion Matrix`):
```bash
python backend/ml/train_model.py
```
Model files saved to `backend/ml/triage_model.joblib` and `backend/ml/model_meta.json`.

---

## 🚀 Running the Application

### Step 1: Run Backend Server
```bash
# From workspace root
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000`. Interactive Swagger API docs available at `http://127.0.0.1:8000/docs`.

### Step 2: Run Frontend PWA
```bash
# From frontend directory
cd frontend
npm run dev
```
Frontend app will be available at `http://localhost:3000`.

---

## 🧪 Running Automated Tests

Run backend pytest suite verifying authentication, patient registration, vitals validation, ML prediction, referral creation, and offline sync endpoints:
```bash
pytest backend/tests/ -v
```

---

## 📑 API Endpoints Summary

- `POST /api/auth/login` - User authentication & JWT token issuance
- `GET /api/patients` - List registered patients
- `POST /api/patients` - Register new patient
- `GET /api/patients/{id}/history` - Retrieve patient clinical history timeline
- `POST /api/assessment` - Run AI risk assessment & generate recommendations
- `POST /api/ml/predict` - Stateless ML prediction testing
- `POST /api/referrals` - Create PHC patient referral
- `GET /api/referrals` - List referrals
- `PUT /api/referrals/{id}` - Update referral status & remarks (PHC staff)
- `POST /api/sync` - Synchronize offline IndexedDB queue records
- `GET /api/dashboard/stats` - ASHA worker metrics
- `GET /api/admin/stats` - Admin analytics
