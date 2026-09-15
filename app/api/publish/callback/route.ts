import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type CallbackBody = {
  postId?: string;
  platform?: "facebook" | "linkedin" | "youtube";
  status?: "published" | "failed";
  externalPostId?: string;
  errorMessage?: string;
  request?: unknown;
  response?: unknown;
};

function toJsonValue(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.N8N_PUBLISH_CALLBACK_KEY;
  if (expectedKey && request.headers.get("x-publish-key") !== expectedKey)
    return NextResponse.json(
      { success: false, error: "Khóa callback không hợp lệ." },
      { status: 401 },
    );

  const body = (await request.json().catch(() => null)) as CallbackBody | null;
  if (!body?.postId || !body.status)
    return NextResponse.json(
      { success: false, error: "Thiếu postId hoặc status." },
      { status: 400 },
    );
  const callbackStatus = body.status;

  try {
    const post = await prisma.$transaction(async (tx) => {
      const current = await tx.socialPost.findUnique({
        where: { id: body.postId },
      });
      if (!current) throw new Error("POST_NOT_FOUND");

      const updated = await tx.socialPost.update({
        where: { id: body.postId },
        data:
          body.status === "published"
            ? {
                status: "published",
                publishedAt: new Date(),
                externalPostId: body.externalPostId || current.externalPostId,
                errorMessage: null,
              }
            : {
                status: "failed",
                errorMessage: body.errorMessage || "Publish failed",
                retryCount: { increment: 1 },
              },
      });

      await tx.publishLog.create({
        data: {
          socialPostId: updated.id,
          platform: body.platform || updated.platform,
          status: callbackStatus,
          request: toJsonValue(body.request),
          response: toJsonValue(body.response),
          errorMessage: body.errorMessage || null,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND")
      return NextResponse.json(
        { success: false, error: "Không tìm thấy bài đăng." },
        { status: 404 },
      );
    console.error("Failed to process publish callback", error);
    return NextResponse.json(
      { success: false, error: "Không thể cập nhật trạng thái publish." },
      { status: 500 },
    );
  }
}
