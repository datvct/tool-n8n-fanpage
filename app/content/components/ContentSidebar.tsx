"use client";

import { CalendarDays, CircleAlert, CircleCheck, LayoutDashboard, Library, MoreHorizontal } from "lucide-react";
import type { View } from "@/app/content/ui/content-presentation";

export function ContentSidebar({
  view,
  setView,
  failedCount,
}: {
  view: View;
  setView: (view: View) => void;
  failedCount: number;
}) {
  const items: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "contents", label: "Thư viện nội dung", icon: Library },
    { id: "calendar", label: "Lịch đăng bài", icon: CalendarDays },
    { id: "published", label: "Bài đã đăng", icon: CircleCheck },
    { id: "failed", label: "Bài đăng lỗi", icon: CircleAlert },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <img src="/images/logo.png" alt="Content Flow" />
        </div>
        <div>
          <strong>Content flow</strong>
          <span>Social workspace</span>
        </div>
      </div>
      <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="nav">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            className={view === id ? "active" : ""}
            key={id}
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
            {id === "failed" && failedCount > 0 && (
              <span className="nav-count">{failedCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="automation-card">
          <div className="automation-title">Tự động hóa</div>
          <p>Bài đã duyệt sẽ được xử lý theo lịch đăng đã chọn.</p>
        </div>
        <div className="user-chip">
          <div className="avatar">AD</div>
          <div>
            <strong>Admin</strong>
            <span>Quản trị viên</span>
          </div>
          <MoreHorizontal className="dots" size={17} />
        </div>
      </div>
    </aside>
  );
}
