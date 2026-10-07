import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PatientRegistrationWizard from './PatientRegistrationWizard';

export default function AssessmentResult() {
  const { patientId } = useParams();
  return <PatientRegistrationWizard />;
}
