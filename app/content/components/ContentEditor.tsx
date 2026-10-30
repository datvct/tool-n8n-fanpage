"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TikTokPostOptions from "@/app/content/TikTokPostOptions";
import DeleteContentButton from "@/app/content/DeleteContentButton";
import { validateTikTokPost } from "@/lib/tiktok";
import type { ContentItem, Platform, PostType, SocialPost } from "@/lib/content-types";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  getContentTitle,
  platformLabels,
  postTypeLabels,
} from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";
import { EditorContextPanel } from "@/app/content/components/EditorContextPanel";
import { PostStatusSummary } from "@/app/content/components/PostStatusSummary";
import { SocialPostPreview } from "@/app/content/components/SocialPostPreview";
import { EditorActionDialog } from "@/app/content/components/EditorActionDialog";
import { PostWorkflow } from "@/app/content/components/PostWorkflow";
import { AddPlatformDialog } from "@/app/content/components/AddPlatformDialog";

export function ContentEditor({
  selected,
  platform,
  setPlatform,
  onBack,
  onDeleted,
  updatePost,
  approvePost,
  schedulePost,
  createPlatformPost,
}: {
  selected: ContentItem;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  onBack: () => void;
  onDeleted: (id: string) => void;
  updatePost: (
    contentId: string,
    postId: string,
    update: Partial<SocialPost>,
  ) => Promise<boolean>;
  approvePost: () => void;
  schedulePost: (scheduledAt: string) => void;
  createPlatformPost: (
    contentId: string,
    platform: Platform,
    postType: PostType,
    content: string,
  ) => Promise<void>;
}) {
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveSequence = useRef(0);
  const postBodyRef = useRef<HTMLTextAreaElement>(null);
  const post = selected.posts.find((item) => item.platform === platform) ?? {
    id: "",
    platform,
    postType: "post" as const,
    content: "",
    status: "draft" as const,
  };
  const hasPost = Boolean(post.id);
  const editedStatus = post.status === "approved" || post.status === "failed"
    ? "draft"
    : post.status;
  const tiktokValidationError = post.platform === "tiktok"
    ? selected.videos.length !== 1 ? "Mỗi bài TikTok cần đúng một video." : validateTikTokPost(post.content, post.tiktokOptions)
    : null;
  const [modal, setModal] = useState<"approve" | "schedule" | null>(null);
  const [showAddPlatform, setShowAddPlatform] = useState(false);

  useEffect(() => {
    saveSequence.current += 1;
    setSaveState("idle");
  }, [selected.id, platform]);

  useLayoutEffect(() => {
    const textarea = postBodyRef.current;
    if (!textarea) return;

    const fitContent = () => {
      textarea.style.height = "0px";
      const maxHeight = 420;
      const height = Math.min(Math.max(textarea.scrollHeight, 180), maxHeight);
      textarea.style.height = `${height}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    fitContent();
    window.addEventListener("resize", fitContent);
    return () => window.removeEventListener("resize", fitContent);
  }, [post.content, platform, hasPost]);

  async function saveChanges(update: Partial<SocialPost>) {
    if (!hasPost) return;
    const sequence = ++saveSequence.current;
    setSaveState("saving");
    const succeeded = await updatePost(selected.id, post.id, update);
    if (sequence === saveSequence.current) setSaveState(succeeded ? "saved" : "error");
  }
  return (
    <section className="inline-editor">
      <header className="inline-editor-toolbar">
        <button className="editor-back" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <DeleteContentButton content={selected} title={getContentTitle(selected)} onDeleted={onDeleted} />
      </header>
      <div className="inline-editor-layout">
        <EditorContextPanel content={selected} />
        <section className="editor-workspace">
          <PostWorkflow status={post.status} hasPost={hasPost} />
          <PostStatusSummary post={post} platform={platform} hasPost={hasPost} />
          <div className="platform-bar">
            <div>
              <span className="workspace-label-light">NỀN TẢNG ĐĂNG</span>
              <div className="platform-tabs">
                {(["facebook", "linkedin", "youtube", "tiktok"] as Platform[]).map(
                  (item) => (
                    <button
                      className={platform === item ? "active" : ""}
                      key={item}
                      disabled={
                        !selected.posts.some((post) => post.platform === item)
                      }
                      title={
                        selected.posts.some((post) => post.platform === item)
                          ? undefined
                          : `Chưa có nội dung ${platformLabels[item]}`
                      }
                      onClick={() => setPlatform(item)}
                    >
                      <PlatformIcon platform={item} size={15} /> {platformLabels[item]}
                    </button>
                  ),
                )}
                <button
                  className="add-platform-button"
                  onClick={() => setShowAddPlatform(true)}
                  disabled={selected.posts.length >= 4}
                  title={selected.posts.length >= 4 ? "Đã có đủ nền tảng" : "Thêm một nền tảng cho nội dung này"}
                >
                  <Plus size={14} /> Thêm nền tảng
                </button>
              </div>
            </div>
            <div className="editor-tools">
              <span className="character-count">
                {post.platform === "tiktok" ? `${post.content.length}/2200 ký tự` : `${post.content.length} ký tự`}
              </span>
            </div>
          </div>
          <div className="mobile-editor-switch" role="tablist" aria-label="Chế độ biên tập">
            <button role="tab" aria-selected={mobileView === "edit"} className={mobileView === "edit" ? "active" : ""} onClick={() => setMobileView("edit")}>Soạn nội dung</button>
            <button role="tab" aria-selected={mobileView === "preview"} className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>Xem trước</button>
          </div>
          <div className="writing-grid" data-mobile-view={mobileView}>
            <section className="writing-panel">
              <div className="writing-panel-head">
                <div>
                  <h2>Nội dung bài đăng</h2>
                  <p className="subtle">
                    Bạn có thể chỉnh sửa nội dung AI trước khi duyệt.
                  </p>
                </div>
                <span className="ai-tag">AI đã tạo</span>
              </div>
              {hasPost && post.platform === "tiktok" && (
                <TikTokPostOptions
                  value={post.tiktokOptions}
                  disabled={post.status === "published" || post.status === "scheduled"}
                  onChange={(tiktokOptions) => void saveChanges({
                    tiktokOptions,
                    status: editedStatus,
                  })}
                />
              )}
              {hasPost && post.platform === "youtube" && (
                <div className="video-copy-fields">
                  <label>
                    <span>
                      {post.postType === "youtube_short"
                        ? "Tiêu đề YouTube Short"
                        : "Tiêu đề video thường"}
                    </span>
                    <input
                      className="video-title-input"
                      value={post.title ?? ""}
                      maxLength={100}
                      disabled={post.status === "published" || post.status === "scheduled"}
                      placeholder="Nhập tiêu đề video"
                      onChange={(event) =>
                        void saveChanges({
                          title: event.target.value,
                          status: editedStatus,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Mô tả video</span>
                    <textarea
                      className="video-description-input"
                      value={post.description ?? ""}
                      rows={4}
                      disabled={post.status === "published" || post.status === "scheduled"}
                      placeholder="Nhập mô tả video"
                      onChange={(event) =>
                        void saveChanges({
                          description: event.target.value,
                          status: editedStatus,
                        })
                      }
                    />
                  </label>
                </div>
              )}
              <textarea
                id="post-body"
                ref={postBodyRef}
                className="pro-textarea"
                aria-label={`Nội dung bài đăng ${platformLabels[platform]}`}
                aria-describedby="post-body-help"
                maxLength={post.platform === "tiktok" ? 2200 : undefined}
                value={post.content}
                disabled={!hasPost || post.status === "published" || post.status === "scheduled"}
                onChange={(event) =>
                  void saveChanges({
                    content: event.target.value,
                    status: editedStatus,
                  })
                }
              />
              <div className="writing-footer">
                <span id="post-body-help">Tự động lưu sau mỗi thay đổi.</span>
                <span className={`save-indicator ${saveState}`} role="status" aria-live="polite">
                  {saveState === "saving" && <><RefreshCw size={14} className="spin" /> Đang lưu</>}
                  {saveState === "saved" && <><Check size={14} /> Đã lưu</>}
                  {saveState === "error" && <>Lưu chưa thành công · hãy kiểm tra kết nối rồi thử lại</>}
                </span>
              </div>
            </section>
            <SocialPostPreview content={selected} platform={platform} post={post} hasPost={hasPost} />
          </div>
          <div className="editor-action-bar">
            <div>
              {tiktokValidationError && <span role="status">{tiktokValidationError}</span>}
            </div>
            <div className="action-buttons">
              {(post.status === "draft" || post.status === "failed") && (
                <button
                  className="secondary"
                  onClick={() => setModal("approve")}
                  disabled={!hasPost || !post.content.trim() || Boolean(tiktokValidationError)}
                  title={tiktokValidationError || undefined}
                >
                  <Check size={15} /> {post.status === "failed" ? "Duyệt lại" : "Duyệt bài"}
                </button>
              )}
              <button
                className="primary"
                onClick={() => setModal("schedule")}
                disabled={!hasPost || post.status !== "approved" || Boolean(tiktokValidationError)}
              >
                <CalendarClock size={15} /> Lên lịch đăng
              </button>
            </div>
          </div>
          {modal && <EditorActionDialog
            mode={modal}
            platform={platform}
            onClose={() => setModal(null)}
            onApprove={() => { approvePost(); setModal(null); }}
            onSchedule={(scheduledAt) => { schedulePost(scheduledAt); setModal(null); }}
          />}
          {showAddPlatform && <AddPlatformDialog
            existingPlatforms={selected.posts.map((item) => item.platform)}
            hasVideo={selected.videos.length > 0}
            sourcePlatform={platform}
            initialContent={post.content}
            onClose={() => setShowAddPlatform(false)}
            onCreate={async (targetPlatform, postType, content) => {
              await createPlatformPost(selected.id, targetPlatform, postType, content);
              setPlatform(targetPlatform);
            }}
          />}
        </section>
      </div>
    </section>
  );
}
