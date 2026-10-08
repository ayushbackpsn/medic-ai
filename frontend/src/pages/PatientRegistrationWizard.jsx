import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { createPatient, runRiskAssessment, fetchPatients } from '../services/api';
import { validateVitals } from '../utils/vitalsValidator';
import VoiceInputButton from '../components/VoiceInputButton';
import RiskBadge from '../components/RiskBadge';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Sparkles, Activity } from 'lucide-react';

export default function PatientRegistrationWizard() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [existingPatient, setExistingPatient] = useState(null);

  // Form State
  const [personal, setPersonal] = useState({
    full_name: '', age: 35, gender: 'Female', phone_number: '', address: '', village: 'Rampur', district: 'Sehore', state: 'Madhya Pradesh', is_pregnant: false, gestational_age_weeks: '', emergency_contact: ''
  });

  const [medicalHistory, setMedicalHistory] = useState({
    diabetes: false, hypertension: false, heart_disease: false, asthma: false, kidney_disease: false, previous_hospitalization: false, other_conditions: '', current_medications: '', allergies: ''
  });

  const [vitals, setVitals] = useState({
    systolic_bp: 120, diastolic_bp: 80, heart_rate: 75, respiratory_rate: 16, temperature_c: 37.0, spo2: 98, blood_glucose: 110, weight_kg: 65, height_cm: 165
  });

  const [vitalsErrors, setVitalsErrors] = useState({});

  const [symptoms, setSymptoms] = useState([
    { symptom_name: 'Fever', present: false, severity: 'Mild', duration_days: 1 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);

  const availableSymptomsList = [
    'Fever', 'Cough', 'Headache', 'Chest pain', 'Breathlessness', 'Vomiting', 'Diarrhea', 'Abdominal pain', 'Dizziness', 'Weakness', 'Seizure', 'Unconsciousness', 'Bleeding', 'Swelling', 'Severe pain', 'Fatigue', 'Sore throat', 'Cold'
  ];

  useEffect(() => {
    if (patientId) {
      loadExistingPatient(patientId);
    }
  }, [patientId]);

  const loadExistingPatient = async (id) => {
    try {
      const list = await fetchPatients(id);
      const target = list.find(p => p.id === id);
      if (target) {
        setExistingPatient(target);
        setPersonal({
          full_name: target.full_name,
          age: target.age,
          gender: target.gender,
          phone_number: target.phone_number || '',
          address: target.address || '',
          village: target.village || '',
          district: target.district || '',
          state: target.state || '',
          is_pregnant: target.is_pregnant || false,
          gestational_age_weeks: target.gestational_age_weeks || '',
          emergency_contact: target.emergency_contact || ''
        });
        if (target.medical_history) {
          setMedicalHistory({
            diabetes: target.medical_history.diabetes || false,
            hypertension: target.medical_history.hypertension || false,
            heart_disease: target.medical_history.heart_disease || false,
            asthma: target.medical_history.asthma || false,
            kidney_disease: target.medical_history.kidney_disease || false,
            previous_hospitalization: target.medical_history.previous_hospitalization || false,
            other_conditions: target.medical_history.other_conditions || '',
            current_medications: target.medical_history.current_medications || '',
            allergies: target.medical_history.allergies || ''
          });
        }
        setStep(3); // Jump to Vitals if patient already exists
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateBmi = () => {
    const w = Number(vitals.weight_kg);
    const h = Number(vitals.height_cm);
    if (w > 0 && h > 0) {
      return (w / ((h / 100) ** 2)).toFixed(1);
    }
    return '23.5';
  };

  const handleToggleSymptom = (name) => {
    const exists = symptoms.find(s => s.symptom_name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setSymptoms(symptoms.filter(s => s.symptom_name.toLowerCase() !== name.toLowerCase()));
    } else {
      setSymptoms([...symptoms, { symptom_name: name, severity: 'Mild', duration_days: 1 }]);
    }
  };

  const handleUpdateSymptom = (name, field, val) => {
    setSymptoms(symptoms.map(s => {
      if (s.symptom_name.toLowerCase() === name.toLowerCase()) {
        return { ...s, [field]: val };
      }
      return s;
    }));
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!personal.full_name.trim()) {
        alert("Please enter patient full name");
        return false;
      }
    } else if (step === 3) {
      const valRes = validateVitals(vitals);
      setVitalsErrors(valRes.errors);
      if (!valRes.isValid) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleRunAssessment = async () => {
    setSubmitting(true);
    try {
      let savedPatient = existingPatient;
      if (!savedPatient) {
        savedPatient = await createPatient({
          ...personal,
          gestational_age_weeks: personal.is_pregnant ? Number(personal.gestational_age_weeks) || null : null,
          medical_history: medicalHistory
        });
      }

      const activeSymptoms = symptoms.filter(s => s.symptom_name);
      const req = {
        patient_id: savedPatient.id,
        vitals: {
          systolic_bp: Number(vitals.systolic_bp),
          diastolic_bp: Number(vitals.diastolic_bp),
          heart_rate: Number(vitals.heart_rate),
          respiratory_rate: Number(vitals.respiratory_rate),
          temperature_c: Number(vitals.temperature_c),
          spo2: Number(vitals.spo2),
          blood_glucose: Number(vitals.blood_glucose),
          weight_kg: Number(vitals.weight_kg),
          height_cm: Number(vitals.height_cm)
        },
        symptoms: activeSymptoms,
        medical_history: medicalHistory
      };

      const res = await runRiskAssessment(req);
      setAssessmentResult(res);
      setStep(6);
    } catch (e) {
      alert("Assessment failed: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    t('step_1_personal'),
    t('step_2_history'),
    t('step_3_vitals'),
    t('step_4_symptoms'),
    t('step_5_review'),
    t('step_6_assessment')
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center overflow-x-auto gap-2 pb-2">
          {stepsList.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={idx} className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs transition ${
                    isCurrent
                      ? 'bg-sky-600 text-white shadow-md ring-4 ring-sky-100'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : stepNum}
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${isCurrent ? 'text-sky-700' : 'text-slate-500'}`}>
                  {label.split('.')[1]}
                </span>
                {idx < stepsList.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Body */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">

        {/* STEP 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-900 border-b pb-3">{t('step_1_personal')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase text-slate-700">{t('full_name')} *</label>
                  <VoiceInputButton onResult={(text) => setPersonal({ ...personal, full_name: text })} label="Voice Name" />
                </div>
                <input
                  type="text"
                  required
                  value={personal.full_name}
                  onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Kamla Bai"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('age')} *</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={personal.age}
                  onChange={(e) => setPersonal({ ...personal, age: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('gender')} *</label>
                <select
                  value={personal.gender}
                  onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('phone')}</label>
                <input
                  type="text"
                  value={personal.phone_number}
                  onChange={(e) => setPersonal({ ...personal, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('village')}</label>
                <input
                  type="text"
                  value={personal.village}
                  onChange={(e) => setPersonal({ ...personal, village: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('district')}</label>
                <input
                  type="text"
                  value={personal.district}
                  onChange={(e) => setPersonal({ ...personal, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {personal.gender === 'Female' && (
                <div className="sm:col-span-2 bg-pink-50 border border-pink-200 p-4 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 font-bold text-pink-900 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={personal.is_pregnant}
                      onChange={(e) => setPersonal({ ...personal, is_pregnant: e.target.checked })}
                      className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                    />
                    <span>{t('is_pregnant')}</span>
                  </label>
                  {personal.is_pregnant && (
                    <div>
                      <label className="block text-xs font-bold text-pink-800 mb-1">{t('gestational_weeks')}</label>
                      <input
                        type="number"
                        min="1"
                        max="42"
                        value={personal.gestational_age_weeks}
                        onChange={(e) => setPersonal({ ...personal, gestational_age_weeks: e.target.value })}
                        className="w-full sm:w-1/2 px-3 py-2 border border-pink-300 rounded-lg text-sm bg-white"
                        placeholder="e.g. 24"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Medical History */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-900 border-b pb-3">{t('step_2_history')}</h3>
            <p className="text-xs text-slate-500">Check any existing chronic medical conditions for the patient.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'diabetes', label: 'Diabetes' },
                { key: 'hypertension', label: 'Hypertension / High BP' },
                { key: 'heart_disease', label: 'Heart Disease' },
                { key: 'asthma', label: 'Asthma / Respiratory Illness' },
                { key: 'kidney_disease', label: 'Kidney Disease' },
                { key: 'previous_hospitalization', label: 'Previous Hospitalization' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-sky-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={medicalHistory[item.key]}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, [item.key]: e.target.checked })}
                    className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="font-bold text-sm text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Medications</label>
                <input
                  type="text"
                  value={medicalHistory.current_medications}
                  onChange={(e) => setMedicalHistory({ ...medicalHistory, current_medications: e.target.value })}
                  placeholder="e.g. Amlodipine, Metformin"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Allergies</label>
                <input
                  type="text"
                  value={medicalHistory.allergies}
                  onChange={(e) => setMedicalHistory({ ...medicalHistory, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Dust"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Vital Signs */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-slate-900 border-b pb-3">{t('vitals_heading')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('systolic_bp')} *</label>
                <input
                  type="number"
                  value={vitals.systolic_bp}
                  onChange={(e) => setVitals({ ...vitals, systolic_bp: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.systolic_bp ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
                {vitalsErrors.systolic_bp && <p className="text-xs text-red-600 font-semibold mt-1">{vitalsErrors.systolic_bp}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('diastolic_bp')} *</label>
                <input
                  type="number"
                  value={vitals.diastolic_bp}
                  onChange={(e) => setVitals({ ...vitals, diastolic_bp: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.diastolic_bp ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
                {vitalsErrors.diastolic_bp && <p className="text-xs text-red-600 font-semibold mt-1">{vitalsErrors.diastolic_bp}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('heart_rate')} *</label>
                <input
                  type="number"
                  value={vitals.heart_rate}
                  onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.heart_rate ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
                {vitalsErrors.heart_rate && <p className="text-xs text-red-600 font-semibold mt-1">{vitalsErrors.heart_rate}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('spo2')} *</label>
                <input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.spo2 ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
                {vitalsErrors.spo2 && <p className="text-xs text-red-600 font-semibold mt-1">{vitalsErrors.spo2}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('temperature')} *</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature_c}
                  onChange={(e) => setVitals({ ...vitals, temperature_c: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.temperature_c ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
                {vitalsErrors.temperature_c && <p className="text-xs text-red-600 font-semibold mt-1">{vitalsErrors.temperature_c}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('respiratory_rate')} *</label>
                <input
                  type="number"
                  value={vitals.respiratory_rate}
                  onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 ${vitalsErrors.respiratory_rate ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('blood_glucose')}</label>
                <input
                  type="number"
                  value={vitals.blood_glucose}
                  onChange={(e) => setVitals({ ...vitals, blood_glucose: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('weight')}</label>
                <input
                  type="number"
                  value={vitals.weight_kg}
                  onChange={(e) => setVitals({ ...vitals, weight_kg: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">{t('height')}</label>
                <input
                  type="number"
                  value={vitals.height_cm}
                  onChange={(e) => setVitals({ ...vitals, height_cm: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Calculated BMI Callout */}
            <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-sky-800">Auto-Calculated BMI</span>
                <p className="text-2xl font-black text-sky-900">{calculateBmi()} kg/m²</p>
              </div>
              <span className="text-xs text-sky-700 bg-sky-100 px-3 py-1 rounded-full font-bold">
                {Number(calculateBmi()) > 25 ? 'Overweight' : Number(calculateBmi()) < 18.5 ? 'Underweight' : 'Normal Weight'}
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: Symptoms */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-slate-900">{t('symptoms_heading')}</h3>
              <VoiceInputButton
                onResult={(text) => {
                  const matched = availableSymptomsList.find(s => text.toLowerCase().includes(s.toLowerCase()));
                  if (matched) handleToggleSymptom(matched);
                }}
                label="Voice Symptom"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {availableSymptomsList.map(symName => {
                const isSelected = symptoms.some(s => s.symptom_name.toLowerCase() === symName.toLowerCase());
                return (
                  <button
                    key={symName}
                    type="button"
                    onClick={() => handleToggleSymptom(symName)}
                    className={`p-3 rounded-xl text-left border text-xs font-bold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-700 shadow-md'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    <span>{symName}</span>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Symptoms Details (Severity & Duration) */}
            {symptoms.length > 0 && (
              <div className="mt-6 space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900">Configure Symptom Severity & Duration</h4>
                <div className="space-y-2">
                  {symptoms.map(s => (
                    <div key={s.symptom_name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-3">
                      <span className="font-bold text-sm text-slate-900">{s.symptom_name}</span>
                      <div className="flex items-center gap-3">
                        <select
                          value={s.severity}
                          onChange={(e) => handleUpdateSymptom(s.symptom_name, 'severity', e.target.value)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                        </select>

                        <div className="flex items-center gap-1">
                          <label className="text-xs font-semibold text-slate-600">Days:</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={s.duration_days}
                            onChange={(e) => handleUpdateSymptom(s.symptom_name, 'duration_days', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review */}
        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 border-b pb-3">Review Clinical Data Before AI Triage</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sky-800 uppercase text-xs">Patient Profile</h4>
                <p><span className="font-semibold text-slate-600">Name:</span> {personal.full_name}</p>
                <p><span className="font-semibold text-slate-600">Age/Gender:</span> {personal.age} yrs ({personal.gender})</p>
                <p><span className="font-semibold text-slate-600">Location:</span> {personal.village}, {personal.district}</p>
                {personal.is_pregnant && <p className="text-pink-700 font-bold">Pregnant ({personal.gestational_age_weeks} weeks)</p>}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sky-800 uppercase text-xs">Recorded Vitals</h4>
                <p><span className="font-semibold text-slate-600">Blood Pressure:</span> {vitals.systolic_bp}/{vitals.diastolic_bp} mmHg</p>
                <p><span className="font-semibold text-slate-600">SpO2 Oxygen:</span> {vitals.spo2}%</p>
                <p><span className="font-semibold text-slate-600">Heart Rate:</span> {vitals.heart_rate} bpm</p>
                <p><span className="font-semibold text-slate-600">Temperature:</span> {vitals.temperature_c}°C</p>
                <p><span className="font-semibold text-slate-600">BMI:</span> {calculateBmi()} kg/m²</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-sky-800 uppercase text-xs mb-2">Selected Symptoms</h4>
              <div className="flex flex-wrap gap-2">
                {symptoms.length === 0 ? <span className="text-slate-400 italic">No symptoms selected</span> : (
                  symptoms.map(s => (
                    <span key={s.symptom_name} className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs rounded-lg border border-sky-200">
                      {s.symptom_name} ({s.severity}) - {s.duration_days} day(s)
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleRunAssessment}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-extrabold text-base rounded-2xl shadow-xl transition transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>{submitting ? 'Running Random Forest Model...' : 'Run AI Risk Assessment'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Assessment Results Page */}
        {step === 6 && assessmentResult && (
          <div className="space-y-6 animate-fade-in">
            {/* Risk Banner Card */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Calculated Risk Level</span>
                  <div className="mt-1 flex items-center gap-3">
                    <RiskBadge level={assessmentResult.risk_level} size="lg" />
                    <span className="text-sm font-bold text-slate-600">
                      Confidence Score: <span className="text-slate-900 font-black">{Math.round(assessmentResult.confidence_score * 100)}%</span>
                    </span>
                  </div>
                </div>

                {assessmentResult.assessment_source === 'OFFLINE_FALLBACK' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full">
                    Offline Triage Mode
                  </span>
                )}
              </div>

              {/* Emergency Warning Banner */}
              {assessmentResult.risk_level === 'CRITICAL' && (
                <div className="bg-red-600 text-white p-4 rounded-xl font-bold text-sm shadow-md flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 shrink-0 text-white animate-bounce" />
                  <div>
                    <h4 className="font-extrabold uppercase text-xs text-red-100">CRITICAL EMERGENCY ALERT</h4>
                    <p className="mt-0.5">{t('emergency_warning')}</p>
                  </div>
                </div>
              )}

              {/* Identified Contributing Risk Factors */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Identified Clinical Risk Factors</h4>
                <ul className="space-y-1.5">
                  {assessmentResult.risk_factors.map((rf, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      <span>{rf}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Clinical Recommendation Engine Guidance */}
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-sky-900 text-sm">{assessmentResult.recommendation_title || 'Clinical Guidance'}</h4>
                <ul className="space-y-1 text-xs sm:text-sm text-sky-950">
                  {assessmentResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-bold text-sky-700 italic pt-1">{assessmentResult.urgency_note}</p>
              </div>

              {/* Prescribed Primary Medications (ASHA Essential Drug Kit) - ONLY for MEDIUM Risk */}
              {assessmentResult.risk_level === 'MEDIUM' && (
                (() => {
                  let meds = assessmentResult.prescriptions || [];
                  if (meds.length === 0) {
                    const syms = (symptoms || []).map(s => (s.symptom_name || '').toLowerCase());
                    const temp = Number(vitals.temperature_c || 37.0);
                    if (syms.includes('fever') || temp >= 37.8 || syms.includes('headache') || syms.includes('severe_pain')) {
                      meds.push({
                        medicine_name: "Paracetamol (PCM) 500mg",
                        dosage: "1 Tablet (500mg)",
                        frequency: "Every 6-8 hours as needed (Max 3-4 tablets/day)",
                        duration: "3 Days",
                        instructions: "Take after food for fever & pain relief. Consult PHC doctor if fever lasts > 3 days."
                      });
                    }
                    if (syms.includes('cough') || syms.includes('cold') || syms.includes('sore throat')) {
                      meds.push({
                        medicine_name: "Cetirizine 10mg",
                        dosage: "1 Tablet (10mg)",
                        frequency: "Once daily at bedtime",
                        duration: "3 - 5 Days",
                        instructions: "Relieves cold, sneezing, and cough. May cause mild drowsiness."
                      });
                      meds.push({
                        medicine_name: "Steam Inhalation & Saline Gargle",
                        dosage: "Steam for 5-10 mins",
                        frequency: "2 - 3 Times daily",
                        duration: "4 - 5 Days",
                        instructions: "Loosens chest congestion and relieves throat irritation."
                      });
                    }
                    if (syms.includes('diarrhea')) {
                      meds.push({
                        medicine_name: "Oral Rehydration Salts (ORS)",
                        dosage: "1 Sachet in 1 Liter clean boiled water",
                        frequency: "Drink continuously after every loose stool",
                        duration: "3 Days",
                        instructions: "Prevents dehydration and restores electrolytes."
                      });
                      meds.push({
                        medicine_name: "Zinc Sulfate 20mg",
                        dosage: "1 Tablet (20mg)",
                        frequency: "Once daily after meals",
                        duration: "14 Days",
                        instructions: "Promotes gut healing and reduces recurrence."
                      });
                    }
                    if (syms.includes('vomiting') || syms.includes('nausea')) {
                      meds.push({
                        medicine_name: "Domperidone 10mg / Ondansetron 4mg",
                        dosage: "1 Tablet",
                        frequency: "Twice daily 30 mins before food",
                        duration: "2 Days",
                        instructions: "Take with small sips of water. Avoid oily or heavy foods."
                      });
                    }
                    if (syms.includes('abdominal pain') || syms.includes('acidity')) {
                      meds.push({
                        medicine_name: "Antacid Gel / Pantoprazole 40mg",
                        dosage: "1 Tablet (or 2 tsp antacid gel)",
                        frequency: "Once daily in morning before breakfast",
                        duration: "3 - 5 Days",
                        instructions: "Relieves burning sensation and gastric discomfort."
                      });
                    }
                    if (syms.includes('dizziness') || syms.includes('weakness') || syms.includes('fatigue')) {
                      meds.push({
                        medicine_name: "Oral Electrolyte Solution (Electral / Glucose-D)",
                        dosage: "1-2 Glasses daily",
                        frequency: "Twice daily",
                        duration: "3 Days",
                        instructions: "Rest in a well-ventilated cool area and keep hydrated."
                      });
                    }
                    if (meds.length === 0) {
                      meds.push({
                        medicine_name: "Paracetamol 500mg (ASHA Essential Kit)",
                        dosage: "1 Tablet as needed",
                        frequency: "Every 8 hours after meals for pain/fever relief",
                        duration: "2 - 3 Days",
                        instructions: "Take after meals for temporary relief while awaiting PHC medical officer review."
                      });
                      meds.push({
                        medicine_name: "Oral Rehydration Salts (ORS)",
                        dosage: "1 Sachet in 1 Liter clean drinking water",
                        frequency: "Sip throughout the day",
                        duration: "2 Days",
                        instructions: "Maintains hydration and vital electrolyte balance."
                      });
                    }
                  }

                  return (
                    <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            💊
                          </span>
                          <div>
                            <h4 className="font-black text-emerald-950 text-sm sm:text-base">
                              Prescribed Primary Medications (ASHA Essential Drug Kit)
                            </h4>
                            <p className="text-xs text-emerald-700 font-medium">
                              Supportive first-line treatment for Moderate / Medium risk cases
                            </p>
                          </div>
                        </div>
                        <span className="self-start sm:self-auto px-3 py-1 bg-emerald-200 text-emerald-950 text-xs font-black rounded-full uppercase tracking-wider">
                          Medium Risk Protocol
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {meds.map((med, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm space-y-2 hover:border-emerald-400 transition">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-black text-emerald-950 text-sm flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                {med.medicine_name}
                              </h5>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                                {med.duration}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700 space-y-1.5 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 w-20 shrink-0">Dosage:</span>
                                <span className="font-medium text-slate-800">{med.dosage}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 w-20 shrink-0">Frequency:</span>
                                <span className="font-medium text-slate-800">{med.frequency}</span>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs mt-2">
                                <strong className="text-slate-900 font-bold block mb-0.5">Instructions:</strong>
                                <p className="italic text-slate-600 leading-relaxed">{med.instructions}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-emerald-100/70 border border-emerald-300 p-3.5 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                        <span className="font-extrabold text-emerald-800 text-base leading-none">ℹ️</span>
                        <span className="leading-relaxed">
                          <strong>ASHA Protocol Notice:</strong> These medications are supportive first-line measures from standard rural ASHA kits. The patient must visit the PHC Medical Officer for clinical review if symptoms persist or do not improve within 48-72 hours.
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Medical Safety Disclaimer Notice */}
              <div className="bg-slate-100 border border-slate-300 p-3 rounded-xl text-xs text-slate-600 italic">
                <strong className="text-slate-800 font-bold uppercase not-italic">{t('disclaimer_title')}: </strong>
                {t('disclaimer_text')}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                {(assessmentResult.risk_level === 'HIGH' || assessmentResult.risk_level === 'CRITICAL') && (
                  <button
                    onClick={() => navigate(`/referrals?create=true&patient_id=${assessmentResult.patient_id}&assessment_id=${assessmentResult.id}&record_id=${assessmentResult.health_record_id}`)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition"
                  >
                    {t('create_referral')}
                  </button>
                )}

                <button
                  onClick={() => navigate(`/patients/${assessmentResult.patient_id}/history`)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl border border-slate-300"
                >
                  {t('view_history')}
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl"
                >
                  {t('new_assessment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer (Previous / Next) */}
        {step < 6 && (
          <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className="flex items-center gap-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}
