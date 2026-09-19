import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

function hasValidKey(request: NextRequest) {
  const expectedKey = process.env.N8N_IMPORT_API_KEY;
  return !expectedKey || request.headers.get("x-n8n-key") === expectedKey;
}

const requiredTables = [
  "website_products",
  "website_product_images",
  "website_product_publications",
] as const;

async function findMissingTables() {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (${Prisma.join(requiredTables)})
  `;

  const existingTables = new Set(rows.map((row) => row.table_name));
  return requiredTables.filter((table) => !existingTables.has(table));
}

export async function POST(request: NextRequest) {
  if (!hasValidKey(request)) {
    return errorResponse("UNAUTHORIZED", "Khóa tích hợp không hợp lệ.", 401);
  }

  try {
    const missingTables = await findMissingTables();
    if (missingTables.length > 0) {
      console.error("Catalog database schema is incomplete", { missingTables });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_SCHEMA_MISSING",
            message: "Database chưa có đủ bảng catalog.",
            missingTables,
          },
        },
        { status: 503 },
      );
    }

    const reserved = await prisma.$transaction(async (tx) => {
      const products = await tx.websiteProduct.findMany({
        where: {
          isActive: true,
          publications: {
            every: { status: "failed" },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 1000,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          publications: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      const product = products[Math.floor(Math.random() * products.length)];

      if (!product) return null;

      const selectedImageUrls = product.images
        .map((image) => image.imageUrl)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const selectedImageUrl = selectedImageUrls[0] || null;

      const previousPublication = product.publications[0];
      const publication = previousPublication
        ? await tx.websiteProductPublication.update({
            where: { id: previousPublication.id },
            data: {
              selectedImageUrl,
              selectedImageUrls,
              status: "reserved",
              contentId: null,
              generatedAt: null,
              reservedAt: new Date(),
            },
          })
        : await tx.websiteProductPublication.create({
            data: {
              productId: product.id,
              selectedImageUrl,
              selectedImageUrls,
              status: "reserved",
            },
          });

      return { product, publication };
    });

    if (!reserved) {
      return errorResponse(
        "NO_PRODUCT",
        "Không còn sản phẩm chưa được tạo draft.",
        404,
      );
    }

    return NextResponse.json({ success: true, data: reserved });
  } catch (error) {
    console.error("Failed to reserve website product", {
      error,
      requiredTables,
    });
    return errorResponse("DATABASE_ERROR", "Không thể reserve sản phẩm.", 500);
  }
}
