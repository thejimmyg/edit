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
import json
from pathlib import Path

from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.responses import RedirectResponse, Response, JSONResponse
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


async def create_new_page(request):
    """Handle POST to /new - create new page directory and index.html."""
    try:
        body = await request.body()
        data = json.loads(body)
        new_path = data.get('newPath', '')

        if not new_path:
            return Response('newPath is required', status_code=400)

        # Validate path - no parent directory references
        if '..' in new_path:
            return Response('Path cannot contain ".."', status_code=400)

        # Remove leading/trailing slashes and normalize
        new_path = new_path.strip('/').replace('/index.html', '')

        # Validate path - no leading underscore in any segment
        segments = new_path.split('/') if new_path else []
        if any(seg.startswith('_') for seg in segments):
            return Response('Path segments cannot start with underscore (_)', status_code=400)

        # Normalize the path and convert to absolute
        new_page_path = os.path.normpath(new_path) if new_path else '.'
        abs_new_page_path = os.path.abspath(new_page_path)

        # Security: ensure path doesn't escape current directory
        if not abs_new_page_path.startswith(CWD):
            return Response('Path not allowed - escapes root directory', status_code=403)

        # Additional security check after normalization
        # Ensure normalized path doesn't contain '..' or start with '/'
        if '..' in new_page_path or os.path.isabs(new_page_path):
            return Response('Path not allowed - invalid format', status_code=403)

        # Create directory
        os.makedirs(abs_new_page_path, exist_ok=True)

        # Create index.html in the directory
        index_path = os.path.join(abs_new_page_path, 'index.html')

        # Calculate relative path to _script/view.js from new page
        depth = len(Path(new_page_path).parts) if new_page_path != '.' else 0
        script_path = ('../' * depth + '_script/view.js') if depth > 0 else '_script/view.js'
        sitemap_path = ('../' * depth + 'sitemap/index.html') if depth > 0 else 'sitemap/index.html'

        sample_html = f'''<!DOCTYPE html><script src="{script_path}"></script><noscript><p><a href="{sitemap_path}">Sitemap</a></p></noscript>
<h1>
    New Page
</h1>
<p>
    Edit this page to add your content.
</p>
'''

        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(sample_html)

        print(f'Created new page: {new_page_path}/index.html')

        # Return the path to the new page
        result_path = '/' + new_page_path + '/index.html' if new_page_path != '.' else '/index.html'
        return JSONResponse({
            'newPagePath': result_path
        })

    except json.JSONDecodeError:
        return Response('Invalid JSON', status_code=400)
    except Exception as e:
        return Response(f'Failed to create page: {e}', status_code=500)


async def handle_post(request):
    """Route all POST requests."""
    # Check if this is a /new request
    if request.url.path == '/new':
        return await create_new_page(request)

    # Otherwise handle as save_html
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
