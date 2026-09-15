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
  const kind = request.nextUrl.searchParams.get("kind") === "video" ? "video" : "image";
  const fileId = sourceUrl ? getDriveId(sourceUrl) : null;
  if (!fileId)
    return NextResponse.json(
      { error: "URL Google Drive không hợp lệ." },
      { status: 400 },
    );

  try {
    const response = await fetch(
      `https://drive.google.com/uc?export=${kind === "video" ? "download" : "view"}&confirm=t&id=${encodeURIComponent(fileId)}`,
      {
        redirect: "follow",
        cache: "no-store",
        headers: request.headers.get("range") ? { Range: request.headers.get("range")! } : undefined,
      },
    );
    const contentType = response.headers.get("content-type") || "";
    const isValidMedia = kind === "video"
      ? contentType.startsWith("video/") || contentType === "application/octet-stream" || contentType === "application/mp4"
      : contentType.startsWith("image/");
    if (!response.ok || !isValidMedia)
      return NextResponse.json(
        { error: `File Drive không public hoặc không phải file ${kind}.` },
        { status: 404 },
      );

    const headers = new Headers({
      "Content-Type": kind === "video" && !contentType.startsWith("video/") ? "video/mp4" : contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    });
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    if (contentLength) headers.set("Content-Length", contentLength);
    if (contentRange) headers.set("Content-Range", contentRange);
    return new NextResponse(kind === "video" ? response.body : await response.arrayBuffer(), {
      headers,
      status: response.status,
    });
  } catch (error) {
    console.error("Failed to proxy Google Drive image", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh từ Google Drive." },
      { status: 502 },
    );
  }
}
