/**
 * Validates a passkey against the server
 * @param passkey - The passkey to validate
 * @param type - The type of passkey (admin, staff, dr_abundo, dr_decastro)
 * @returns Promise with validation result
 */
export async function validatePasskey(
  passkey: string,
  type: "admin" | "staff" | "dr_abundo" | "dr_decastro"
): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/validate-passkey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ passkey, type }),
    });

    if (!response.ok) {
      console.error(`Error validating passkey: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    return data.success && data.isValid;
  } catch (error) {
    console.error("Failed to validate passkey:", error);
    return false;
  }
}
