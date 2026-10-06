"use client";

import { useEffect, useState } from "react";
import { tiktokPrivacyLabels, type TikTokCreator, type TikTokOptions } from "@/lib/tiktok";

const emptyOptions: TikTokOptions = {
  privacyLevel: "", allowComment: false, allowDuet: false, allowStitch: false,
  brandOrganic: false, brandContent: false, isAigc: false,
};

export default function TikTokPostOptions({ value, disabled, onChange }: {
  value?: TikTokOptions | null;
  disabled: boolean;
  onChange: (options: TikTokOptions) => void;
}) {
  const [creator, setCreator] = useState<TikTokCreator | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tiktok/creator", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setCreator(result.data);
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, []);
  const options = value || emptyOptions;
  const fields = [
    ["allowComment", "Cho phép bình luận", creator?.comment_disabled],
    ["allowDuet", "Cho phép Duet", creator?.duet_disabled],
    ["allowStitch", "Cho phép Stitch", creator?.stitch_disabled],
    ["brandOrganic", "Quảng bá thương hiệu của tôi", false],
    ["brandContent", "Hợp tác trả phí với thương hiệu khác", false],
    ["isAigc", "Video do AI tạo", false],
  ] as const;
  return (
    <fieldset className="tiktok-options" disabled={disabled || !creator}>
      <legend>Cài đặt đăng TikTok</legend>
      {error ? <p role="alert">{error}</p> : creator ? (
        <p>Đăng lên {creator.creator_nickname} (@{creator.creator_username}) · Tối đa {creator.max_video_post_duration_sec} giây</p>
      ) : <p>Đang tải tài khoản TikTok…</p>}
      <label>
        Ai có thể xem video?
        <select value={options.privacyLevel} onChange={(event) => onChange({ ...options, privacyLevel: event.target.value })}>
          <option value="">Chọn quyền riêng tư</option>
          {creator?.privacy_level_options.map((level) => (
            <option key={level} value={level}>{tiktokPrivacyLabels[level as keyof typeof tiktokPrivacyLabels] || level}</option>
          ))}
        </select>
      </label>
      {fields.map(([key, label, unavailable]) => (
        <label key={key} className="tiktok-option-check">
          <input type="checkbox" checked={!unavailable && options[key]} disabled={Boolean(unavailable)}
            onChange={(event) => onChange({ ...options, [key]: event.target.checked })} />
          {label}
        </label>
      ))}
      <p className="subtle">Khi lên lịch, bạn đồng ý gửi video và caption này lên tài khoản TikTok trên vào thời gian đã chọn. Đảm bảo bạn có quyền sử dụng âm thanh theo <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>{options.brandContent || options.brandOrganic ? <> và <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a></> : null}.</p>
    </fieldset>
  );
}
