export function calculateOfflineRisk(patientData, vitals, medicalHistory, symptoms) {
  let score = 0;
  const riskFactors = [];

  const age = Number(patientData.age || 35);
  const sysBp = Number(vitals.systolic_bp || 120);
  const diaBp = Number(vitals.diastolic_bp || 80);
  const hr = Number(vitals.heart_rate || 75);
  const resp = Number(vitals.respiratory_rate || 16);
  const temp = Number(vitals.temperature_c || 37.0);
  const spo2 = Number(vitals.spo2 || 98);
  const glucose = Number(vitals.blood_glucose || 110);

  const symptomList = (symptoms || []).map(s => s.symptom_name ? s.symptom_name.toLowerCase() : '');

  // 1. SpO2 Evaluation
  if (spo2 < 88) {
    score += 6;
    riskFactors.push(`Critically Low Oxygen Saturation (${spo2}%)`);
  } else if (spo2 < 92) {
    score += 4;
    riskFactors.push(`Severe Oxygen Desaturation (${spo2}%)`);
  } else if (spo2 < 95) {
    score += 2;
    riskFactors.push(`Low Oxygen Saturation (${spo2}%)`);
  }

  // 2. Blood Pressure Evaluation
  if (sysBp >= 180 || diaBp >= 110) {
    score += 5;
    riskFactors.push(`Hypertensive Crisis (${sysBp}/${diaBp} mmHg)`);
  } else if (sysBp >= 160 || diaBp >= 100) {
    score += 3;
    riskFactors.push(`Stage 2 Severe Hypertension (${sysBp}/${diaBp} mmHg)`);
  } else if (sysBp >= 140 || diaBp >= 90) {
    score += 1;
    riskFactors.push(`High Blood Pressure (${sysBp}/${diaBp} mmHg)`);
  } else if (sysBp < 90) {
    score += 3;
    riskFactors.push(`Hypotension / Low BP (${sysBp} mmHg)`);
  }

  // 3. Heart Rate Evaluation
  if (hr > 130) {
    score += 3;
    riskFactors.push(`Severe Tachycardia (${hr} bpm)`);
  } else if (hr > 100) {
    score += 1;
    riskFactors.push(`Elevated Heart Rate (${hr} bpm)`);
  } else if (hr < 50) {
    score += 2;
    riskFactors.push(`Bradycardia (${hr} bpm)`);
  }

  // 4. Respiratory Rate & Temperature
  if (resp >= 25) {
    score += 3;
    riskFactors.push(`Severe Tachypnea (${resp} breaths/min)`);
  } else if (resp >= 21) {
    score += 1;
    riskFactors.push(`Rapid Breathing (${resp} breaths/min)`);
  }

  if (temp >= 39.5) {
    score += 3;
    riskFactors.push(`High Fever (${temp}°C)`);
  } else if (temp >= 38.0) {
    score += 1;
    riskFactors.push(`Fever (${temp}°C)`);
  }

  // 5. Critical Symptoms Overrides
  if (symptomList.includes('unconsciousness')) {
    score += 7;
    riskFactors.push('Loss of Consciousness');
  }
  if (symptomList.includes('seizure')) {
    score += 5;
    riskFactors.push('Seizure Activity');
  }
  if (symptomList.includes('chest pain') || symptomList.includes('chest_pain')) {
    score += 4;
    riskFactors.push('Acute Chest Pain');
  }
  if (symptomList.includes('breathlessness')) {
    score += 3;
    riskFactors.push('Shortness of Breath');
  }
  if (symptomList.includes('bleeding')) {
    score += 3;
    riskFactors.push('Active Bleeding');
  }

  // 6. Pregnancy Risk Factor
  if (patientData.is_pregnant && (sysBp >= 140 || temp >= 38.0 || symptomList.includes('swelling'))) {
    score += 2;
    riskFactors.push('High Risk Pregnancy Indicator');
  }

  // Categorize Risk Level
  let riskLevel = "LOW";
  let confidenceScore = 0.92;

  if (score >= 7 || symptomList.includes('unconsciousness') || spo2 < 88) {
    riskLevel = "CRITICAL";
    confidenceScore = 0.96;
  } else if (score >= 4 || (symptomList.includes('chest pain') && age > 40) || spo2 < 92) {
    riskLevel = "HIGH";
    confidenceScore = 0.89;
  } else if (score >= 2) {
    riskLevel = "MEDIUM";
    confidenceScore = 0.82;
  }

  if (riskFactors.length === 0) {
    riskFactors.push("All vitals within normal ranges");
  }

  let title = "";
  let actions = [];
  let urgency = "";

  if (riskLevel === "LOW") {
    title = "Routine Monitoring & Home Care";
    actions = [
      "Routine follow-up during next scheduled ASHA visit.",
      "Maintain hydration, nutrition, and rest.",
      "Instruct family to seek care if new symptoms develop."
    ];
    urgency = "Non-urgent";
  } else if (riskLevel === "MEDIUM") {
    title = "Follow-Up & Medical Consultation Recommended";
    actions = [
      "Consult PHC Medical Officer within 48-72 hours.",
      "Monitor vitals daily.",
      "Provide OTC symptom relief as appropriate."
    ];
    urgency = "Moderate Priority";
  } else if (riskLevel === "HIGH") {
    title = "Prompt Healthcare Referral Required";
    actions = [
      "Immediate referral to nearest PHC/CHC.",
      "Arrange comfortable transport.",
      "Keep family informed and monitor SpO2."
    ];
    urgency = "High Priority";
  } else {
    title = "EMERGENCY MEDICAL ATTENTION REQUIRED";
    actions = [
      "IMMEDIATE EMERGENCY REFERRAL TO DISTRICT HOSPITAL / PHC EMERGENCY!",
      "Call emergency ambulance immediately.",
      "Maintain clear airway and monitor vital signs constantly."
    ];
    urgency = "CRITICAL EMERGENCY";
  }

  return {
    risk_level: riskLevel,
    confidence_score: confidenceScore,
    risk_factors: riskFactors,
    recommendation_title: title,
    recommendations: actions,
    urgency_note: urgency,
    assessment_source: "OFFLINE_FALLBACK"
  };
}
