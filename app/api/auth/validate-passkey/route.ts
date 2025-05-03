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

    // Check against the appropriate passkey based on type
    switch (type) {
      case "admin":
        isValid = passkey === process.env.ADMIN_PASSKEY;
        break;
      case "staff":
        isValid = passkey === process.env.STAFF_PASSKEY;
        break;
      case "dr_abundo":
        isValid = passkey === process.env.DR_ABUNDO_PASSKEY;
        break;
      case "dr_decastro":
        isValid = passkey === process.env.DR_DECASTRO_PASSKEY;
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
