<?php
// Save uploaded CSV for a given Enoch year into this folder.
// Accepts multipart/form-data with fields:
//  - file: the CSV file
//  - year: numeric year used to name the file
//  - filename (optional): suggested filename; server will enforce safe name

// CORS / preflight (allow same-origin and simple cross-origin uploads if needed)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

// Optional bearer token check
$expectedToken = getenv('UPLOAD_CSV_TOKEN');
if (!$expectedToken) {
  // Allow setting a token in a flat file next to the script (optional)
  $tokenFile = __DIR__ . '/.upload_token';
  if (is_readable($tokenFile)) {
    $expectedToken = trim(file_get_contents($tokenFile));
  }
}
if ($expectedToken) {
  $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
  if ($auth !== ('Bearer ' . $expectedToken)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
  }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method not allowed']);
  exit;
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'file missing']);
  exit;
}

$yearRaw = isset($_POST['year']) ? $_POST['year'] : '';
$year = preg_replace('/[^0-9]/', '', (string)$yearRaw);
if ($year === '') {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'invalid year']);
  exit;
}

// Fixed, safe filename pattern
$safeName = 'enoch-calendar-' . $year . '.csv';
$targetDir = __DIR__;
$target = $targetDir . DIRECTORY_SEPARATOR . $safeName;

// Basic size guard (<= 2 MB)
if ($_FILES['file']['size'] > 2 * 1024 * 1024) {
  http_response_code(413);
  echo json_encode(['ok' => false, 'error' => 'file too large']);
  exit;
}

// Move upload into place
if (!move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'failed to save']);
  exit;
}

// Tighten permissions
@chmod($target, 0644);

echo json_encode(['ok' => true, 'file' => basename($target)]);
exit;

