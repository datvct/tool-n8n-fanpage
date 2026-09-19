import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function hasValidKey(request: NextRequest) {
  const expectedKey = process.env.N8N_IMPORT_API_KEY;
  return !expectedKey || request.headers.get("x-n8n-key") === expectedKey;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/catalog/publications/[id]">,
) {
  if (!hasValidKey(request)) {
    return NextResponse.json(
      { success: false, error: "Khóa tích hợp không hợp lệ." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
  } | null;
  const status = body?.status?.trim();

  if (!status || !["reserved", "generated", "failed"].includes(status)) {
    return NextResponse.json(
      { success: false, error: "Trạng thái publication không hợp lệ." },
      { status: 400 },
    );
  }

  const publication = await prisma.websiteProductPublication.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ success: true, data: publication });
}
