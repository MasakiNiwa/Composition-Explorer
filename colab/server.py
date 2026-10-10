"""Composition Explorer — Colab server.

Serves the same web UI that runs on GitHub Pages, plus a small JSON API that
lets the UI detect it is running on a Colab kernel and use its resources.

    from server import start
    start(root="site", port=8000)

API (same origin as the UI, relative to the page):
    GET  api/health   -> {"app": "composition-explorer", "backend": "colab", ...}
    GET  api/info     -> runtime details (Python, GPU)

New compute features (GPU evaluation, AI image generation, ...) are added as
extra endpoints here; the UI talks to them through its ComputeBackend layer.
Standard library only.
"""

from __future__ import annotations

import functools
import json
import platform
import shutil
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

API_VERSION = 1


def gpu_info() -> list[dict]:
    """GPU name/memory via nvidia-smi (empty list when no GPU is attached)."""
    if not shutil.which("nvidia-smi"):
        return []
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        ).stdout
    except (subprocess.SubprocessError, OSError):
        return []
    gpus = []
    for line in out.strip().splitlines():
        name, _, mem = line.partition(",")
        gpus.append({"name": name.strip(), "memory": mem.strip()})
    return gpus


class Handler(SimpleHTTPRequestHandler):
    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 (http.server API)
        path = self.path.split("?", 1)[0]
        if path.endswith("/api/health"):
            gpus = gpu_info()
            return self._json(
                {
                    "app": "composition-explorer",
                    "backend": "colab",
                    "apiVersion": API_VERSION,
                    "gpu": gpus[0]["name"] if gpus else None,
                }
            )
        if path.endswith("/api/info"):
            return self._json(
                {
                    "python": platform.python_version(),
                    "platform": platform.platform(),
                    "gpus": gpu_info(),
                }
            )
        return super().do_GET()

    def end_headers(self) -> None:
        # The UI may be opened through Colab's proxy domain.
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # keep notebook output quiet
        pass


def start(root: str | Path = "site", port: int = 8000) -> ThreadingHTTPServer:
    """Start the server in a background thread and return it."""
    root = Path(root).resolve()
    if not (root / "index.html").exists():
        raise FileNotFoundError(f"index.html not found in {root}")
    handler = functools.partial(Handler, directory=str(root))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="site")
    ap.add_argument("--port", type=int, default=8000)
    a = ap.parse_args()
    srv = start(a.root, a.port)
    print(f"Serving {a.root} on http://localhost:{a.port}/")
    threading.Event().wait()
