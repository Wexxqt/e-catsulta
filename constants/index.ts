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
  signsSymptoms: "",
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

// Updated to ensure consistent doctor data structure
export const Doctors = [
  {
    id: "dr-abundo",
    name: "Abegail M. Abundo",
    displayName: "Abegail M. Abundo (Medical)",
    image: "/assets/images/dr-abundo.png",
    availability: {
      days: [1, 3, 5],
      startTime: 8,
      endTime: 11,
    },
  },
  {
    id: "dr-decastro",
    name: "Genevieve S. De Castro",
    displayName: "Genevieve S. De Castro (Dentist)",
    image: "/assets/images/dr-decastro.png",
    availability: {
      days: [2, 4],
      startTime: 13,
      endTime: 17,
    },
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

// Add holidays constant
export const Holidays = [
  new Date("2025-01-01"), // New Year's Day
  new Date("2025-12-25"), // Christmas Day
  // Add more holidays here
];