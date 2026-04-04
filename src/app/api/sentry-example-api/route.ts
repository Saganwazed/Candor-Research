import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// A faulty API route to test Sentry's error monitoring
export function GET() {
  try {
    throw new Error("Sentry Example Server Error");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Server error captured by Sentry" }, { status: 500 });
  }
}
