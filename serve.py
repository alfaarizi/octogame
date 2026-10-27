#!/usr/bin/env python3
"""Dev server for Flashlight Haunt.

Serves this folder at http://localhost:8000 and tells the browser never to cache
anything, so refreshing the page always loads the newest code.

Run `python3 serve.py` for port 8000, or pass a port number: `python3 serve.py 8080`.
"""
import functools
import http.server
import pathlib
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = pathlib.Path(__file__).resolve().parent


class DevServer(http.server.ThreadingHTTPServer):
    # The browser requests every game module at once; the default backlog of 5
    # drops connections under that burst, which shows up as a failed module load.
    request_queue_size = 128
    daemon_threads = True


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Keep-alive, so the browser reuses connections.
    protocol_version = "HTTP/1.1"
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".woff2": "font/woff2",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        # Keep the terminal quiet.
        pass


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with DevServer(("127.0.0.1", PORT), handler) as server:
        print(f"Flashlight Haunt is running at http://localhost:{PORT}", flush=True)
        server.serve_forever()
