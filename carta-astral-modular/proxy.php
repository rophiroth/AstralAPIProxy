<?php
// Simple same-origin JSON proxy to avoid browser HTTP/2 "stream" issues
// when calling the external API from Hostinger's CDN. Posts to the
// upstream and relays the response (forcing HTTP/1.1 to be safe).

// CORS: not strictly needed when called same-origin, but harmless.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['status' => 'ok']);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method Not Allowed']);
  exit;
}

function log_proxy_event($message, array $context = []) {
  $suffix = $context ? ' ' . json_encode($context) : '';
  error_log('[proxy.php] ' . $message . $suffix);
}

$raw = file_get_contents('php://input');
if ($raw === false) {
  http_response_code(400);
  echo json_encode(['error' => 'No input']);
  exit;
}

// Optional upstream override via query (?upstream=render or a full URL)
$forced = '';
if (isset($_GET['upstream'])) {
  $forced = trim((string) $_GET['upstream']);
} elseif (isset($_SERVER['HTTP_X_UPSTREAM'])) {
  $forced = trim((string) $_SERVER['HTTP_X_UPSTREAM']);
}

function resolve_upstream($forced) {
  if (!$forced) return null;
  if ($forced === 'render') {
    return 'https://astralapiproxy.onrender.com/calculate';
  }
  if ($forced === 'ai-summary') {
    return 'https://astralapiproxy.onrender.com/ai-summary';
  }
  if ($forced === 'default') {
    return null;
  }
  $decoded = rawurldecode($forced);
  if (filter_var($decoded, FILTER_VALIDATE_URL)) {
    return $decoded;
  }
  return null;
}

// Upstream URL from override, env or default (Render)
$upstream = resolve_upstream($forced);
if (!$upstream) {
  $envUpstream = getenv('ASTRAL_API_URL');
  if ($envUpstream && filter_var($envUpstream, FILTER_VALIDATE_URL)) {
    $upstream = $envUpstream;
  } else {
    $upstream = 'https://astralapiproxy.onrender.com/calculate';
  }
}

$ch = curl_init($upstream);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $raw);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'Content-Length: ' . strlen($raw)
]);
// Force HTTP/1.1 to avoid intermittent HTTP/2 stream errors through CDN
if (defined('CURL_HTTP_VERSION_1_1')) {
  curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
}
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$respBody = curl_exec($ch);
$errno = curl_errno($ch);
$err = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errno) {
  http_response_code(502);
  log_proxy_event('curl error', ['message' => $err, 'upstream' => $upstream]);
  echo json_encode(['error' => 'Upstream error', 'detail' => $err]);
  exit;
}

if ($status < 200 || $status >= 300) {
  http_response_code($status ?: 502);
  // Try to pass upstream body or provide minimal error
  $out = $respBody;
  if (!$out) {
    $out = json_encode(['error' => 'Upstream returned status ' . $status]);
  }
  log_proxy_event('upstream status error', ['status' => $status, 'upstream' => $upstream]);
  echo $out;
  exit;
}

http_response_code(200);
echo $respBody === false ? json_encode(['error' => 'Empty upstream response']) : $respBody;
