"use client";

import { useState } from "react";
import { CalendarClock, CalendarDays, Check } from "lucide-react";
import type { Platform } from "@/lib/content-types";
import { platformLabels, vietnamDateInputValue } from "@/app/content/ui/content-presentation";

export function EditorActionDialog({ mode, platform, onClose, onApprove, onSchedule }: {
  mode: "approve" | "schedule";
  platform: Platform;
  onClose: () => void;
  onApprove: () => void;
  onSchedule: (scheduledAt: string) => void;
}) {
  const defaultDate = vietnamDateInputValue(new Date(Date.now() + 86400000));
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:30");
  const [error, setError] = useState("");

  function confirmSchedule() {
    const value = new Date(`${date}T${time}:00+07:00`);
    if (!date || !time || Number.isNaN(value.getTime()) || value <= new Date()) {
      setError("Vui lòng chọn thời gian ở tương lai.");
      return;
    }
    onSchedule(`${date} ${time}`);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {mode === "approve" ? <>
          <div className="modal-icon approve-icon"><Check size={20} /></div>
          <h2 id="modal-title">Duyệt bài viết?</h2>
          <p>Bài viết {platformLabels[platform]} sẽ chuyển sang trạng thái đã duyệt và sẵn sàng để lên lịch.</p>
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>Hủy</button>
            <button className="primary" onClick={onApprove}><Check size={15} /> Xác nhận duyệt</button>
          </div>
        </> : <>
          <div className="modal-icon schedule-icon"><CalendarClock size={20} /></div>
          <h2 id="modal-title">Lên lịch đăng bài</h2>
          <p>Chọn thời gian đăng cho bài {platformLabels[platform]}.</p>
          <div className="schedule-fields">
            <label>Ngày đăng<input type="date" min={vietnamDateInputValue()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Giờ đăng<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          </div>
          <div className="timezone-note"><CalendarDays size={14} /> Múi giờ: Asia/Ho_Chi_Minh</div>
          {error && <p className="modal-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>Hủy</button>
            <button className="primary" onClick={confirmSchedule}><CalendarClock size={15} /> Xác nhận lên lịch</button>
          </div>
        </>}
      </section>
    </div>
  );
}
