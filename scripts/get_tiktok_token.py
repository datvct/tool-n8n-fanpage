#!/usr/bin/env python3
"""Lấy user access token TikTok bằng Python 3, không cần thư viện bổ sung.

Chạy: python3 scripts/get_tiktok_token.py
Gia hạn: python3 scripts/get_tiktok_token.py --refresh
OAuth docs: https://developers.tiktok.com/docs/en/oauth-user-access-token-management
"""

import argparse
import getpass
import json
import os
from pathlib import Path
import secrets
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen
import webbrowser

TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TOKEN_FILE = Path(__file__).resolve().parents[1] / ".secrets" / "tiktok-token.json"


def required(prompt, hidden=False):
    value = (getpass.getpass(prompt) if hidden else input(prompt)).strip()
    if not value:
        raise ValueError("Không được để trống thông tin này. Chạy lại script để nhập lại.")
    return value


def validate_redirect_uri(value):
    uri = urlsplit(value)
    if (uri.scheme != "https" or not uri.hostname or uri.username or uri.password
            or uri.query or uri.fragment):
        raise ValueError("Redirect URI phải là URL HTTPS, không có query hoặc fragment.")
    return value


def authorization_url(client_key, redirect_uri, state):
    return "https://www.tiktok.com/v2/auth/authorize/?" + urlencode({
        "client_key": client_key,
        "response_type": "code",
        "scope": "video.publish",
        "redirect_uri": validate_redirect_uri(redirect_uri),
        "state": state,
    })


def callback_code(callback_url, redirect_uri, expected_state):
    actual = urlsplit(callback_url.strip())
    expected = urlsplit(redirect_uri)
    if ((actual.scheme, actual.netloc, actual.path) !=
            (expected.scheme, expected.netloc, expected.path) or actual.fragment):
        raise ValueError("URL callback không khớp Redirect URI. Dán nguyên URL trên thanh địa chỉ trình duyệt.")
    query = parse_qs(actual.query, keep_blank_values=True)
    states = query.get("state", [])
    if len(states) != 1 or not secrets.compare_digest(states[0].encode(), expected_state.encode()):
        raise ValueError("State không khớp phiên hiện tại. Hãy dùng link của lần chạy này để đăng nhập lại.")
    if query.get("error"):
        raise ValueError("TikTok chưa cấp quyền. Kiểm tra màn hình cấp quyền rồi chạy lại script.")
    codes = query.get("code", [])
    if len(codes) != 1 or not codes[0]:
        raise ValueError("URL thiếu code. Cần dán toàn bộ URL sau khi TikTok chuyển về callback.")
    # parse_qs has already URL-decoded the code; do not decode a second time.
    return codes[0]


