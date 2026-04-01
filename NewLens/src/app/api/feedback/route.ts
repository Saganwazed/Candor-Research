import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, useful } = body as {
      session_id: string;
      useful: boolean;
    };

    if (!session_id || typeof useful !== "boolean") {
      return NextResponse.json(
        { error: "Invalid feedback data." },
        { status: 400 }
      );
    }

    // Log feedback — Supabase hook point for later
    console.log(
      `[Feedback] session=${session_id} useful=${useful} time=${new Date().toISOString()}`
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
