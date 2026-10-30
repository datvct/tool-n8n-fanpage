"use client";

import { Image as AntImage } from "antd";
import { MoreHorizontal } from "lucide-react";
import type { ContentItem, Platform, SocialPost } from "@/lib/content-types";
import { isImageSource, isVideoSource, platformLabels, postTypeLabels } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";

export function SocialPostPreview({ content, platform, post, hasPost }: { content: ContentItem; platform: Platform; post: SocialPost; hasPost: boolean }) {
  return (
            <section className="preview-panel">
              <div className="preview-head">
                <div>
                  <h2>Xem trước</h2>
                  <p className="subtle">Hiển thị gần giống bài đăng thật</p>
                </div>
                <span className="preview-platform">
                  <PlatformIcon platform={platform} size={14} />
                  {hasPost
                    ? postTypeLabels[post.postType] || platformLabels[platform]
                    : platformLabels[platform]}
                </span>
              </div>
              <div className={`social-preview ${platform}`}>
                <div className="social-preview-head">
                  <div className="preview-avatar">
                    <img src="/images/logo.png" alt="EPCB" />
                  </div>
                  <div>
                    <strong>EPCB</strong>
                    <span>Vừa xong · 🌐</span>
                  </div>
                  <MoreHorizontal size={17} />
                </div>
                <div className="social-copy">
                  {hasPost
                    ? post.content
                    : `Chưa có nội dung ${platformLabels[platform]}.`}
                </div>
                <div
                  className={`preview-image ${content.videos.length ? "has-video" : ""}`}
                >
                  {content.videos.length ? (
                    <div className={`preview-video-wrap ${post.postType}`}>
                      <video
                        className="preview-video"
                        src={
                          isVideoSource(content.videos[0])
                            ? content.videos[0]
                            : undefined
                        }
                        controls
                        preload="metadata"
                        playsInline
                        aria-label={postTypeLabels[post.postType]}
                      />
                      <span className="video-type-chip">
                        {postTypeLabels[post.postType]}
                      </span>
                    </div>
                  ) : content.images.length ? (
                    <AntImage.PreviewGroup>
                      <div
                        className={`preview-images count-${Math.min(content.images.length, 3)}`}
                      >
                        {content.images.map((image) =>
                          isImageSource(image) ? (
                            <AntImage
                              key={image}
                              src={image}
                              alt="Ảnh bài đăng"
                              preview={{ mask: "Xem ảnh lớn" }}
                            />
                          ) : null,
                        )}
                      </div>
                    </AntImage.PreviewGroup>
                  ) : (
                    "Media bài đăng"
                  )}
                </div>
                {platform === "youtube" && hasPost && (
                  <div className="youtube-preview-copy">
                    <strong>{post.title || "Chưa có tiêu đề video"}</strong>
                    <p>{post.description || "Chưa có mô tả video"}</p>
                  </div>
                )}
                <div className="preview-actions">
                  <span>♡ Thích</span>
                  <span>◯ Bình luận</span>
                  <span>↗ Chia sẻ</span>
                </div>
              </div>
            </section>
  );
}
