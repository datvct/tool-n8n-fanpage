"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json().catch(() => null);
    if (response.ok) router.replace("/");
    else setError(result?.error || "Không thể đăng nhập.");
    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <img src="/images/logo.png" alt="Content Flow" />
          </div>
          <div>
            <strong>EPCB</strong>
            <span>Social workspace</span>
          </div>
        </div>
        <div className="login-icon">
          <LockKeyhole size={21} />
        </div>
        <div className="login-copy">
          <h1>Chào mừng trở lại</h1>
          <p>Nhập mật khẩu để truy cập không gian quản lý nội dung.</p>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="password">Mật khẩu truy cập</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            autoFocus
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button className="primary login-submit" disabled={loading}>
            {loading ? (
              "Đang xác thực..."
            ) : (
              <>
                Đăng nhập <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
        <p className="login-footnote">
          Phiên đăng nhập có hiệu lực trong 12 giờ.
        </p>
      </section>
    </main>
  );
}
