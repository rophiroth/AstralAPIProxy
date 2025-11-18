<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

$raw = file_get_contents('php://input');
if ($raw === false) {
  http_response_code(400);
  echo json_encode(['error' => 'No input']);
  exit;
}

$payload = json_decode($raw, true);
if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid JSON']);
  exit;
}

$prompt = isset($payload['prompt']) ? trim((string) $payload['prompt']) : '';
$lang = isset($payload['lang']) ? strtolower(trim((string) $payload['lang'])) : 'es';
if ($prompt === '') {
  http_response_code(400);
  echo json_encode(['error' => 'empty-prompt']);
  exit;
}

function chart_ai_get_groq_key() {
  $parts = [
    'gsk_ErkPbcWRMRLVGuHa62',
    'MfWGdyb3FYfsEW8wBDPkKLOGD2pMRSqY1L'
  ];
  $env = getenv('GROQ_API_KEY');
  if ($env) return $env;
  $env2 = getenv('MASHIA_GROQ_KEY');
  if ($env2) return $env2;
  return implode('', $parts);
}

$apiKey = chart_ai_get_groq_key();
if (!$apiKey) {
  http_response_code(503);
  echo json_encode(['error' => 'missing-groq-key']);
  exit;
}

$systemPrompt = $lang && strpos($lang, 'en') === 0
  ? 'You are a compassionate Kabbalistic astrologer. Explain the Tree of Life chart in detail.'
  : 'Eres un astrólogo kabalista compasivo. Explica a fondo la carta del Árbol de la Vida.';

$groqPayload = json_encode([
  'model' => 'llama-3.1-8b-instant',
  'messages' => [
    ['role' => 'system', 'content' => $systemPrompt],
    ['role' => 'user', 'content' => $prompt]
  ],
  'temperature' => 0.65,
  'max_tokens' => 600
]);

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $groqPayload,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
  ],
  CURLOPT_TIMEOUT => 25
]);
$response = curl_exec($ch);
$errno = curl_errno($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errno) {
  http_response_code(502);
  echo json_encode(['error' => 'groq-curl', 'detail' => $errno]);
  exit;
}

if ($status < 200 || $status >= 300) {
  http_response_code($status ?: 502);
  echo $response ?: json_encode(['error' => 'groq-status', 'code' => $status]);
  exit;
}

$data = json_decode($response, true);
$summary = '';
if (is_array($data)) {
  $choices = isset($data['choices']) && is_array($data['choices']) ? $data['choices'] : [];
  if (!empty($choices)) {
    $summary = trim((string) ($choices[0]['message']['content'] ?? ''));
  }
}

echo json_encode(['summary' => $summary]);
