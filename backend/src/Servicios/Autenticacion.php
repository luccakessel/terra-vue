<?php

declare(strict_types=1);

namespace GreenSense\Servicios;

use GreenSense\Persistencia\RepositorioUsuarios;

/**
 * Caso de uso de autenticación: valida credenciales y emite tokens de
 * sesión firmados con HMAC-SHA256.
 */
final class Autenticacion
{
    private const VALIDEZ_SEGUNDOS = 7200;

    public function __construct(private RepositorioUsuarios $usuarios, private string $secreto)
    {
    }

    /** @return array{token:string, nombre:string}|null */
    public function login(string $email, string $contrasena): ?array
    {
        $usuario = $this->usuarios->buscarPorEmail($email);
        if ($usuario === null || !password_verify($contrasena, $usuario['password_hash'])) {
            return null;
        }
        return ['token' => $this->emitirToken((int) $usuario['id'], $usuario['nombre']), 'nombre' => $usuario['nombre']];
    }

    /** Devuelve el usuarioId si el token es válido, sino null. */
    public function usuarioDe(string $token): ?int
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3) {
            return null;
        }
        if (!hash_equals($this->firmar($partes[0] . '.' . $partes[1]), $partes[2])) {
            return null;
        }
        $datos = json_decode($this->decodificar($partes[1]), true);
        if (!is_array($datos) || ($datos['exp'] ?? 0) < time()) {
            return null;
        }
        return (int) ($datos['sub'] ?? 0);
    }

    private function emitirToken(int $usuarioId, string $nombre): string
    {
        $cabecera = $this->codificar(json_encode(['alg' => 'HS256'], JSON_THROW_ON_ERROR));
        $cuerpo = $this->codificar(json_encode([
            'sub' => $usuarioId,
            'nombre' => $nombre,
            'iat' => time(),
            'exp' => time() + self::VALIDEZ_SEGUNDOS,
        ], JSON_THROW_ON_ERROR));
        return $cabecera . '.' . $cuerpo . '.' . $this->firmar($cabecera . '.' . $cuerpo);
    }

    private function firmar(string $datos): string
    {
        return $this->codificar(hash_hmac('sha256', $datos, $this->secreto, true));
    }

    private function codificar(string $datos): string
    {
        return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
    }

    private function decodificar(string $datos): string
    {
        return base64_decode(strtr($datos, '-_', '+/')) ?: '';
    }
}