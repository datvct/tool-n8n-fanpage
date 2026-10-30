"use client";

import { Image as AntImage } from "antd";
import { Image as ImageIcon } from "lucide-react";
import type { ContentItem } from "@/lib/content-types";
import { isImageSource } from "@/app/content/ui/content-presentation";

export function ContentThumbnail({ content }: { content: ContentItem }) {
  const image = content.images[0];

  if (!image || !isImageSource(image)) {
    return (
      <span className="library-thumbnail-placeholder" aria-label="Không có ảnh xem trước">
        <ImageIcon size={17} />
      </span>
    );
  }

  return (
    <AntImage
      src={image}
      alt="Ảnh nội dung"
      preview={{ mask: "Xem ảnh" }}
      width={44}
      height={44}
    />
  );
}
