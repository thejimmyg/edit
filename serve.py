#!/usr/bin/env python3
"""
Simple HTTP server that serves static files and handles POST to save HTML.

POST to any path ending in /index.html writes the request body to that file.
After saving, redirects to the same URL for viewing.

Usage: python3 serve.py [port]
Default port: 8000
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class SaveHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        # Only handle paths ending in /index.html
        if not self.path.endswith('/index.html'):
            self.send_error(404, 'POST only supported for /*/index.html')
            return

        # Get file path (remove leading /)
        file_path = self.path.lstrip('/')

        # Security: ensure path doesn't escape current directory
        abs_path = os.path.abspath(file_path)
        cwd = os.getcwd()
        if not abs_path.startswith(cwd):
            self.send_error(403, 'Path not allowed')
            return

        # Read the posted content
        content_length = int(self.headers.get('Content-Length', 0))
        content = self.rfile.read(content_length)

        # Write to file
        try:
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            with open(abs_path, 'wb') as f:
                f.write(content)
            print(f'Saved: {file_path}')
        except Exception as e:
            self.send_error(500, f'Failed to save: {e}')
            return

        # Redirect to the saved file (without ?edit so user sees the result)
        self.send_response(303)
        self.send_header('Location', self.path)
        self.end_headers()


def main():
    host = sys.argv[1] if len(sys.argv) > 1 else '0.0.0.0'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    server = HTTPServer((host, port), SaveHandler)
    print(f'Serving on {host}:{port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down')


if __name__ == '__main__':
    main()
