export const GenderOptions = ["male", "female", "other"];

export const PatientFormDefaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: new Date(Date.now()),
  gender: "Male" as Gender,
  address: "",
  category: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  allergies: "",
  currentMedication: "",
  familyMedicalHistory: "",
  pastMedicalHistory: "",
  identificationType: "",
  identificationNumber: "",
  identificationDocument: [],
  treatmentConsent: false,
  disclosureConsent: false,
  privacyConsent: false,
};

export const IdentificationTypes = [
  "Student ID",
  "Employee ID",
];

export const Doctors = [
  {
    image: "/assets/images/dr-abundo.png",
    name: "Abegail M. Abundo (Medical)",
  },
  {
    image: "/assets/images/dr-cruz.png",
    name: "Genevieve S. De Castro (Dentist)",
  },
];

export const Category = [
  "Student",
  "Employee",
]

export const StatusIcon = {
  scheduled: "/assets/icons/check.svg",
  pending: "/assets/icons/pending.svg",
  cancelled: "/assets/icons/cancelled.svg",
};