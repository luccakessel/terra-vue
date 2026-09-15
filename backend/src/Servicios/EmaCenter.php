<?php

declare(strict_types=1);

namespace GreenSense\Servicios;

/**
 * Cliente de la EMA Center API (Laboratorio Gugler): datos meteorológicos
 * reales de una estación externa. Se usan como "clima de contexto" del
 * invernadero. Con cache en disco para no golpear la API en cada request.
 */
final class EmaCenter
{
    private const CACHE_SEGUNDOS = 60;

    private string $archivoCache;

    public function __construct(
        private string $baseUrl = 'https://emacenter.gugler.com.ar',
        private int $estacionId = 1
    ) {
        $this->archivoCache = dirname(__DIR__, 2) . '/var/ema_centro_cache.json';
    }

    /**
     * Contexto meteorológico actual: estación + último registro.
     * Devuelve null si la API no está disponible y no hay cache reciente.
     */
    public function contexto(): ?array
    {
        $cache = $this->leerCache();
        if ($cache !== null) {
            return $cache;
        }
        $nuevo = $this->descargar();
        if ($nuevo !== null) {
            $this->guardarCache($nuevo);
        }
        return $nuevo;
    }

    /** @return array{estacion: array, registro: array, obtenidoEn: string}|null */
    private function descargar(): ?array
    {
        $url = rtrim($this->baseUrl, '/') . '/api/station/' . $this->estacionId . '/';
        $contexto = stream_context_create([
            'http' => ['timeout' => 8, 'ignore_errors' => true],
            'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        ]);
        $json = @file_get_contents($url, false, $contexto);
        if (!is_string($json) || $json === '') {
            return null;
        }
        $datos = json_decode($json, true);
        if (!is_array($datos) || empty($datos['registros'])) {
            return null;
        }

        $estacion = [
            'id' => (int) ($datos['id_estacion'] ?? 0),
            'nombre' => (string) ($datos['nombre'] ?? ''),
            'modelo' => (string) ($datos['modelo'] ?? ''),
            'ciudad' => (string) ($datos['ciudad'] ?? ''),
            'latitud' => (string) ($datos['latitud'] ?? ''),
            'longitud' => (string) ($datos['longitud'] ?? ''),
        ];

        $r = $datos['registros'][0];
        $registro = [
            'fecha' => (string) ($r['fecha'] ?? ''),
            'temperaturaExterna' => (float) ($r['temperatura_externa'] ?? 0),
            'humedadExterna' => (float) ($r['humedad_externa'] ?? 0),
            'puntoDeRocio' => (float) ($r['punto_de_rocio'] ?? 0),
            'luz' => (float) ($r['luxer_intencidad'] ?? 0),
            'uv' => (float) ($r['luxer_uv'] ?? 0),
            'vientoVelocidad' => (float) ($r['viento_velocidad'] ?? 0),
            'vientoRafagas' => (float) ($r['viento_rafagas'] ?? 0),
            'vientoDireccion' => (string) ($r['viento_direccion_nombre'] ?? ''),
            'presionRelativa' => (float) ($r['presion_relativa'] ?? 0),
            'lluviaHora' => (float) ($r['lluvia_acumulado_hora'] ?? 0),
            'lluviaDiaria' => (float) ($r['lluvia_acumulado_diario'] ?? 0),
        ];

        return ['estacion' => $estacion, 'registro' => $registro, 'obtenidoEn' => date('c')];
    }

    private function leerCache(): ?array
    {
        if (!is_file($this->archivoCache) || (time() - filemtime($this->archivoCache)) > self::CACHE_SEGUNDOS) {
            return null;
        }
        $json = file_get_contents($this->archivoCache);
        return is_string($json) ? json_decode($json, true) ?: null : null;
    }

    private function guardarCache(array $datos): void
    {
        @file_put_contents($this->archivoCache, json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}