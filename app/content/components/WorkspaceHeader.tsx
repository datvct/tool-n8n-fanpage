"use client";

import { RefreshCw } from "lucide-react";
import { VIETNAM_TIME_ZONE } from "@/app/content/ui/content-presentation";

type WorkspaceHeaderProps = {
  title: string;
  description: string;
  refreshing: boolean;
  loading: boolean;
  lastSyncedAt: Date | null;
  onRefresh: () => void;
  compact?: boolean;
};

export function WorkspaceHeader({
  title,
  description,
  refreshing,
  loading,
  lastSyncedAt,
  onRefresh,
  compact = false,
}: WorkspaceHeaderProps) {
  return (
    <>
      <header className={`topbar${compact ? " compact" : ""}`}>
        <div className="heading-block">
          <div className="eyebrow">
            Vận hành nội dung <span>/</span>{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: VIETNAM_TIME_ZONE,
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </div>
          <h1>{title}</h1>
          <p className="subtle">{description}</p>
        </div>
        <div className="header-actions">
          <button
            className="secondary refresh-button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            Làm mới
          </button>
          <a
            className="primary"
            href={process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || "https://forms.gle/Yqc51w1LRuoSrTLV9"}
            target="_blank"
            rel="noreferrer"
          >
            <span className="button-icon">+</span> Nội dung mới
          </a>
        </div>
      </header>
      {lastSyncedAt && !loading && (
        <div className="sync-meta">
          Cập nhật lúc {lastSyncedAt.toLocaleTimeString("vi-VN", { timeZone: VIETNAM_TIME_ZONE })}
        </div>
      )}
    </>
  );
}
