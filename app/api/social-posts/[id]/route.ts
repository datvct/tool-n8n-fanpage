import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type UpdateBody = {
  content?: string;
  status?: "draft" | "approved" | "scheduled";
  scheduledAt?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as UpdateBody | null;

  if (!body || (!body.content && !body.status && body.scheduledAt === undefined))
    return NextResponse.json(
      { success: false, error: "Không có dữ liệu cần cập nhật." },
      { status: 400 },
    );

  const data: {
    content?: string;
    status?: UpdateBody["status"];
    scheduledAt?: Date | null;
  } = {};
  if (body.content !== undefined) {
    if (!body.content.trim())
      return NextResponse.json(
        { success: false, error: "Nội dung không được để trống." },
        { status: 400 },
      );
    data.content = body.content;
  }
  if (body.status) data.status = body.status;
  if (body.scheduledAt !== undefined) {
    data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (data.scheduledAt && Number.isNaN(data.scheduledAt.getTime()))
      return NextResponse.json(
        { success: false, error: "Thời gian lên lịch không hợp lệ." },
        { status: 400 },
      );
  }

  try {
    const post = await prisma.socialPost.update({ where: { id }, data });

    if (body.status === "scheduled" && post.scheduledAt) {
      const scheduledPost = await prisma.socialPost.findUnique({
        where: { id: post.id },
        include: {
          item: {
            include: {
              media: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      });
      const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK_URL;
      const webhookKey = process.env.N8N_PUBLISH_WEBHOOK_KEY;
      if (webhookUrl && scheduledPost) {
        void fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(webhookKey ? { "x-publish-key": webhookKey } : {}),
          },
          body: JSON.stringify({
            postId: post.id,
            scheduledAt: post.scheduledAt.toISOString(),
            platform: post.platform,
            content: post.content,
            employee: scheduledPost.item.employeeName,
            note: scheduledPost.item.originalNote,
            media: scheduledPost.item.media.map((media) => ({
              fileId: media.id,
              fileName: media.fileName,
              url: media.fileUrl,
            })),
            mediaUrls: scheduledPost.item.media.map((media) => media.fileUrl),
          }),
        }).catch((error) => console.error("Failed to notify n8n publish webhook", error));
      }
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error("Failed to update social post", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật bài đăng." },
      { status: 500 },
    );
  }
}
