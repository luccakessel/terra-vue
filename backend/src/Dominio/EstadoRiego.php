<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

/**
 * Estado actual del riego de un invernadero.
 */
final class EstadoRiego
{
    public const CAUDAL_LITROS_POR_MIN = 4.0;

    public function __construct(
        private bool $activo,
        private ?string $ultimoRiego,
        private ?string $proximoRiego,
        private float $litrosHoy
    ) {
    }

    public function activo(): bool
    {
        return $this->activo;
    }

    public function litrosHoy(): float
    {
        return $this->litrosHoy;
    }

    public function toJson(): array
    {
        return [
            'activo' => $this->activo,
            'ultimoRiego' => $this->ultimoRiego,
            'proximoRiego' => $this->proximoRiego,
            'litrosHoy' => round($this->litrosHoy, 1),
        ];
    }
}