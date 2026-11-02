"use client";

import { useState } from "react";
import { CalendarClock, CalendarDays, Check } from "lucide-react";
import type { Platform } from "@/lib/content-types";
import { platformLabels, vietnamDateInputValue } from "@/app/content/ui/content-presentation";

export function EditorActionDialog({ mode, platform, onClose, onApprove, onSchedule, initialScheduledAt }: {
  mode: "approve" | "schedule";
  platform: Platform;
  onClose: () => void;
  onApprove: () => void;
  onSchedule: (scheduledAt: string) => void;
  initialScheduledAt?: string;
}) {
  const initial = initialScheduledAt ? new Date(initialScheduledAt) : null;
  const initialParts = initial && !Number.isNaN(initial.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(initial).reduce<Record<string, string>>((result, part) => { if (part.type !== "literal") result[part.type] = part.value; return result; }, {})
    : null;
  const defaultDate = vietnamDateInputValue(new Date(Date.now() + 86400000));
  const [date, setDate] = useState(initialParts ? `${initialParts.year}-${initialParts.month}-${initialParts.day}` : defaultDate);
  const [time, setTime] = useState(initialParts ? `${initialParts.hour}:${initialParts.minute}` : "09:30");
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("30");
  const [error, setError] = useState("");

  function openTimePicker() {
    const [hour, minute] = time.split(":");
    setDraftHour(hour || "09");
    setDraftMinute(minute || "30");
    setTimePickerOpen(true);
  }

  function confirmTime() {
    setTime(`${draftHour}:${draftMinute}`);
    setTimePickerOpen(false);
    setError("");
  }

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
          <h2 id="modal-title">{initialScheduledAt ? "Đổi lịch đăng bài" : "Lên lịch đăng bài"}</h2>
          <p>Chọn thời gian đăng cho bài {platformLabels[platform]}.</p>
          <div className="schedule-fields">
            <label>Ngày đăng<input type="date" min={vietnamDateInputValue()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <div className="schedule-time-field"><span>Giờ đăng</span>
              <button
                className="time-picker-trigger"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={timePickerOpen}
                onClick={() => timePickerOpen ? setTimePickerOpen(false) : openTimePicker()}
              >
                <span>{time}</span>
                <CalendarClock size={15} aria-hidden="true" />
              </button>
              {timePickerOpen && (
                <div className="time-picker-popover" role="dialog" aria-label="Chọn giờ đăng">
                  <div className="time-picker-selects">
                    <label>Giờ
                      <select aria-label="Giờ đăng" value={draftHour} onChange={(event) => setDraftHour(event.target.value)}>
                        {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")).map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                    </label>
                    <span className="time-picker-colon">:</span>
                    <label>Phút
                      <select aria-label="Phút đăng" value={draftMinute} onChange={(event) => setDraftMinute(event.target.value)}>
                        {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="time-picker-confirm" type="button" onClick={confirmTime}>OK</button>
                </div>
              )}
            </div>
          </div>
          <div className="timezone-note"><CalendarDays size={14} /> Múi giờ: Asia/Ho_Chi_Minh</div>
          {error && <p className="modal-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>Hủy</button>
            <button className="primary" onClick={confirmSchedule}><CalendarClock size={15} /> {initialScheduledAt ? "Cập nhật lịch" : "Xác nhận lên lịch"}</button>
          </div>
        </>}
      </section>
    </div>
  );
}
