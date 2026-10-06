import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlsplit

from scripts import get_tiktok_token as oauth


class TikTokOAuthTests(unittest.TestCase):
    redirect = "https://n8n.example.com/webhook/tiktok-oauth-callback"

    def test_authorization_link_and_callback_decode_once(self):
        url = oauth.authorization_url("app-key", self.redirect, "random-state")
        params = parse_qs(urlsplit(url).query)
        self.assertEqual(params["scope"], ["video.publish"])
        self.assertEqual(params["redirect_uri"], [self.redirect])
        code = "code+with/%20"
        callback = self.redirect + "?" + urlencode({"code": code, "state": "random-state"})
        self.assertEqual(oauth.callback_code(callback, self.redirect, "random-state"), code)

    def test_rejects_wrong_callback_state_duplicate_code_and_access_denied(self):
        callbacks = [
            "https://other.example/callback?code=abc&state=expected",
            self.redirect + "?code=abc&state=wrong",
            self.redirect + "?code=abc&code=def&state=expected",
            self.redirect + "?code=abc&state=expected&state=extra",
            self.redirect + "?error=access_denied&state=expected",
        ]
        for callback in callbacks:
            with self.subTest(callback=callback), self.assertRaises(ValueError):
                oauth.callback_code(callback, self.redirect, "expected")

    def test_requires_https_static_redirect(self):
        for uri in ["http://localhost/callback", "https://example.com/?q=1", "https://example.com/#a"]:
            with self.subTest(uri=uri), self.assertRaises(ValueError):
                oauth.validate_redirect_uri(uri)

    def test_token_exchange_is_form_encoded_with_secret_in_body(self):
        result = {"access_token": "test-access", "refresh_token": "test-refresh", "scope": "video.publish"}
        with patch.object(oauth, "urlopen", return_value=io.BytesIO(json.dumps(result).encode())) as request:
            fields = {"code": "a+b", "client_secret": "test-secret", "grant_type": "authorization_code"}
            self.assertEqual(oauth.request_tokens(fields), result)
            sent = request.call_args.args[0]
            self.assertEqual(sent.full_url, oauth.TOKEN_URL)
            self.assertEqual(parse_qs(sent.data.decode())["code"], ["a+b"])
            self.assertNotIn("test-secret", sent.full_url)

    def test_api_errors_and_missing_scope_are_not_saved_as_success(self):
        for result in [{"error": "invalid_grant"}, {"access_token": "test", "refresh_token": "test", "scope": "user.info.basic"}]:
            with patch.object(oauth, "urlopen", return_value=io.BytesIO(json.dumps(result).encode())):
                with self.assertRaises(ValueError):
                    oauth.request_tokens({})
        error = HTTPError(oauth.TOKEN_URL, 400, "Bad Request", {}, io.BytesIO(b'{"error":"invalid_client"}'))
        with patch.object(oauth, "urlopen", side_effect=error), self.assertRaisesRegex(ValueError, "invalid_client"):
            oauth.request_tokens({})

    def test_save_private_file_and_rotate_refresh_token_without_client_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".secrets" / "tiktok-token.json"
            result = {"access_token": "first", "refresh_token": "refresh-first", "expires_in": 86400,
                      "scope": "video.publish", "client_secret": "never-save-this"}
            oauth.save_tokens(result, "app-key", self.redirect, path)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(path.parent.stat().st_mode & 0o777, 0o700)
            self.assertNotIn("client_secret", json.loads(path.read_text()))
            result.update(access_token="second", refresh_token="refresh-second")
            oauth.save_tokens(result, "app-key", self.redirect, path)
            saved = json.loads(path.read_text())
            self.assertEqual(saved["refresh_token"], "refresh-second")
            self.assertIn("expires_at", saved)


if __name__ == "__main__":
    unittest.main()
