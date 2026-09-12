import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function toUiStatus(status: string) {
  if (status === "publishing") return "scheduled";
  if (status === "cancelled") return "failed";
  return status;
}

function getImageUrl(fileUrl: string) {
  try {
    const url = new URL(fileUrl);
    if (url.hostname === "drive.google.com")
      return `/api/media?url=${encodeURIComponent(fileUrl)}`;
  } catch {
    // Keep non-URL values unchanged so the UI can still show the fallback.
  }
  return fileUrl;
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
        images: item.media.map((media) => getImageUrl(media.fileUrl)),
        posts: item.socialPosts.map((post) => ({
          id: post.id,
          platform: post.platform,
          content: post.content,
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
