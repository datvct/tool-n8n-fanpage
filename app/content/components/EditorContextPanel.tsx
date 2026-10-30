"use client";

import { Image as AntImage } from "antd";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon } from "lucide-react";
import type { ContentItem } from "@/lib/content-types";
import { isImageSource, isVideoSource } from "@/app/content/ui/content-presentation";

function cleanFormText(value: string) {
  return value
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function EditorContextPanel({ content }: { content: ContentItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
        <aside className="editor-context">
          <section className="context-section context-job-summary">
            <div className="context-heading">
              <FileText size={16} />
              <span>Thông tin công việc</span>
              <button
                className="context-expand"
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? "Thu gọn" : "Xem đầy đủ"}
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <div className={`context-note${expanded ? " expanded" : ""}`}>
              {cleanFormText(content.note)}
            </div>
          </section>
          <section className="context-section context-media-section">
            <div className="context-heading">
              <ImageIcon size={16} />
              <span>Media đính kèm</span>
              <small>
                {content.images.length} ảnh
                {content.videos.length
                  ? ` · ${content.videos.length} video`
                  : ""}
              </small>
            </div>
            <div className="context-images">
              <AntImage.PreviewGroup>
                {content.images.map((image) => (
                  <div className="context-image" key={image}>
                    {isImageSource(image) ? (
                      <AntImage
                        src={image}
                        alt="Ảnh công việc"
                        preview={{ mask: "Xem ảnh lớn" }}
                        width="100%"
                        height="100%"
                      />
                    ) : (
                      image
                    )}
                  </div>
                ))}
              </AntImage.PreviewGroup>
            </div>
            {content.videos.length > 0 && (
              <div className="context-videos">
                {content.videos.map((video) => (
                  <video
                    className="context-video"
                    key={video}
                    src={isVideoSource(video) ? video : undefined}
                    controls
                    preload="metadata"
                    aria-label="Video đính kèm"
                  />
                ))}
              </div>
            )}
          </section>
          <section className="context-section context-meta">
            <div>
              <span>Nguồn dữ liệu</span>
              <strong>Google Form</strong>
            </div>
            <div>
              <span>Người gửi</span>
              <strong>{content.employee}</strong>
            </div>
            <div>
              <span>Múi giờ</span>
              <strong>Asia/Ho_Chi_Minh</strong>
            </div>
          </section>
        </aside>
  );
}
