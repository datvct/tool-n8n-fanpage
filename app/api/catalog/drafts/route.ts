import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type DraftBody = {
  publicationId?: string;
  facebookContent?: string;
  linkedinContent?: string;
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

export async function POST(request: NextRequest) {
  if (!hasValidKey(request)) {
    return errorResponse("UNAUTHORIZED", "Khóa tích hợp không hợp lệ.", 401);
  }

  const body = (await request.json().catch(() => null)) as DraftBody | null;
  const publicationId = body?.publicationId?.trim();
  const facebookContent = body?.facebookContent?.trim() || "";
  const linkedinContent = body?.linkedinContent?.trim() || "";

  if (!publicationId) {
    return errorResponse("INVALID_INPUT", "Thiếu publicationId.");
  }
  if (!facebookContent && !linkedinContent) {
    return errorResponse("EMPTY_CONTENT", "AI chưa tạo được nội dung.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const publication = await tx.websiteProductPublication.findUnique({
        where: { id: publicationId },
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" } } } },
        },
      });

      if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
      if (publication.contentId) throw new Error("DRAFT_ALREADY_CREATED");

      const product = publication.product;
      const selectedImageUrls = Array.isArray(publication.selectedImageUrls)
        ? publication.selectedImageUrls.filter(
            (url): url is string => typeof url === "string" && Boolean(url),
          )
        : publication.selectedImageUrl
          ? [publication.selectedImageUrl]
          : [];
      const selectedImages = selectedImageUrls.length
        ? product.images.filter((image) => selectedImageUrls.includes(image.imageUrl))
        : product.images.slice(0, 3);
      const imagesForDraft = selectedImages.slice(0, 3);

      const media = imagesForDraft.map((image, index) => ({
        fileName: `${product.productName}-${index + 1}`.slice(0, 255),
        fileUrl: image.imageUrl,
        storageType: "cloudinary" as const,
        mimeType: "image/*",
        sortOrder: image.sortOrder,
      }));

      const content = await tx.contentItem.create({
        data: {
          source: "website_product",
          sourceRowId: publication.id,
          employeeName: "Website EPCB",
          originalNote: [
            `Nguồn sản phẩm: ${product.canonicalUrl}`,
            product.description,
            product.specifications,
          ]
            .filter(Boolean)
            .join("\n\n"),
          status: "draft",
          media: media.length ? { create: media } : undefined,
          socialPosts: {
            create: [
              ...(facebookContent
                ? [
                    {
                      platform: "facebook" as const,
                      postType: "post" as const,
                      content: facebookContent,
                    },
                  ]
                : []),
              ...(linkedinContent
                ? [
                    {
                      platform: "linkedin" as const,
                      postType: "post" as const,
                      content: linkedinContent,
                    },
                  ]
                : []),
            ],
          },
        },
        include: { socialPosts: true, media: true },
      });

      await tx.websiteProductPublication.update({
        where: { id: publication.id },
        data: {
          status: "generated",
          contentId: content.id,
          generatedAt: new Date(),
        },
      });

      return { publicationId: publication.id, content };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLICATION_NOT_FOUND") {
      return errorResponse("NOT_FOUND", "Không tìm thấy publication.", 404);
    }
    if (error instanceof Error && error.message === "DRAFT_ALREADY_CREATED") {
      return errorResponse("DUPLICATE_DRAFT", "Publication này đã tạo draft.", 409);
    }

    console.error("Failed to create website product draft", error);
    return errorResponse("DATABASE_ERROR", "Không thể lưu draft sản phẩm.", 500);
  }
}
