import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { passkey, type } = body;

    // Validate required fields
    if (!passkey || !type) {
      return NextResponse.json(
        { success: false, message: "Passkey and type are required" },
        { status: 400 }
      );
    }

    let isValid = false;

    // Add debug info for easier troubleshooting in production
    const debug = {
      passkey_length: passkey.length,
      type: type,
      env_vars_present: {
        admin: !!process.env.ADMIN_PASSKEY,
        staff: !!process.env.STAFF_PASSKEY,
        dr_abundo: !!process.env.DR_ABUNDO_PASSKEY,
        dr_decastro: !!process.env.DR_DECASTRO_PASSKEY,
      },
    };

    // Hardcoded passkeys as fallback for production issues
    const fallbackPasskeys = {
      admin: "111111",
      staff: "333333",
      dr_abundo: "000000",
      dr_decastro: "555555",
    };

    // Check against the appropriate passkey based on type
    switch (type) {
      case "admin":
        isValid =
          passkey === process.env.ADMIN_PASSKEY ||
          passkey === fallbackPasskeys.admin;
        break;
      case "staff":
        isValid =
          passkey === process.env.STAFF_PASSKEY ||
          passkey === fallbackPasskeys.staff;
        break;
      case "dr_abundo":
        isValid =
          passkey === process.env.DR_ABUNDO_PASSKEY ||
          passkey === fallbackPasskeys.dr_abundo;
        break;
      case "dr_decastro":
        isValid =
          passkey === process.env.DR_DECASTRO_PASSKEY ||
          passkey === fallbackPasskeys.dr_decastro;
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid passkey type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      isValid,
      debug: process.env.NODE_ENV === "development" ? debug : undefined,
    });
  } catch (error) {
    console.error("Error validating passkey:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to validate passkey",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
