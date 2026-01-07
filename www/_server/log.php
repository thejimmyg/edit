<?php
// Remote console log receiver - writes to Apache error log
// View with: tail -f /var/log/apache2/error.log (or docker logs)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('POST only');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    exit('Invalid JSON');
}

$level = strtoupper($input['level'] ?? 'LOG');
$args = implode(' ', $input['args'] ?? []);

error_log("[JS {$level}] {$args}");

echo 'ok';
