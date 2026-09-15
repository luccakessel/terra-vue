<?php

declare(strict_types=1);

namespace GreenSense\Persistencia;

use PDO;

/**
 * Base común de los repositorios (herencia). Centraliza el acceso a PDO y
 * los métodos SQL genéricos; cada descendiente expresa su propia lógica.
 */
abstract class Repositorio
{
    public function __construct(protected Conexion $conexion)
    {
    }

    protected function pdo(): PDO
    {
        return $this->conexion->pdo();
    }

    protected function fila(string $sql, array $parametros = []): ?array
    {
        $sent = $this->pdo()->prepare($sql);
        $sent->execute($parametros);
        return $sent->fetch() ?: null;
    }

    /** @return array<int, array<string, mixed>> */
    protected function filas(string $sql, array $parametros = []): array
    {
        $sent = $this->pdo()->prepare($sql);
        $sent->execute($parametros);
        return $sent->fetchAll();
    }

    protected function insertar(string $sql, array $parametros = []): int
    {
        $this->pdo()->prepare($sql)->execute($parametros);
        return (int) $this->pdo()->lastInsertId();
    }

    protected function ejecutar(string $sql, array $parametros = []): void
    {
        $this->pdo()->prepare($sql)->execute($parametros);
    }
}