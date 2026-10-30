"use client";

import { useState } from "react";
import { Layers3, Plus, X } from "lucide-react";
import type { Platform, PostType } from "@/lib/content-types";
import { platformLabels, postTypeLabels } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";

const allPlatforms: Platform[] = ["facebook", "linkedin", "youtube", "tiktok"];

function defaultType(platform: Platform, hasVideo: boolean): PostType {
  if (platform === "facebook") return hasVideo ? "facebook_reel" : "post";
  if (platform === "youtube") return "youtube_short";
  if (platform === "tiktok") return "tiktok_video";
  return "post";
}

function availableTypes(platform: Platform, hasVideo: boolean): PostType[] {
  if (platform === "facebook") return hasVideo ? ["facebook_reel", "post"] : ["post"];
  if (platform === "youtube") return hasVideo ? ["youtube_short", "youtube_video"] : [];
  if (platform === "tiktok") return hasVideo ? ["tiktok_video"] : [];
  return ["post"];
}

export function AddPlatformDialog({
  existingPlatforms,
  hasVideo,
  sourcePlatform,
  initialContent,
  onClose,
  onCreate,
}: {
  existingPlatforms: Platform[];
  hasVideo: boolean;
  sourcePlatform: Platform;
  initialContent: string;
  onClose: () => void;
  onCreate: (platform: Platform, postType: PostType, content: string) => Promise<void>;
}) {
  const choices = allPlatforms.filter((platform) =>
    !existingPlatforms.includes(platform) && availableTypes(platform, hasVideo).length > 0,
  );
  const [targetPlatform, setTargetPlatform] = useState<Platform | "">(choices[0] ?? "");
  const [postType, setPostType] = useState<PostType>(
    choices[0] ? defaultType(choices[0], hasVideo) : "post",
  );
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const types = targetPlatform ? availableTypes(targetPlatform, hasVideo) : [];

  async function submit() {
    if (!targetPlatform || !content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreate(targetPlatform, postType, content);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thêm nền tảng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className="confirm-modal add-platform-modal" role="dialog" aria-modal="true" aria-labelledby="add-platform-title">
        <div className="add-platform-heading">
          <div className="modal-icon approve-icon"><Layers3 size={20} /></div>
          <button className="icon-button" type="button" aria-label="Đóng" onClick={onClose} disabled={submitting}><X size={17} /></button>
        </div>
        <h2 id="add-platform-title">Thêm nền tảng đăng</h2>
        <p>Caption sẽ được sao chép từ tab {platformLabels[sourcePlatform]}. Bạn có thể chỉnh sửa riêng sau khi thêm. Media dùng chung từ nội dung gốc.</p>
        {choices.length ? (
          <div className="add-platform-fields">
            <label>
              Nền tảng
              <select
                value={targetPlatform}
                onChange={(event) => {
                  const next = event.target.value as Platform;
                  setTargetPlatform(next);
                  setPostType(defaultType(next, hasVideo));
                }}
              >
                {choices.map((platform) => <option value={platform} key={platform}>{platformLabels[platform]}</option>)}
              </select>
            </label>
            <label>
              Định dạng
              <select value={postType} onChange={(event) => setPostType(event.target.value as PostType)}>
                {types.map((type) => <option value={type} key={type}>{postTypeLabels[type]}</option>)}
              </select>
            </label>
            {targetPlatform && <div className="add-platform-note">
              <PlatformIcon platform={targetPlatform} size={17} />
              <span>Bài mới sẽ được tạo ở trạng thái bản nháp.</span>
            </div>}
          </div>
        ) : (
          <div className="add-platform-note">Nội dung này đã có đủ nền tảng khả dụng để đăng.</div>
        )}
        {error && <p className="modal-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Hủy</button>
          <button className="primary" onClick={submit} disabled={!choices.length || !content.trim() || submitting}>
            <Plus size={15} /> {submitting ? "Đang thêm..." : "Tạo bản nháp"}
          </button>
        </div>
      </section>
    </div>
  );
}
