import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ImportBody = {
  sourceRowId?: string;
  employeeName?: string;
  originalNote?: string;
  images?: {
    url?: string;
    originalUrl?: string;
    fileName?: string;
    fileId?: string;
  }[];
  imageUrl?: string;
  imageFileName?: string;
  facebookContent?: string;
  linkedinContent?: string;
};

function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.N8N_IMPORT_API_KEY;
  if (expectedKey && request.headers.get("x-n8n-key") !== expectedKey)
    return errorResponse("UNAUTHORIZED", "Khóa tích hợp không hợp lệ.", 401);

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_JSON",
      "Dữ liệu gửi lên không phải JSON hợp lệ.",
    );
  }

  const sourceRowId = body.sourceRowId?.trim();
  const originalNote = body.originalNote?.trim();
  if (!sourceRowId || !originalNote)
    return errorResponse(
      "INVALID_INPUT",
      "Thiếu sourceRowId hoặc ghi chú công việc.",
    );
  if (!body.facebookContent?.trim() && !body.linkedinContent?.trim())
    return errorResponse(
      "EMPTY_CONTENT",
      "AI chưa tạo được nội dung cho nền tảng nào.",
    );

  const existing = await prisma.contentItem.findUnique({
    where: { source_sourceRowId: { source: "google_sheet", sourceRowId } },
    select: { id: true },
  });
  if (existing)
    return NextResponse.json({
      success: true,
      duplicate: true,
      data: existing,
    });

  const posts = [
    body.facebookContent?.trim()
      ? { platform: "facebook" as const, content: body.facebookContent.trim() }
      : null,
    body.linkedinContent?.trim()
      ? { platform: "linkedin" as const, content: body.linkedinContent.trim() }
      : null,
  ].filter(Boolean) as { platform: "facebook" | "linkedin"; content: string }[];
  const media = (
    body.images?.length
      ? body.images
      : body.imageUrl
        ? [{ url: body.imageUrl, fileName: body.imageFileName }]
        : []
  )
    .map((image) => ({ ...image, url: image.url || image.originalUrl || "" }))
    .filter((image) => image.url.trim())
    .map((image, index) => ({
      fileName: image.fileName?.trim() || `google-drive-image-${index + 1}`,
      fileUrl: image.fileId
        ? `https://drive.google.com/uc?export=view&id=${image.fileId}`
        : image.url.trim(),
      storageType: "google_drive" as const,
      sortOrder: index,
    }));

  const created = await prisma.contentItem.create({
    data: {
      source: "google_sheet",
      sourceRowId,
      employeeName: body.employeeName?.trim() || "Chưa xác định",
      originalNote,
      status: "draft",
      media: media.length ? { create: media } : undefined,
      socialPosts: { create: posts },
    },
    include: { socialPosts: true, media: true },
  });

  return NextResponse.json(
    { success: true, duplicate: false, data: created },
    { status: 201 },
  );
}
