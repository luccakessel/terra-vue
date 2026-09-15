<?php

declare(strict_types=1);

namespace GreenSense\Http;

/**
 * Construye respuestas HTTP (JSON, errores y descargas) y finaliza el request.
 */
final class Respuesta
{
    public static function json(mixed $datos, int $estado = 200)
    {
        http_response_code($estado);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $mensaje, int $estado = 400)
    {
        self::json(['error' => $mensaje], $estado);
    }

    public static function archivo(string $contenido, string $nombre, string $mime)
    {
        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Content-Disposition: attachment; filename="' . $nombre . '"');
        header('Content-Length: ' . strlen($contenido));
        echo $contenido;
        exit;
    }

    /** Cabeceras CORS compartidas (válidas también para OPTIONS de preflight). */
    public static function cors(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
    }
}