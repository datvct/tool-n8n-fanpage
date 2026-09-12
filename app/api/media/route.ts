import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getDriveId(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com") return null;
    return (
      url.searchParams.get("id") ||
      url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ||
      null
    );
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");
  const fileId = sourceUrl ? getDriveId(sourceUrl) : null;
  if (!fileId)
    return NextResponse.json(
      { error: "URL Google Drive không hợp lệ." },
      { status: 400 },
    );

  try {
    const response = await fetch(
      `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
      { redirect: "follow", cache: "no-store" },
    );
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/"))
      return NextResponse.json(
        { error: "File Drive không public hoặc không phải file ảnh." },
        { status: 404 },
      );

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Failed to proxy Google Drive image", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh từ Google Drive." },
      { status: 502 },
    );
  }
}
