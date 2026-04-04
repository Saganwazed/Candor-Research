import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/safe-body";

const MAX_BODY_BYTES = 4096;

export async function POST(request: NextRequest) {
  try {
    let body: { session_id: string; useful: boolean };
    try {
      body = await parseJsonBody(request, MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
        return NextResponse.json({ error: "Request too large." }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { session_id, useful } = body;

    if (!session_id || typeof useful !== "boolean") {
      return NextResponse.json(
        { error: "Invalid feedback data." },
        { status: 400 }
      );
    }

    // Sanitize before logging to prevent log injection
    const safeSessionId = session_id.replace(/[^\w-]/g, "").slice(0, 64);
    console.log(
      `[Feedback] session=${safeSessionId} useful=${useful} time=${new Date().toISOString()}`
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
