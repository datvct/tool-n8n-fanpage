import { NextResponse } from "next/server";
import { tikTokBufferChannels } from "@/lib/tiktok-channels";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ success: true, data: tikTokBufferChannels });
}