def request_tokens(fields):
    request = Request(TOKEN_URL, data=urlencode(fields).encode("utf-8"), method="POST",
                      headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urlopen(request, timeout=30) as response:
            result = json.load(response)
    except HTTPError as error:
        try:
            result = json.loads(error.read())
        except (ValueError, UnicodeError):
            raise ValueError("TikTok trả lỗi HTTP %s. Kiểm tra cấu hình ứng dụng." % error.code) from None
    except URLError:
        raise ValueError("Không thể kết nối TikTok. Kiểm tra mạng rồi chạy lại script.") from None
    if not isinstance(result, dict):
        raise ValueError("TikTok trả về dữ liệu không hợp lệ.")
    if result.get("error"):
        # Only show a short error identifier, never echo the request or secret.
        code = str(result["error"])
        code = "".join(c for c in code if c.isalnum() or c == "_")[:80]
        raise ValueError("TikTok từ chối yêu cầu (%s). Kiểm tra Client key/secret, Redirect URI và mã đăng nhập." % code)
    if not result.get("access_token") or not result.get("refresh_token"):
        raise ValueError("Phản hồi TikTok thiếu access_token hoặc refresh_token.")
    if "video.publish" not in str(result.get("scope", "")).split(","):
        raise ValueError("Token chưa có quyền video.publish. Bật Direct Post rồi cấp quyền lại.")
    return result


def save_tokens(result, client_key, redirect_uri, path=TOKEN_FILE):
    expires_in = int(result.get("expires_in", 0))
    now = datetime.now(timezone.utc)
    payload = {key: result[key] for key in (
        "access_token", "refresh_token", "expires_in", "refresh_expires_in",
        "open_id", "scope", "token_type",
    ) if key in result}
    payload.update(client_key=client_key, redirect_uri=redirect_uri,
                   obtained_at=now.isoformat(),
                   expires_at=(now + timedelta(seconds=expires_in)).isoformat())
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(path.parent, 0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=".tiktok-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(payload, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return path


def main():
    parser = argparse.ArgumentParser(description="Lấy access token TikTok cho luồng đăng video.")
    parser.add_argument("--refresh", action="store_true", help="Gia hạn bằng refresh token đã lưu")
    parser.add_argument("--no-browser", action="store_true", help="Chỉ in link, không tự mở trình duyệt")
    args = parser.parse_args()
    print("TikTok OAuth — token sẽ được lưu vào .secrets/tiktok-token.json\n")
    if args.refresh:
        if not TOKEN_FILE.exists():
            raise ValueError("Chưa có token đã lưu. Chạy script không có --refresh trước.")
        saved = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
        client_key = saved["client_key"]
        redirect_uri = saved["redirect_uri"]
        client_secret = required("Client secret của app đã lấy token (nhập ẩn): ", hidden=True)
        fields = {"client_key": client_key, "client_secret": client_secret,
                  "grant_type": "refresh_token", "refresh_token": saved["refresh_token"]}
    else:
        print("Chuẩn bị Client key, Client secret và Redirect URI đã đăng ký trong Login Kit.")
        print("Nếu dùng webhook n8n, hãy Activate/Publish workflow callback trước.\n")
        client_key = required("Client key: ")
        client_secret = required("Client secret (nhập ẩn, dán rồi Enter): ", hidden=True)
        redirect_uri = validate_redirect_uri(required("Redirect URI / Production URL callback: "))
        state = secrets.token_urlsafe(32)
        url = authorization_url(client_key, redirect_uri, state)
        print("\nMở link sau, đăng nhập đúng tài khoản TikTok và đồng ý cấp quyền:\n" + url)
        if not args.no_browser:
            try:
                webbrowser.open(url)
            except webbrowser.Error:
                pass  # The printed URL is also usable manually.
        print("\nKhi chuyển về trang callback, copy TOÀN BỘ URL trên thanh địa chỉ.")
        print("URL cần có ?code=...&state=...; không chỉ copy riêng code.")
        while True:
            try:
                code = callback_code(required("Dán URL callback: "), redirect_uri, state)
                break
            except ValueError as error:
                print("\n" + str(error) + " Nhấn Ctrl+C để thoát nếu cần.\n")
        fields = {"client_key": client_key, "client_secret": client_secret,
                  "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
    print("\nĐang đổi mã/gia hạn token với TikTok…")
    result = request_tokens(fields)
    path = save_tokens(result, client_key, redirect_uri)
    print("\nĐÃ LẤY TOKEN THÀNH CÔNG. File: " + str(path))
    print("Mở file trên, copy giá trị access_token:")
    print("  n8n Header Auth: Authorization = Bearer <access_token>")
    print('  .env ứng dụng: TIKTOK_ACCESS_TOKEN="<access_token>" rồi khởi động lại app.')
    print("Giữ refresh_token để lần sau chạy: python3 scripts/get_tiktok_token.py --refresh")
    print("Script không tự sửa .env, credential n8n hoặc đăng video.")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nĐã dừng.", file=sys.stderr)
        sys.exit(1)
    except (ValueError, OSError, KeyError) as error:
        print("\nLỗi: " + str(error), file=sys.stderr)
        sys.exit(1)
