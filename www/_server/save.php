<?php
/**
 * Save HTML endpoint - replicates serve.py save_html function
 *
 * Handles POST requests to save edited HTML content.
 * Path is passed as query parameter: /_server/save.php?path=/work/index.html
 */

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

// Get path from query parameter
if (!isset($_GET['path']) || $_GET['path'] === '') {
    http_response_code(400);
    exit('path parameter required');
}

$path = $_GET['path'];

// Only handle paths ending in /index.html
if (!str_ends_with($path, '/index.html')) {
    http_response_code(404);
    exit('POST only supported for /*/index.html');
}

// Remove leading slash to get relative path
$filePath = ltrim($path, '/');

// Security: check for path traversal
if (strpos($filePath, '..') !== false) {
    http_response_code(403);
    exit('Path not allowed');
}

// Get document root and build absolute path
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
$targetDir = $docRoot . '/' . dirname($filePath);
$targetFile = $docRoot . '/' . $filePath;

// Security: verify path stays within document root
$realDocRoot = realpath($docRoot);
if ($realDocRoot === false) {
    http_response_code(500);
    exit('Document root not found');
}

// For existing directories, verify they're within document root
if (is_dir($targetDir)) {
    $realTargetDir = realpath($targetDir);
    if ($realTargetDir === false || !str_starts_with($realTargetDir, $realDocRoot)) {
        http_response_code(403);
        exit('Path not allowed');
    }
}

// Read the posted content
$content = file_get_contents('php://input');

// Create directory if needed
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        http_response_code(500);
        exit('Failed to create directory');
    }
}

// Write to file
if (file_put_contents($targetFile, $content) === false) {
    http_response_code(500);
    exit('Failed to save file');
}

error_log("Saved: $filePath");

// Redirect to the saved file (303 See Other - matches Python behavior)
header("Location: $path", true, 303);
exit();
