import type { Platform } from "@/lib/content-types";

export function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  return (
    <span className={`platform-mark ${platform}`} aria-hidden="true">
      {platform === "facebook" ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.2V13H10v8h3.4Z" /></svg>
      ) : platform === "linkedin" ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3.4v11.5H3.5V9Zm5.5 0h3.3v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.3 4.2 5.2v6.5h-3.4v-5.8c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.9H9V9Z" /></svg>
      ) : platform === "youtube" ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" /></svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 7.1a5.4 5.4 0 0 1-3.3-1.1 5.5 5.5 0 0 1-1.9-3.1h-3.5v13.2a2.9 2.9 0 1 1-2-2.8V9.7a6.4 6.4 0 1 0 5.5 6.4V9.4a8.8 8.8 0 0 0 5.2 1.7V7.1Z" /></svg>
      )}
    </span>
  );
}
