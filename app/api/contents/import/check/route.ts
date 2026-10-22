import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type CheckBody = {
  videoFileId?: string;
  videoFileName?: string;
  fileName?: string;
  topic?: string;
  mimeType?: string;
};

export async function POST(request: NextRequest) {
  const expectedKey = process.env.N8N_IMPORT_API_KEY;
  if (expectedKey && request.headers.get("x-n8n-key") !== expectedKey) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Khóa tích hợp không hợp lệ." } },
      { status: 401 },
    );
  }

  let body: CheckBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không phải JSON hợp lệ." } },
      { status: 400 },
    );
  }

  const videoFileId = String(body.videoFileId || "").trim();
  if (!videoFileId) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "Thiếu videoFileId." } },
      { status: 400 },
    );
  }

  const sourceRowId = `google-drive-${videoFileId}`;
  const existing = await prisma.contentItem.findUnique({
    where: { source_sourceRowId: { source: "google_sheet", sourceRowId } },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    exists: Boolean(existing),
    sourceRowId,
    videoFileId,
    fileId: videoFileId,
    videoFileName: String(body.videoFileName || body.fileName || "video.mp4"),
    fileName: String(body.fileName || body.videoFileName || "video.mp4"),
    topic: String(body.topic || ""),
    mimeType: String(body.mimeType || ""),
  });
}
