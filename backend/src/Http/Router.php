<?php

declare(strict_types=1);

namespace GreenSense\Http;

use GreenSense\Servicios\Autenticacion;

/**
 * Front controller: enruta la petición, autentica con token (salvo rutas
 * públicas), ejecuta el manejador y serializa el resultado a JSON.
 * Los manejadores reciben el Router para leer cuerpo/consulta o responder
 * errores y descargas directamente.
 */
final class Router
{
    /** @var array<string, array{handler: callable, publico: bool}> */
    private array $rutas = [];

    public function __construct(private Autenticacion $auth)
    {
    }

    public function get(string $patron, callable $handler, bool $publico = false): void
    {
        $this->registrar('GET', $patron, $handler, $publico);
    }

    public function post(string $patron, callable $handler, bool $publico = false): void
    {
        $this->registrar('POST', $patron, $handler, $publico);
    }

    public function put(string $patron, callable $handler, bool $publico = false): void
    {
        $this->registrar('PUT', $patron, $handler, $publico);
    }

    private function registrar(string $metodo, string $patron, callable $handler, bool $publico): void
    {
        $this->rutas[strtoupper($metodo) . ' ' . $patron] = ['handler' => $handler, 'publico' => $publico];
    }

    public function despachar(): void
    {
        Respuesta::cors();
        $metodo = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ($metodo === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        $ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        foreach ($this->rutas as $clave => $definicion) {
            [$metodoRuta, $patron] = explode(' ', $clave, 2);
            if ($metodoRuta !== $metodo) {
                continue;
            }
            $parametros = $this->coinciden($patron, $ruta);
            if ($parametros === null) {
                continue;
            }

            if (!$definicion['publico']) {
                $usuarioId = $this->auth->usuarioDe($this->bearer() ?? '');
                if ($usuarioId === null) {
                    Respuesta::error('No autorizado. Sesión inválida o expirada.', 401);
                }
                $parametros['usuarioId'] = $usuarioId;
            }

            $resultado = $definicion['handler']($this, $parametros);
            Respuesta::json($this->serializar($resultado));
            return;
        }
        Respuesta::error('Ruta no encontrada.', 404);
    }

    // --- Acceso a la petición para los manejadores ----------------------------

    /** @return array<string, mixed> cuerpo JSON de la petición */
    public function cuerpo(): array
    {
        $entrada = file_get_contents('php://input');
        if (!is_string($entrada) || $entrada === '') {
            return [];
        }
        $datos = json_decode($entrada, true);
        return is_array($datos) ? $datos : [];
    }

    public function consulta(string $clave, ?string $defecto = null): ?string
    {
        $valor = $_GET[$clave] ?? null;
        return $valor === null || $valor === '' ? $defecto : (string) $valor;
    }

    private function bearer(): ?string
    {
        $autorizacion = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($autorizacion, 'Bearer ')) {
            return null;
        }
        return trim(substr($autorizacion, 7));
    }

    /** @return array<string, string>|null segmentos de la ruta */
    private function coinciden(string $patron, string $ruta): ?array
    {
        $segPatron = explode('/', trim($patron, '/'));
        $segRuta = explode('/', trim($ruta, '/'));
        if (count($segPatron) !== count($segRuta)) {
            return null;
        }
        $parametros = [];
        foreach ($segPatron as $i => $segmento) {
            if (str_starts_with($segmento, ':')) {
                $parametros[substr($segmento, 1)] = $segRuta[$i];
            } elseif ($segmento !== $segRuta[$i]) {
                return null;
            }
        }
        return $parametros;
    }

    /** Convierte objetos del dominio (con toJson) a arrays para el JSON. */
    private function serializar(mixed $dato): mixed
    {
        if (is_object($dato) && method_exists($dato, 'toJson')) {
            return $dato->toJson();
        }
        if (is_array($dato)) {
            return array_map(fn (mixed $v): mixed => $this->serializar($v), $dato);
        }
        return $dato;
    }
}