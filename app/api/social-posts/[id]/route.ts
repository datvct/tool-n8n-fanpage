import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isTikTokOptions, validateTikTokPost, type TikTokOptions } from "@/lib/tiktok";

export const runtime = "nodejs";

type UpdateBody = {
  content?: string;
  status?: "draft" | "approved" | "scheduled";
  scheduledAt?: string | null;
  title?: string;
  description?: string;
  tiktokOptions?: TikTokOptions;
};

const VIETNAM_OFFSET = "+07:00";

function parseVietnamScheduledAt(value: string): Date {
  const normalized = value.trim().replace(" ", "T");
  const hasExplicitTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(
    hasExplicitTimezone ? normalized : `${normalized}${VIETNAM_OFFSET}`,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scheduledAt");
  }

  return date;
}

function formatVietnamScheduledAt(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as UpdateBody | null;

  if (
    !body ||
    (!body.content &&
      !body.status &&
      body.scheduledAt === undefined &&
      body.title === undefined &&
      body.description === undefined &&
      body.tiktokOptions === undefined)
  )
    return NextResponse.json(
      { success: false, error: "Không có dữ liệu cần cập nhật." },
      { status: 400 },
    );

  const data: {
    content?: string;
    status?: UpdateBody["status"];
    scheduledAt?: Date | null;
    title?: string;
    description?: string;
    tiktokOptions?: TikTokOptions;
    errorMessage?: string | null;
  } = {};
  if (body.tiktokOptions !== undefined) {
    if (!isTikTokOptions(body.tiktokOptions))
      return NextResponse.json({ success: false, error: "Cài đặt TikTok không hợp lệ." }, { status: 400 });
    data.tiktokOptions = body.tiktokOptions;
  }
  if (body.status && !["draft", "approved", "scheduled"].includes(body.status))
    return NextResponse.json({ success: false, error: "Trạng thái không hợp lệ." }, { status: 400 });
  if (body.content !== undefined) {
    if (!body.content.trim())
      return NextResponse.json(
        { success: false, error: "Nội dung không được để trống." },
        { status: 400 },
      );
    data.content = body.content;
  }
  if (body.status) {
    data.status = body.status;
    if (body.status === "draft" || body.status === "approved" || body.status === "scheduled")
      data.errorMessage = null;
  }
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description.trim();
  if (body.scheduledAt !== undefined) {
    if (!body.scheduledAt) {
      data.scheduledAt = null;
    } else {
      try {
        data.scheduledAt = parseVietnamScheduledAt(body.scheduledAt);
      } catch {
        return NextResponse.json(
          { success: false, error: "Thời gian lên lịch không hợp lệ." },
          { status: 400 },
        );
      }
    }
  }

  try {
    const current = await prisma.socialPost.findUnique({ where: { id }, include: { item: { include: { media: true } } } });
    if (!current)
      return NextResponse.json({ success: false, error: "Không tìm thấy bài đăng." }, { status: 404 });
    const hasContentChanges = body.content !== undefined || body.title !== undefined || body.description !== undefined || body.tiktokOptions !== undefined;
    if (["scheduled", "publishing", "published"].includes(current.status) && hasContentChanges)
      return NextResponse.json(
        { success: false, error: "Bài đã lên lịch hoặc đã đăng nên không thể sửa nội dung." },
        { status: 409 },
      );
    if (body.status === "scheduled" && !["approved", "failed"].includes(current.status))
      return NextResponse.json(
        { success: false, error: "Chỉ bài đã duyệt hoặc đăng lỗi mới có thể được lên lịch." },
        { status: 409 },
      );
    if (body.status === "approved" && !["draft", "failed", "approved"].includes(current.status))
      return NextResponse.json(
        { success: false, error: "Trạng thái hiện tại không thể chuyển sang đã duyệt." },
        { status: 409 },
      );
    if (body.status === "draft" && !["draft", "approved", "failed"].includes(current.status))
      return NextResponse.json(
        { success: false, error: "Bài đã lên lịch hoặc đã đăng không thể chuyển về bản nháp." },
        { status: 409 },
      );
    if (current.status === "scheduled" && body.status === "scheduled")
      return NextResponse.json(
        { success: false, error: "Bài đã có lịch đăng. Hãy hủy lịch cũ trước khi xếp lịch lại." },
        { status: 409 },
      );
    if (current.platform === "tiktok") {
      if (["published", "publishing", "scheduled"].includes(current.status))
        return NextResponse.json({ success: false, error: "Bài TikTok đã được gửi đăng; không thể sửa hoặc gửi lại." }, { status: 409 });
      if ((data.content ?? current.content).length > 2200)
        return NextResponse.json({ success: false, error: "Caption TikTok tối đa 2.200 ký tự." }, { status: 400 });
      if (body.status === "approved" || body.status === "scheduled") {
        const validationError = validateTikTokPost(data.content ?? current.content);
        if (validationError)
          return NextResponse.json({ success: false, error: validationError }, { status: 400 });
        const videos = current.item.media.filter((media) => media.mimeType?.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(media.fileName));
        if (videos.length !== 1)
          return NextResponse.json({ success: false, error: "Mỗi bài TikTok cần đúng một video." }, { status: 400 });
      }
      if (body.status === "scheduled" && current.status !== "approved")
        return NextResponse.json({ success: false, error: "Cần duyệt bài TikTok trước khi lên lịch." }, { status: 400 });
    }
    if (body.status === "scheduled") {
      const scheduledAt = data.scheduledAt === undefined ? current.scheduledAt : data.scheduledAt;
      if (!scheduledAt || scheduledAt <= new Date())
        return NextResponse.json({ success: false, error: "Vui lòng chọn thời gian đăng ở tương lai." }, { status: 400 });
      if (!process.env.N8N_PUBLISH_WEBHOOK_URL)
        return NextResponse.json({ success: false, error: "Chưa cấu hình URL scheduler của n8n." }, { status: 503 });
    }
    const post = await prisma.socialPost.update({ where: { id, ...(current.platform === "tiktok" ? { status: current.status } : {}) }, data });

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
      if (!webhookUrl) {
        console.error("N8N_PUBLISH_WEBHOOK_URL is not configured");
        return NextResponse.json(
          {
            success: false,
            error: "Chưa cấu hình URL scheduler của n8n.",
          },
          { status: 503 },
        );
      }

      if (scheduledPost) {
        let webhookResponse: Response;
        try {
          webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(webhookKey ? { "x-publish-key": webhookKey } : {}),
            },
            body: JSON.stringify({
              postId: post.id,
              scheduledAt: formatVietnamScheduledAt(post.scheduledAt),
              scheduledAtUtc: post.scheduledAt.toISOString(),
              platform: post.platform,
              postType: post.postType,
              content: post.content,
              title: post.title,
              description: post.description,
              tiktokOptions: post.tiktokOptions,
              employee: scheduledPost.item.employeeName,
              note: scheduledPost.item.originalNote,
              media: scheduledPost.item.media.map((media) => ({
                fileId: media.id,
                fileName: media.fileName,
                url: media.fileUrl,
                mimeType: media.mimeType,
              })),
              mediaUrls: scheduledPost.item.media.map((media) => media.fileUrl),
            }),
            signal: AbortSignal.timeout(15_000),
          });
        } catch (error) {
          console.error("n8n publish scheduler did not acknowledge request", error);
          await prisma.socialPost.updateMany({
            where: { id: post.id, status: "scheduled", scheduledAt: post.scheduledAt },
            data: { errorMessage: "Không nhận được xác nhận từ bộ lập lịch. Hãy kiểm tra n8n trước khi thử lại để tránh tạo lịch trùng." },
          });
          return NextResponse.json(
            { success: false, error: "Không nhận được xác nhận từ n8n. Hãy kiểm tra lịch trước khi thử lại." },
            { status: 502 },
          );
        }

        if (!webhookResponse.ok) {
          const responseText = await webhookResponse.text().catch(() => "");
          console.error("n8n publish scheduler rejected request", {
            status: webhookResponse.status,
            responseText,
            webhookUrl,
          });
          await prisma.socialPost.updateMany({
            where: { id: post.id, status: "scheduled", scheduledAt: post.scheduledAt },
            data: {
              status: current.status,
              scheduledAt: current.scheduledAt,
              errorMessage: current.errorMessage,
            },
          });
          return NextResponse.json(
            {
              success: false,
              error: `n8n scheduler từ chối yêu cầu (${webhookResponse.status}).`,
              details: responseText.slice(0, 500),
            },
            { status: 502 },
          );
        }
      }
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
      return NextResponse.json({ success: false, error: "Bài đăng vừa thay đổi trạng thái. Hãy tải lại nội dung." }, { status: 409 });
    console.error("Failed to update social post", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật bài đăng." },
      { status: 500 },
    );
  }
}
