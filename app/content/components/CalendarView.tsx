"use client";

import { useState } from "react";
import type { SocialPost } from "@/lib/content-types";
import { getPostDisplayTitle, platformLabels, postTypeLabels, truncateText, vietnamMonthStart } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";

export function CalendarView({
  posts,
  onOpen,
}: {
  posts: (SocialPost & { employee: string; contentId: string })[];
  onOpen: (contentId: string, platform?: SocialPost["platform"]) => void;
}) {
  const [month, setMonth] = useState(() => {
    return vietnamMonthStart();
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(month);
  const calendarPosts = posts.filter(
    (post) => post.status === "scheduled" || post.status === "published",
  );

  function eventDate(post: SocialPost) {
    return post.status === "published"
      ? post.publishedAt || post.scheduledAt
      : post.scheduledAt;
  }

  function scheduledDateKey(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  const monthPosts = calendarPosts.filter((post) =>
    scheduledDateKey(eventDate(post)).startsWith(monthKey),
  );
  const undatedPosts = calendarPosts.filter((post) => !eventDate(post));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
          <p className="subtle">
            Bài đã lên lịch và đã đăng · Asia/Ho_Chi_Minh
          </p>
        </div>
        <div className="calendar-nav">
          <button
            className="secondary"
            aria-label="Tháng trước"
            onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
          >
            ←
          </button>
          <button
            className="secondary"
            onClick={() => {
              setMonth(vietnamMonthStart());
            }}
          >
            Tháng hiện tại
          </button>
          <button
            className="secondary"
            aria-label="Tháng sau"
            onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
          >
            →
          </button>
        </div>
      </div>
      <div className="calendar">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <div className="day" key={day}>
            <strong>{day}</strong>
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, index) => (
          <div className="day calendar-empty" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;
          const events = monthPosts.filter(
            (post) => scheduledDateKey(eventDate(post)) === dayKey,
          );
          return (
            <div className="day" key={day}>
              <div className="day-num">{day}</div>
              {events.map((event) => (
                <button className={`event ${event.status}`} key={event.id} onClick={() => onOpen(event.contentId, event.platform)} title="Mở bài viết">
                  <strong><PlatformIcon platform={event.platform} size={13} /> {platformLabels[event.platform]}</strong> ·{" "}
                  {event.status === "published" ? "Đã đăng" : "Đã lên lịch"}
                  <br />
                  {postTypeLabels[event.postType] || "Bài viết"} ·{" "}
                  {eventDate(event)
                    ? new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(eventDate(event)!))
                    : ""}
                  <br />
                  {truncateText(getPostDisplayTitle(event), 50)}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {undatedPosts.length > 0 && (
        <div className="undated-posts">
          <h3>Bài chưa có ngày đăng</h3>
          <p className="subtle">
            Các bài này thiếu thời điểm đăng và thời gian lên lịch trong dữ liệu,
            nên chưa thể đặt vào ngày cụ thể.
          </p>
          <div className="undated-post-list">
            {undatedPosts.map((post) => (
              <button className={`event ${post.status}`} key={post.id} onClick={() => onOpen(post.contentId, post.platform)}>
                <strong><PlatformIcon platform={post.platform} size={13} /> {platformLabels[post.platform]}</strong> ·{" "}
                {post.status === "published" ? "Đã đăng" : "Đã lên lịch"}
                <br />
                {postTypeLabels[post.postType] || "Bài viết"}
                <br />
                {truncateText(getPostDisplayTitle(post), 90)}
              </button>
            ))}
          </div>
        </div>
      )}
      {!monthPosts.length && !undatedPosts.length && <div className="empty-state"><strong>Chưa có bài trong tháng này</strong><span>Bài đã lên lịch hoặc đã đăng sẽ hiển thị theo ngày tại đây.</span></div>}
    </section>
  );
}
