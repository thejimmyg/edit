<?php
/**
 * Create new page endpoint - replicates serve.py create_new_page function
 *
 * Handles POST requests to create new page directories with template HTML.
 * Expects JSON body: {"newPath": "/path/to/new/page"}
 */

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

// Parse JSON body
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if ($data === null) {
    http_response_code(400);
    exit('Invalid JSON');
}

if (!isset($data['newPath']) || $data['newPath'] === '') {
    http_response_code(400);
    exit('newPath is required');
}

$newPath = $data['newPath'];

// Security: check for path traversal
if (strpos($newPath, '..') !== false) {
    http_response_code(400);
    exit('Path cannot contain ".."');
}

// Remove leading/trailing slashes and index.html suffix
$newPath = trim($newPath, '/');
$newPath = preg_replace('#/index\.html$#', '', $newPath);

// Validate path - no leading underscore in any segment
$segments = $newPath !== '' ? explode('/', $newPath) : [];
foreach ($segments as $seg) {
    if (str_starts_with($seg, '_')) {
        http_response_code(400);
        exit('Path segments cannot start with underscore (_)');
    }
}

// Get document root and build absolute path
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
$realDocRoot = realpath($docRoot);

if ($realDocRoot === false) {
    http_response_code(500);
    exit('Document root not found');
}

$newPagePath = $newPath !== '' ? $newPath : '.';
$absNewPagePath = $realDocRoot . '/' . $newPagePath;

// Security: verify path stays within document root after normalization
$normalizedPath = realpath(dirname($absNewPagePath));
if ($normalizedPath !== false && !str_starts_with($normalizedPath, $realDocRoot)) {
    http_response_code(403);
    exit('Path not allowed - escapes root directory');
}

// Additional security check
if (str_starts_with($newPagePath, '/') || strpos($newPagePath, '..') !== false) {
    http_response_code(403);
    exit('Path not allowed - invalid format');
}

// Create directory
if (!is_dir($absNewPagePath)) {
    if (!mkdir($absNewPagePath, 0755, true)) {
        http_response_code(500);
        exit('Failed to create directory');
    }
}

// Create index.html in the directory
$indexPath = $absNewPagePath . '/index.html';

// Calculate relative path to _script/view.js from new page
$depth = $newPagePath !== '.' ? count(explode('/', $newPagePath)) : 0;
$scriptPath = $depth > 0 ? str_repeat('../', $depth) . '_script/view.js' : '_script/view.js';
$sitemapPath = $depth > 0 ? str_repeat('../', $depth) . 'sitemap/index.html' : 'sitemap/index.html';

$sampleHtml = <<<HTML
<!DOCTYPE html><script src="$scriptPath"></script><noscript><p><a href="$sitemapPath">Sitemap</a></p></noscript>
<h1>
    New Page
</h1>
<p>
    Edit this page to add your content.
</p>

HTML;

if (file_put_contents($indexPath, $sampleHtml) === false) {
    http_response_code(500);
    exit('Failed to create index.html');
}

error_log("Created new page: $newPagePath/index.html");

// Return the path to the new page
$resultPath = $newPagePath !== '.' ? '/' . $newPagePath . '/index.html' : '/index.html';
header('Content-Type: application/json');
echo json_encode(['newPagePath' => $resultPath]);
