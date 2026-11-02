import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json(
      { success: false, error: "Mã nội dung không hợp lệ." },
      { status: 400 },
    );

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the parent and posts so scheduling cannot race with deletion.
      const items = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM content_items WHERE id = ${id}::uuid FOR UPDATE
      `;
      if (!items.length) return "not_found";
      const posts = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM social_posts WHERE content_id = ${id}::uuid FOR UPDATE
      `;
      // Drafts and failed posts can be cleaned up. Keep active or published posts safe.
      const deletableStatuses = new Set(["draft", "failed"]);
      if (posts.some((post) => !deletableStatuses.has(post.status)))
        return "not_draft";

      // Keep the catalog history, but remove its reference to deleted content.
      await tx.websiteProductPublication.updateMany({
        where: { contentId: id },
        data: { contentId: null },
      });
      // Schema cascades to social posts, media records, versions and publish logs.
      await tx.contentItem.delete({ where: { id } });
      return "deleted";
    });

    if (result === "not_found")
      return NextResponse.json(
        { success: false, error: "Nội dung không tồn tại hoặc đã được xoá." },
        { status: 404 },
      );
    if (result === "not_draft")
      return NextResponse.json(
        {
          success: false,
          error: "Chỉ có thể xoá nội dung khi tất cả bài đều là bản nháp hoặc thất bại. Bài đã duyệt, lên lịch, đang đăng hoặc đã đăng không thể xoá.",
        },
        { status: 409 },
      );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete content", error);
    return NextResponse.json(
      { success: false, error: "Không thể xoá nội dung. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}

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

function toUiStatus(status: string) {
  if (status === "publishing") return "scheduled";
  if (status === "cancelled") return "failed";
  return status;
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
          tiktokOptions: post.tiktokOptions,
          tiktokChannel: post.tiktokChannel,
        status: toUiStatus(post.status),
        scheduledAt: post.scheduledAt?.toISOString(),
        publishedAt: post.publishedAt?.toISOString(),
        error: post.errorMessage ?? undefined,
      })),
    },
  });
}
