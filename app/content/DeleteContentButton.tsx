"use client";

import { useRef, useState } from "react";
import { Modal } from "antd";
import { Trash2 } from "lucide-react";
import type { ContentItem } from "@/lib/content-types";

export default function DeleteContentButton({ content, title, onDeleted }: {
  content: ContentItem;
  title: string;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const deletableStatuses = new Set(["draft", "failed"]);
  const blocked = content.posts.some((post) => !deletableStatuses.has(post.status));

  async function confirmDelete() {
    if (submitting.current || blocked) return;
    submitting.current = true;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/contents/${content.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      // Another open tab may already have removed this content.
      if (response.status !== 404 && (!response.ok || !result?.success))
        throw new Error(result?.error || "Không thể xoá nội dung. Vui lòng thử lại.");
      setOpen(false);
      onDeleted(content.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kết nối để xoá nội dung.");
    } finally {
      submitting.current = false;
      setDeleting(false);
    }
  }

  return (
    <span
      className="delete-content-control"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      title={blocked ? "Không thể xoá nội dung có bài đã duyệt, lên lịch hoặc đã đăng." : undefined}
    >
      <button
        type="button"
        className="secondary delete-content-button"
        disabled={blocked || deleting}
        aria-label={`Xoá nội dung: ${title}`}
        title={blocked ? "Không thể xoá nội dung có bài đã duyệt, lên lịch hoặc đã đăng." : "Xoá nội dung"}
        onClick={() => { setError(""); setOpen(true); }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
      <Modal
        title="Xoá nội dung này?"
        open={open}
        onOk={() => void confirmDelete()}
        onCancel={() => { if (!submitting.current) setOpen(false); }}
        okText="Xoá nội dung"
        cancelText="Giữ lại"
        confirmLoading={deleting}
        okButtonProps={{ danger: true, disabled: blocked }}
        cancelButtonProps={{ disabled: deleting }}
        closable={!deleting}
        keyboard={!deleting}
        mask={{ closable: !deleting }}
        destroyOnHidden
      >
        <p className="delete-content-title">{title}</p>
        <p>Nội dung và các bản nháp trên mọi nền tảng cùng lịch sử trong ứng dụng sẽ bị xoá vĩnh viễn.</p>
        <p className="delete-content-note">File trên Google Drive và bài đã đăng trên mạng xã hội vẫn được giữ nguyên.</p>
        {blocked && <p className="modal-error" role="alert">Chỉ xoá được nội dung khi tất cả bài đều là bản nháp hoặc thất bại. Bài đã duyệt, lên lịch, đang đăng hoặc đã đăng sẽ được giữ lại.</p>}
        {error && <p className="modal-error" role="alert">{error}</p>}
      </Modal>
    </span>
  );
}
