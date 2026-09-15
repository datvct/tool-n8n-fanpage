import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function mediaUrl(fileUrl: string, kind: "image" | "video") {
  try {
    const url = new URL(fileUrl);
    if (url.hostname === "drive.google.com")
      return `/api/media?kind=${kind}&url=${encodeURIComponent(fileUrl)}`;
  } catch {
    // Keep legacy values unchanged.
  }
  return fileUrl;
}

function isVideo(fileName: string, mimeType: string | null) {
  return mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(fileName);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      socialPosts: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!item)
    return NextResponse.json(
      { success: false, error: "Không tìm thấy nội dung." },
      { status: 404 },
    );

  return NextResponse.json({
    success: true,
    data: {
      id: item.id,
      employee: item.employeeName,
      note: item.originalNote,
      createdAt: item.createdAt.toISOString(),
      images: item.media
        .filter((media) => !isVideo(media.fileName, media.mimeType))
        .map((media) => mediaUrl(media.fileUrl, "image")),
      videos: item.media
        .filter((media) => isVideo(media.fileName, media.mimeType))
        .map((media) => mediaUrl(media.fileUrl, "video")),
        posts: item.socialPosts.map((post) => ({
          id: post.id,
          platform: post.platform,
          postType: post.postType,
          content: post.content,
          title: post.title ?? undefined,
          description: post.description ?? undefined,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString(),
        error: post.errorMessage ?? undefined,
      })),
    },
  });
}
