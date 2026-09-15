<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

/**
 * Alerta generada cuando una lectura sale de los umbrales configurados.
 */
final class Alerta
{
    public function __construct(
        private string $id,
        private int $invernaderoId,
        private string $fecha,
        private string $sensor,
        private string $nivel,
        private float $valor,
        private float $umbral,
        private string $mensaje,
        private bool $vista
    ) {
        SensorId::validar($sensor);
        NivelAlerta::validar($nivel);
    }

    public function invernaderoId(): int
    {
        return $this->invernaderoId;
    }

    public function sensor(): string
    {
        return $this->sensor;
    }

    public function toJson(): array
    {
        return [
            'id' => $this->id,
            'invernaderoId' => (string) $this->invernaderoId,
            'fecha' => $this->fecha,
            'sensor' => $this->sensor,
            'nivel' => $this->nivel,
            'valor' => round($this->valor, 1),
            'umbral' => round($this->umbral, 1),
            'mensaje' => $this->mensaje,
            'vista' => $this->vista,
        ];
    }
}