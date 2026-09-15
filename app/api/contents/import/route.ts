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
    mimeType?: string;
  }[];
  imageUrl?: string;
  imageFileName?: string;
  facebookContent?: string;
  linkedinContent?: string;
  youtubeContent?: string;
  postType?: "post" | "facebook_reel" | "youtube_short" | "youtube_video";
  videoUrl?: string;
  videoFileName?: string;
  videoFileId?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
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
  const originalNote = body.originalNote?.trim() || "";
  if (!sourceRowId)
    return errorResponse(
      "INVALID_INPUT",
      "Thiếu sourceRowId.",
    );
  if (
    !body.facebookContent?.trim() &&
    !body.linkedinContent?.trim() &&
    !body.youtubeContent?.trim()
  )
    return errorResponse(
      "EMPTY_CONTENT",
      "AI chưa tạo được nội dung cho nền tảng nào.",
    );

  const posts = [
    body.facebookContent?.trim()
      ? {
          platform: "facebook" as const,
          postType:
            body.postType === "facebook_reel" ? ("facebook_reel" as const) : ("post" as const),
          content: body.facebookContent.trim(),
        }
      : null,
    body.linkedinContent?.trim()
      ? {
          platform: "linkedin" as const,
          postType: "post" as const,
          content: body.linkedinContent.trim(),
        }
      : null,
    body.youtubeContent?.trim()
      ? {
          platform: "youtube" as const,
          postType:
            body.postType === "youtube_short"
              ? ("youtube_short" as const)
              : ("youtube_video" as const),
          content: body.youtubeContent.trim(),
          title: body.youtubeTitle?.trim() || null,
          description: body.youtubeDescription?.trim() || null,
        }
      : null,
  ].filter((post): post is NonNullable<typeof post> => Boolean(post));
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
      mimeType: image.mimeType?.trim() || null,
      sortOrder: index,
    }));

  const videoUrl = body.videoFileId
    ? `https://drive.google.com/uc?export=download&id=${body.videoFileId}`
    : body.videoUrl?.trim();
  if (videoUrl) {
    media.push({
      fileName: body.videoFileName?.trim() || "google-drive-video",
      fileUrl: videoUrl,
      storageType: "google_drive" as const,
      mimeType: "video/mp4",
      sortOrder: media.length,
    });
  }

  const existing = await prisma.contentItem.findUnique({
    where: { source_sourceRowId: { source: "google_sheet", sourceRowId } },
    include: { socialPosts: true },
  });
  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.contentItem.update({
        where: { id: existing.id },
        data: {
          employeeName: body.employeeName?.trim() || "Chưa xác định",
          originalNote,
        },
      });
      await tx.mediaAsset.deleteMany({ where: { contentId: existing.id } });
      if (media.length)
        await tx.mediaAsset.createMany({
          data: media.map((asset) => ({ ...asset, contentId: existing.id })),
        });
      for (const post of posts) {
        const postData = {
          platform: post.platform,
          postType: post.postType,
          content: post.content,
          title: "title" in post ? post.title : null,
          description: "description" in post ? post.description : null,
        };
        const current = existing.socialPosts.find(
          (item) => item.platform === post.platform,
        );
        if (current)
          await tx.socialPost.update({
            where: { id: current.id },
            data: postData,
          });
        else
          await tx.socialPost.create({
            data: { ...postData, contentId: existing.id },
          });
      }
      return tx.contentItem.findUnique({
        where: { id: existing.id },
        include: { socialPosts: true, media: true },
      });
    });
    return NextResponse.json({
      success: true,
      duplicate: true,
      updated: true,
      data: updated,
    });
  }

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
