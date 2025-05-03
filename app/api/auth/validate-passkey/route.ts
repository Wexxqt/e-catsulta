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
    let envValue = null;

    // Check against the appropriate passkey based on type
    switch (type) {
      case "admin":
        envValue = process.env.ADMIN_PASSKEY;
        break;
      case "staff":
        envValue = process.env.STAFF_PASSKEY;
        break;
      case "dr_abundo":
        envValue = process.env.DR_ABUNDO_PASSKEY;
        break;
      case "dr_decastro":
        envValue = process.env.DR_DECASTRO_PASSKEY;
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid passkey type" },
          { status: 400 }
        );
    }

    // Check if env variable is set
    if (!envValue) {
      console.error(`Environment variable for ${type} passkey is not set`);
      return NextResponse.json(
        {
          success: false,
          message: "Authentication configuration error",
          debug:
            process.env.NODE_ENV === "development"
              ? `Env var for ${type} not found`
              : undefined,
        },
        { status: 500 }
      );
    }

    isValid = passkey === envValue;

    // For security, add a slight delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 300));

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
