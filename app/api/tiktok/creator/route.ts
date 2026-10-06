import { NextResponse } from "next/server";
import { getTikTokCreator } from "@/lib/tiktok-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getTikTokCreator() });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Không thể kết nối TikTok.",
    }, { status: 503 });
  }
}
