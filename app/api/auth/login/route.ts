import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;
  if (!configuredPassword)
    return NextResponse.json(
      { success: false, error: "APP_ACCESS_PASSWORD chưa được cấu hình." },
      { status: 500 },
    );

  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;
  if (!body?.password || body.password !== configuredPassword)
    return NextResponse.json(
      { success: false, error: "Mật khẩu không đúng." },
      { status: 401 },
    );

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    getSessionCookieName(),
    await createSessionToken(),
    getSessionCookieOptions(),
  );
  return response;
}
