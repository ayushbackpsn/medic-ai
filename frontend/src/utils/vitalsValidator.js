export function validateVitals(vitals) {
  const errors = {};

  const sys = Number(vitals.systolic_bp);
  const dia = Number(vitals.diastolic_bp);
  const hr = Number(vitals.heart_rate);
  const resp = Number(vitals.respiratory_rate);
  const temp = Number(vitals.temperature_c);
  const spo2 = Number(vitals.spo2);
  const glucose = Number(vitals.blood_glucose);
  const weight = Number(vitals.weight_kg);
  const height = Number(vitals.height_cm);

  if (isNaN(sys) || sys < 50 || sys > 250) {
    errors.systolic_bp = "Systolic BP must be between 50 and 250 mmHg";
  }

  if (isNaN(dia) || dia < 30 || dia > 150) {
    errors.diastolic_bp = "Diastolic BP must be between 30 and 150 mmHg";
  }

  if (!isNaN(sys) && !isNaN(dia) && dia >= sys) {
    errors.diastolic_bp = "Diastolic BP must be lower than Systolic BP";
  }

  if (isNaN(hr) || hr < 30 || hr > 220) {
    errors.heart_rate = "Heart Rate must be between 30 and 220 bpm";
  }

  if (isNaN(resp) || resp < 8 || resp > 60) {
    errors.respiratory_rate = "Respiratory rate must be between 8 and 60 breaths/min";
  }

  if (isNaN(temp) || temp < 32 || temp > 43) {
    errors.temperature_c = "Temperature must be between 32°C and 43°C";
  }

  if (isNaN(spo2) || spo2 < 0 || spo2 > 100) {
    errors.spo2 = "SpO2 oxygen saturation must be between 0% and 100%";
  }

  if (isNaN(glucose) || glucose < 30 || glucose > 600) {
    errors.blood_glucose = "Blood Glucose must be between 30 and 600 mg/dL";
  }

  if (isNaN(weight) || weight < 1 || weight > 300) {
    errors.weight_kg = "Weight must be between 1 and 300 kg";
  }

  if (isNaN(height) || height < 30 || height > 250) {
    errors.height_cm = "Height must be between 30 and 250 cm";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
