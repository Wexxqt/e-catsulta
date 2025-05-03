/**
 * Validates a patient passkey against the server
 * @param idNumber - The patient's ID number
 * @param passkey - The passkey to validate
 * @returns Promise with validation result
 */
export async function validatePatientPasskey(
  idNumber: string,
  passkey: string
): Promise<boolean> {
  try {
    const response = await fetch("/api/verify-patient-passkey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idNumber, passkey }),
    });

    if (!response.ok) {
      console.error(`Error validating patient passkey: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    return data.success && data.isValid;
  } catch (error) {
    console.error("Failed to validate patient passkey:", error);
    return false;
  }
}
