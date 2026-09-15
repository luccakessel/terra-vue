<?php

declare(strict_types=1);

namespace GreenSense\Servicios;

use DateTimeImmutable;
use DateTimeZone;
use GreenSense\Dominio\EstadoRiego;
use GreenSense\Persistencia\RepositorioConfiguracion;
use GreenSense\Persistencia\RepositorioRiego;

/**
 * Caso de uso del módulo de riego: consultar el estado y activarlo o
 * desactivarlo manualmente. Al desactivar se calcula el próximo riego
 * según los horarios programados en la configuración.
 */
final class Riego
{
    public const DURACION_MANUAL_MIN = 20;

    public function __construct(
        private RepositorioRiego $repositorio,
        private RepositorioConfiguracion $configuraciones
    ) {
    }

    public function estado(int $invernaderoId): EstadoRiego
    {
        return $this->repositorio->estado($invernaderoId);
    }

    public function activar(int $invernaderoId, string $activadoPor): EstadoRiego
    {
        $estado = $this->repositorio->estado($invernaderoId);
        if ($estado->activo()) {
            return $estado;
        }

        $ahora = $this->ahora();
        $nuevo = new EstadoRiego(
            true,
            $ahora,
            null,
            $estado->litrosHoy() + self::DURACION_MANUAL_MIN * EstadoRiego::CAUDAL_LITROS_POR_MIN
        );
        $this->repositorio->guardarEstado($invernaderoId, $nuevo);
        $this->repositorio->registrarEvento($invernaderoId, 'manual', $ahora, self::DURACION_MANUAL_MIN, $activadoPor);
        return $nuevo;
    }

    public function desactivar(int $invernaderoId): EstadoRiego
    {
        $estado = $this->repositorio->estado($invernaderoId);
        if (!$estado->activo()) {
            return $estado;
        }

        $nuevo = new EstadoRiego(false, $this->ahora(), $this->proximoProgramado($invernaderoId), $estado->litrosHoy());
        $this->repositorio->guardarEstado($invernaderoId, $nuevo);
        return $nuevo;
    }

    /** Próximo horario programado a partir de hoy, o null si no hay. */
    private function proximoProgramado(int $invernaderoId): ?string
    {
        $datos = $this->configuraciones->obtener($invernaderoId);
        if ($datos === null || !$datos[0]) {
            return null;
        }
        $configuracion = \GreenSense\Dominio\Configuracion::desdePersistencia($invernaderoId, $datos[0], $datos[1], $datos[2]);
        $horario = $configuracion->proximoHorario(new DateTimeImmutable('now', new DateTimeZone('UTC')));
        if ($horario === null) {
            return null;
        }
        [$h, $m] = array_map('intval', explode(':', $horario->hora()));
        $proximo = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->setTime($h, $m);
        return ($proximo <= new DateTimeImmutable('now', new DateTimeZone('UTC')) ? $proximo->modify('+1 day') : $proximo)
            ->format('c');
    }

    private function ahora(): string
    {
        return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c');
    }
}