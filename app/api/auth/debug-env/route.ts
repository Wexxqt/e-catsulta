import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Check for a special header to prevent unauthorized access
  const authHeader = request.headers.get("x-auth-debug");
  if (authHeader !== "e-catsulta-debug") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create a safe version of the environment variables
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_PASSKEY_EXISTS: !!process.env.ADMIN_PASSKEY,
    STAFF_PASSKEY_EXISTS: !!process.env.STAFF_PASSKEY,
    DR_ABUNDO_PASSKEY_EXISTS: !!process.env.DR_ABUNDO_PASSKEY,
    DR_DECASTRO_PASSKEY_EXISTS: !!process.env.DR_DECASTRO_PASSKEY,
    // Add length checks
    ADMIN_PASSKEY_LENGTH: process.env.ADMIN_PASSKEY?.length || 0,
    STAFF_PASSKEY_LENGTH: process.env.STAFF_PASSKEY?.length || 0,
    DR_ABUNDO_PASSKEY_LENGTH: process.env.DR_ABUNDO_PASSKEY?.length || 0,
    DR_DECASTRO_PASSKEY_LENGTH: process.env.DR_DECASTRO_PASSKEY?.length || 0,
    // Don't include actual values for security
  };

  return NextResponse.json({
    success: true,
    env: safeEnv,
    time: new Date().toISOString(),
  });
}
