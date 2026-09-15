import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function toUiStatus(status: string) {
  if (status === "publishing") return "scheduled";
  if (status === "cancelled") return "failed";
  return status;
}

function getMediaUrl(fileUrl: string, kind: "image" | "video") {
  try {
    const url = new URL(fileUrl);
    if (url.hostname === "drive.google.com")
      return `/api/media?kind=${kind}&url=${encodeURIComponent(fileUrl)}`;
  } catch {
    // Keep non-URL values unchanged so the UI can still show the fallback.
  }
  return fileUrl;
}

function isVideo(fileName: string, mimeType: string | null) {
  return mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(fileName);
}

export async function GET() {
  try {
    const contents = await prisma.contentItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { sortOrder: "asc" } },
        socialPosts: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      data: contents.map((item) => ({
        id: item.id,
        employee: item.employeeName,
        note: item.originalNote,
        createdAt: item.createdAt.toISOString(),
        images: item.media
          .filter((media) => !isVideo(media.fileName, media.mimeType))
          .map((media) => getMediaUrl(media.fileUrl, "image")),
        videos: item.media
          .filter((media) => isVideo(media.fileName, media.mimeType))
          .map((media) => getMediaUrl(media.fileUrl, "video")),
        posts: item.socialPosts.map((post) => ({
          id: post.id,
          platform: post.platform,
          postType: post.postType,
          content: post.content,
          title: post.title ?? undefined,
          description: post.description ?? undefined,
          status: toUiStatus(post.status),
          scheduledAt: post.scheduledAt?.toISOString(),
          error: post.errorMessage ?? undefined,
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to load contents", error);
    return NextResponse.json(
      { success: false, error: "Không thể đọc dữ liệu từ database." },
      { status: 500 },
    );
  }
}
