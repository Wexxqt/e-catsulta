export const GenderOptions = ["Male", "Female", "Other"];

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

// Philippine Holidays for 2025
export const Holidays = [
  // Regular Holidays
  new Date("2025-01-01"), // New Year's Day
  new Date("2025-04-09"), // Araw ng Kagitingan (Day of Valor)
  new Date("2025-04-17"), // Maundy Thursday
  new Date("2025-04-18"), // Good Friday
  new Date("2025-05-01"), // Labor Day
  new Date("2025-06-12"), // Independence Day
  new Date("2025-08-25"), // National Heroes Day (Last Monday of August)
  new Date("2025-11-30"), // Bonifacio Day
  new Date("2025-12-25"), // Christmas Day
  new Date("2025-12-30"), // Rizal Day
  
  // Special Non-working Holidays
  new Date("2025-01-25"), // Chinese New Year
  new Date("2025-02-25"), // EDSA People Power Revolution Anniversary
  new Date("2025-04-19"), // Black Saturday
  new Date("2025-08-21"), // Ninoy Aquino Day
  new Date("2025-11-01"), // All Saints' Day
  new Date("2025-11-02"), // All Souls' Day
  new Date("2025-12-08"), // Feast of the Immaculate Conception
  new Date("2025-12-24"), // Christmas Eve
  new Date("2025-12-31"), // New Year's Eve
  
  // Islamic Holidays (approximate dates - may need adjustment)
  new Date("2025-04-11"), // Eid'l Fitr (End of Ramadan)
  new Date("2025-06-17"), // Eid'l Adha (Feast of Sacrifice)
];

// Updated to ensure consistent doctor data structure
export const Doctors = [
  {
    id: "dr-abundo",
    name: "Abegail M. Abundo",
    displayName: "Abegail M. Abundo (Medical)",
    image: "/assets/images/dr-abundo.png",
    availability: {
      days: [1, 2, 3, 4, 5],
      startTime: 8,
      endTime: 17,
      holidays: Holidays
    },
  },
  {
    id: "dr-decastro",
    name: "Genevieve S. De Castro",
    displayName: "Genevieve S. De Castro (Dentist)",
    image: "/assets/images/dr-decastro.png",
    availability: {
      days: [1, 2, 3, 4, 5],
      startTime: 8,
      endTime: 17,
      holidays: Holidays
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