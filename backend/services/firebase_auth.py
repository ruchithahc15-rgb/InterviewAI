import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def verify_firebase_id_token(id_token: str) -> dict:
    """Resolve a Firebase ID token against the project's Identity Toolkit API."""
    api_key = os.getenv("FIREBASE_WEB_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Google sign-in is not configured on the server.")
    request = Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}",
        data=json.dumps({"idToken": id_token}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (400, 401, 403):
            raise ValueError("Google sign-in could not be verified. Please try again.") from error
        raise ConnectionError("Google sign-in is temporarily unavailable.") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ConnectionError("Google sign-in is temporarily unavailable.") from error

    users = payload.get("users", [])
    if not users:
        raise ValueError("Google sign-in could not be verified. Please try again.")
    return users[0]
