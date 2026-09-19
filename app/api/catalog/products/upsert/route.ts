import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ImageInput = {
  url?: string;
  alt?: string;
  sortOrder?: number;
};

type ProductInput = {
  sourceUrl?: string;
  canonicalUrl?: string;
  productName?: string;
  title?: string;
  description?: string;
  specifications?: string;
  category?: string;
  images?: ImageInput[];
};

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

function normalizeImages(images: ImageInput[] | undefined, title: string) {
  const seen = new Set<string>();

  return (Array.isArray(images) ? images : [])
    .map((image, index) => ({
      imageUrl: String(image?.url || "").trim(),
      altText: String(image?.alt || title).trim() || null,
      sortOrder: Number.isInteger(image?.sortOrder)
        ? Number(image.sortOrder)
        : index,
    }))
    .filter((image) => {
      if (!/^https?:\/\//i.test(image.imageUrl) || seen.has(image.imageUrl)) {
        return false;
      }
      seen.add(image.imageUrl);
      return true;
    })
    .slice(0, 30);
}

function createContentHash(product: {
  sourceUrl: string;
  canonicalUrl: string;
  productName: string;
  description: string;
  specifications: string;
  category: string;
  images: { imageUrl: string; altText: string | null; sortOrder: number }[];
}) {
  return createHash("sha256")
    .update(JSON.stringify(product))
    .digest("hex");
}

function serializeProduct(product: {
  id: string;
  sourceUrl: string;
  canonicalUrl: string;
  productName: string;
  description: string;
  specifications: string | null;
  category: string | null;
  contentHash: string;
  isActive: boolean;
  crawledAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
  images: {
    id: string;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
  }[];
}) {
  return {
    id: product.id,
    sourceUrl: product.sourceUrl,
    canonicalUrl: product.canonicalUrl,
    productName: product.productName,
    description: product.description,
    specifications: product.specifications || "",
    category: product.category || "",
    contentHash: product.contentHash,
    isActive: product.isActive,
    crawledAt: product.crawledAt.toISOString(),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt?.toISOString() || null,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.imageUrl,
      alt: image.altText || "",
      sortOrder: image.sortOrder,
    })),
  };
}

export async function POST(request: NextRequest) {
  if (!hasValidKey(request)) {
    return errorResponse("UNAUTHORIZED", "Khóa tích hợp không hợp lệ.", 401);
  }

  let body: ProductInput;
  try {
    body = (await request.json()) as ProductInput;
  } catch {
    return errorResponse("INVALID_JSON", "Dữ liệu JSON không hợp lệ.");
  }

  const sourceUrl = String(body.sourceUrl || "").trim();
  const canonicalUrl = String(body.canonicalUrl || sourceUrl).trim();
  const productName = String(body.productName || body.title || "").trim();
  const description = String(body.description || "").trim();
  const specifications = String(body.specifications || "").trim();
  const category = String(body.category || "").trim();

  if (!/^https?:\/\//i.test(canonicalUrl)) {
    return errorResponse("INVALID_URL", "canonicalUrl phải là URL hợp lệ.");
  }
  if (!productName) {
    return errorResponse("INVALID_TITLE", "Thiếu tiêu đề sản phẩm.");
  }

  const images = normalizeImages(body.images, productName);
  const productFields = {
    sourceUrl: sourceUrl || canonicalUrl,
    canonicalUrl,
    productName,
    description,
    specifications,
    category,
  };
  const contentHash = createContentHash({ ...productFields, images });
  const now = new Date();

  try {
    const existing = await prisma.websiteProduct.findFirst({
      where: { canonicalUrl },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    const product = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.websiteProduct.update({
            where: { id: existing.id },
            data: {
              ...productFields,
              contentHash,
              isActive: true,
              crawledAt: now,
              updatedAt: now,
            },
          })
        : await tx.websiteProduct.create({
            data: {
              ...productFields,
              contentHash,
              isActive: true,
              crawledAt: now,
              createdAt: now,
              updatedAt: now,
            },
          });

      await tx.websiteProductImage.deleteMany({
        where: { productId: saved.id },
      });

      if (images.length) {
        await tx.websiteProductImage.createMany({
          data: images.map((image) => ({
            ...image,
            productId: saved.id,
            createdAt: now,
          })),
        });
      }

      return tx.websiteProduct.findUniqueOrThrow({
        where: { id: saved.id },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json({
      success: true,
      created: !existing,
      updated: Boolean(existing),
      data: serializeProduct(product),
    });
  } catch (error) {
    console.error("Failed to upsert website product", error);
    return errorResponse(
      "DATABASE_ERROR",
      "Không thể lưu sản phẩm vào website_products.",
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidKey(request)) {
    return errorResponse("UNAUTHORIZED", "Khóa tích hợp không hợp lệ.", 401);
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || 50), 1),
    100,
  );

  const products = await prisma.websiteProduct.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "asc" },
    take: limit,
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({
    success: true,
    data: products.map(serializeProduct),
  });
}
