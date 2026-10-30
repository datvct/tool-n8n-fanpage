"use client";

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" role="status" aria-label="Đang tải nội dung">
      <span className="sr-only">Đang tải dữ liệu...</span>
      <div className="skeleton-stats">{Array.from({ length: 6 }, (_, i) => <div className="skeleton-block" key={i} />)}</div>
      <div className="skeleton-table skeleton-block" />
    </div>
  );
}
