<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(["status" => "preflight ok"]);
  exit();
}

echo json_encode([
  "status" => "proxy.php está corriendo correctamente",
  "method" => $_SERVER['REQUEST_METHOD'],
  "test" => "si ves esto, el error viene del código dentro del proxy real"
]);
