#!/usr/bin/env python3
"""
Async HTTP server using Starlette that serves static files and handles POST to save HTML.

POST to any path ending in /index.html writes the request body to that file.
After saving, redirects to the same URL for viewing.

Usage: python3 serve.py [host] [port]
Default: 0.0.0.0:8000
"""

import os
import sys

from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.responses import RedirectResponse, Response
from starlette.staticfiles import StaticFiles
import uvicorn


CWD = os.getcwd()


async def save_html(request):
    """Handle POST to /*/index.html - save content to file."""
    path = request.url.path

    # Only handle paths ending in /index.html
    if not path.endswith('/index.html'):
        return Response('POST only supported for /*/index.html', status_code=404)

    # Get file path (remove leading /)
    file_path = path.lstrip('/')

    # Security: ensure path doesn't escape current directory
    abs_path = os.path.abspath(file_path)
    if not abs_path.startswith(CWD):
        return Response('Path not allowed', status_code=403)

    # Read the posted content
    content = await request.body()

    # Write to file
    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as f:
            f.write(content)
        print(f'Saved: {file_path}')
    except Exception as e:
        return Response(f'Failed to save: {e}', status_code=500)

    # Redirect to the saved file (without ?edit so user sees the result)
    return RedirectResponse(url=path, status_code=303)


async def handle_post(request):
    """Route all POST requests to save_html."""
    return await save_html(request)


# Create app with POST handler and static file serving
app = Starlette(
    routes=[
        Route('/{path:path}', handle_post, methods=['POST']),
        Mount('/', StaticFiles(directory='.', html=True), name='static'),
    ]
)


def main():
    host = sys.argv[1] if len(sys.argv) > 1 else '0.0.0.0'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    print(f'Serving on {host}:{port}')
    uvicorn.run(app, host=host, port=port, log_level='warning')


if __name__ == '__main__':
    main()
