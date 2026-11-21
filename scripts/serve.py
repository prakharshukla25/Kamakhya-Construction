#!/usr/bin/env python3
"""Local-only static preview. Bind to loopback, and do not expose repo internals."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.private_path():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.private_path():
            self.send_error(404)
            return
        super().do_HEAD()

    def private_path(self):
        parts = Path(unquote(urlsplit(self.path).path)).parts
        return any(part.startswith(".") for part in parts if part not in ("/", "."))

    def list_directory(self, path):
        self.send_error(404, "Directory listing is disabled")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--directory", type=Path, default=ROOT)
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not (directory / "index.html").is_file():
        parser.error(f"No index.html in {directory}")
    handler = partial(PreviewHandler, directory=str(directory))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Local preview: http://127.0.0.1:{args.port}/", flush=True)
        print("Press Ctrl+C to stop. Nothing is published.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nPreview stopped.")


if __name__ == "__main__":
    main()
