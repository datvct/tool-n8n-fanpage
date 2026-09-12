import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function imageUrl(fileUrl: string) {
  try {
    const url = new URL(fileUrl);
    if (url.hostname === "drive.google.com")
      return `/api/media?url=${encodeURIComponent(fileUrl)}`;
  } catch {
    // Keep legacy values unchanged.
  }
  return fileUrl;
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
      images: item.media.map((media) => imageUrl(media.fileUrl)),
      posts: item.socialPosts.map((post) => ({
        id: post.id,
        platform: post.platform,
        content: post.content,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString(),
        error: post.errorMessage ?? undefined,
      })),
    },
  });
}
