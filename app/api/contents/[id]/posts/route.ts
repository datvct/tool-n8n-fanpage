import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const platforms = ["facebook", "linkedin", "youtube", "tiktok"] as const;
const postTypes = [
  "post",
  "facebook_reel",
  "youtube_short",
  "youtube_video",
  "tiktok_video",
] as const;

type Platform = (typeof platforms)[number];
type PostType = (typeof postTypes)[number];
type CreatePostBody = {
  platform?: Platform;
  postType?: PostType;
  content?: string;
};

const allowedPostTypes: Record<Platform, readonly PostType[]> = {
  facebook: ["post", "facebook_reel"],
  linkedin: ["post"],
  youtube: ["youtube_short", "youtube_video"],
  tiktok: ["tiktok_video"],
};

function isVideo(fileName: string, mimeType: string | null) {
  return mimeType?.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(fileName);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ success: false, error: "Mã nội dung không hợp lệ." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as CreatePostBody | null;
  if (!body || !platforms.includes(body.platform as Platform) || !postTypes.includes(body.postType as PostType))
    return NextResponse.json({ success: false, error: "Nền tảng hoặc định dạng bài đăng không hợp lệ." }, { status: 400 });

  const platform = body.platform as Platform;
  const postType = body.postType as PostType;
  const content = body.content?.trim() ?? "";
  if (!content)
    return NextResponse.json({ success: false, error: "Nội dung bài đăng không được để trống." }, { status: 400 });
  if (!allowedPostTypes[platform].includes(postType))
    return NextResponse.json({ success: false, error: "Định dạng này không áp dụng cho nền tảng đã chọn." }, { status: 400 });

  try {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        media: { select: { fileName: true, mimeType: true } },
        socialPosts: { select: { platform: true } },
      },
    });
    if (!item)
      return NextResponse.json({ success: false, error: "Không tìm thấy nội dung gốc." }, { status: 404 });
    if (item.socialPosts.some((post) => post.platform === platform))
      return NextResponse.json({ success: false, error: "Nội dung đã có bài đăng trên nền tảng này." }, { status: 409 });

    const videoCount = item.media.filter((media) => isVideo(media.fileName, media.mimeType)).length;
    const needsVideo = postType !== "post";
    if (needsVideo && videoCount !== 1)
      return NextResponse.json({ success: false, error: "Định dạng video cần đúng một video đính kèm." }, { status: 400 });

    const post = await prisma.socialPost.create({
      data: {
        contentId: item.id,
        platform,
        postType,
        content,
        status: "draft",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        platform: post.platform,
        postType: post.postType,
        content: post.content,
        title: post.title ?? undefined,
        description: post.description ?? undefined,
        tiktokOptions: post.tiktokOptions,
        tiktokChannel: post.tiktokChannel,
        status: post.status,
        scheduledAt: post.scheduledAt?.toISOString(),
        publishedAt: post.publishedAt?.toISOString(),
        error: post.errorMessage ?? undefined,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ success: false, error: "Nền tảng này vừa được thêm vào nội dung." }, { status: 409 });
    console.error("Failed to create platform post", error);
    return NextResponse.json({ success: false, error: "Không thể thêm nền tảng đăng bài." }, { status: 500 });
  }
}
