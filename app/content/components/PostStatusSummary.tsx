"use client";

import { CalendarClock, CircleAlert, CircleCheck, FileText } from "lucide-react";
import type { Platform, SocialPost } from "@/lib/content-types";
import { formatVietnamDateTime, platformLabels, statusLabels } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";

export function PostStatusSummary({ post, platform, hasPost }: { post: SocialPost; platform: Platform; hasPost: boolean }) {
  const status = hasPost ? post.status : "draft";
  const StatusIcon = status === "published" ? CircleCheck : status === "failed" ? CircleAlert : status === "scheduled" ? CalendarClock : FileText;
  return (
          <section className={`editor-status-banner ${status}`}>
            <div className="editor-status-icon">
              <StatusIcon size={19} />
            </div>
            <div className="editor-status-copy">
              <span>TRẠNG THÁI {platformLabels[platform].toUpperCase()}</span>
              <strong>
                {hasPost ? statusLabels[status] : "Chưa có nội dung"}
              </strong>
              <p>
                {status === "scheduled" && post.error
                  ? post.error
                  : status === "scheduled" && post.scheduledAt
                    ? `Đã lên lịch đăng lúc ${formatVietnamDateTime(post.scheduledAt)}`
                  : status === "published"
                    ? "Nội dung đã được đăng thành công trên nền tảng này."
                    : status === "failed"
                      ? post.error ||
                        "Nội dung đăng thất bại, cần kiểm tra và thử lại."
                      : status === "approved"
                        ? "Nội dung đã được duyệt và sẵn sàng lên lịch."
                        : "Nội dung đang ở chế độ chỉnh sửa."}
              </p>
            </div>
            <span className="editor-status-platform">
              <PlatformIcon platform={platform} />
              {platformLabels[platform]}
            </span>
          </section>
  );
}
