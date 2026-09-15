<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

use DateTimeImmutable;
use InvalidArgumentException;

/**
 * Umbral: par mínimo/máximo que define el rango aceptable de un sensor.
 * La regla de evaluación vive en la propia entidad (encapsulamiento):
 * hasta el 10 % de exceso del rango se considera advertencia.
 */
final class Umbral
{
    public const OK = 'ok';
    public const ADVERTENCIA = 'advertencia';
    public const CRITICO = 'critico';

    public function __construct(private float $min, private float $max)
    {
    }

    public function min(): float
    {
        return $this->min;
    }

    public function max(): float
    {
        return $this->max;
    }

    public function esCoherente(): bool
    {
        return $this->min < $this->max;
    }

    public function evaluar(float $valor): string
    {
        if ($valor >= $this->min && $valor <= $this->max) {
            return self::OK;
        }
        $margen = max(($this->max - $this->min) * 0.1, 0.5);
        $exceso = $valor < $this->min ? $this->min - $valor : $valor - $this->max;
        return $exceso <= $margen ? self::ADVERTENCIA : self::CRITICO;
    }

    public function toJson(): array
    {
        return ['min' => $this->min, 'max' => $this->max];
    }
}

/**
 * Horario de riego programado dentro de la configuración.
 */
final class HorarioRiego
{
    public function __construct(
        private string $id,
        private string $hora,
        private int $duracionMin,
        private bool $activo
    ) {
    }

    public function hora(): string
    {
        return $this->hora;
    }

    public function duracionMin(): int
    {
        return $this->duracionMin;
    }

    public function activo(): bool
    {
        return $this->activo;
    }

    public function toJson(): array
    {
        return ['id' => $this->id, 'hora' => $this->hora, 'duracionMin' => $this->duracionMin, 'activo' => $this->activo];
    }
}

/**
 * Configuración de un invernadero: compone umbrales por sensor y horarios
 * de riego, y valida el payload que viene del frontend (factoría).
 */
final class Configuracion
{
    /** @param array<string, Umbral>   $umbrales   @param HorarioRiego[] $horarios */
    private function __construct(
        private int $invernaderoId,
        private bool $riegoAutomatico,
        private array $umbrales,
        private array $horarios
    ) {
        foreach (SensorId::todos() as $sensor) {
            if (!isset($this->umbrales[$sensor])) {
                throw new InvalidArgumentException("Falta el umbral del sensor: {$sensor}");
            }
        }
    }

    public function invernaderoId(): int
    {
        return $this->invernaderoId;
    }

    public function riegoAutomatico(): bool
    {
        return $this->riegoAutomatico;
    }

    /** @return array<string, Umbral> */
    public function umbrales(): array
    {
        return $this->umbrales;
    }

    public function umbralPara(string $sensor): Umbral
    {
        SensorId::validar($sensor);
        return $this->umbrales[$sensor];
    }

    /** @return HorarioRiego[] */
    public function horarios(): array
    {
        return $this->horarios;
    }

    /** Crea una Configuracion a partir del JSON que manda el frontend. */
    public static function desdeJson(int $invernaderoId, array $datos): self
    {
        $umbrales = [];
        foreach (SensorId::todos() as $sensor) {
            $def = $datos['umbrales'][$sensor] ?? null;
            if (!is_array($def) || !isset($def['min'], $def['max'])) {
                throw new InvalidArgumentException("Faltan umbrales para el sensor: {$sensor}");
            }
            $umbrales[$sensor] = new Umbral((float) $def['min'], (float) $def['max']);
        }

        $horarios = [];
        foreach ($datos['horarios'] ?? [] as $fila) {
            if (is_array($fila) && isset($fila['hora'], $fila['duracionMin'])) {
                $horarios[] = new HorarioRiego(
                    (string) ($fila['id'] ?? ''),
                    $fila['hora'],
                    (int) $fila['duracionMin'],
                    (bool) ($fila['activo'] ?? true)
                );
            }
        }

        $configuracion = new self($invernaderoId, (bool) ($datos['riegoAutomatico'] ?? true), $umbrales, $horarios);
        if (!$configuracion->esValida()) {
            throw new InvalidArgumentException('Los rangos de umbrales deben ser coherentes (min < max).');
        }
        return $configuracion;
    }

    /** Crea una Configuracion desde filas ya validadas de la base de datos. */
    public static function desdePersistencia(int $invernaderoId, bool $riegoAutomatico, array $umbrales, array $horarios): self
    {
        return new self($invernaderoId, $riegoAutomatico, $umbrales, $horarios);
    }

    public function esValida(): bool
    {
        return !in_array(false, array_map(fn (Umbral $u): bool => $u->esCoherente(), $this->umbrales), true);
    }

    /** Horario programado activo que sigue (o el primero del día). */
    public function proximoHorario(DateTimeImmutable $desde): ?HorarioRiego
    {
        $activos = array_values(array_filter($this->horarios, fn (HorarioRiego $h): bool => $h->activo()));
        usort($activos, fn (HorarioRiego $a, HorarioRiego $b): int => $a->hora() <=> $b->hora());
        foreach ($activos as $horario) {
            [$h, $m] = array_map('intval', explode(':', $horario->hora()));
            if ($desde->setTime($h, $m) >= $desde) {
                return $horario;
            }
        }
        return $activos[0] ?? null;
    }

    public function toJson(): array
    {
        $umbrales = [];
        foreach ($this->umbrales as $sensor => $umbral) {
            $umbrales[$sensor] = $umbral->toJson();
        }
        return [
            'invernaderoId' => (string) $this->invernaderoId,
            'umbrales' => $umbrales,
            'riegoAutomatico' => $this->riegoAutomatico,
            'horarios' => array_map(fn (HorarioRiego $h): array => $h->toJson(), $this->horarios),
        ];
    }
}