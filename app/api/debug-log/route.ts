import { NextResponse } from "next/server";
import { appendFileSync } from "fs";
import { join } from "path";

const LOG_PATH = join(process.cwd(), "debug-auth.log");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const line = JSON.stringify(body) + "\n";
    appendFileSync(LOG_PATH, line);
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true });
}
