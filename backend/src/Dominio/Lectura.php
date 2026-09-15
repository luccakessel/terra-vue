<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

/**
 * Lectura puntual: un timestamp con el valor de los cuatro sensores.
 */
final class Lectura
{
    public function __construct(
        private string $timestamp,
        private float $humedadSuelo,
        private float $temperatura,
        private float $humedadAmbiente,
        private float $luz
    ) {
    }

    public function timestamp(): string
    {
        return $this->timestamp;
    }

    /** Valor de un sensor específico (delega la validación del nombre). */
    public function sensor(string $sensor): float
    {
        SensorId::validar($sensor);
        return match ($sensor) {
            SensorId::HUMEDAD_SUELO => $this->humedadSuelo,
            SensorId::TEMPERATURA => $this->temperatura,
            SensorId::HUMEDAD_AMBIENTE => $this->humedadAmbiente,
            default => $this->luz,
        };
    }

    /** Serialización con el contrato JSON del frontend. */
    public function toJson(): array
    {
        return [
            'timestamp' => $this->timestamp,
            'humedadSuelo' => round($this->humedadSuelo, 1),
            'temperatura' => round($this->temperatura, 1),
            'humedadAmbiente' => round($this->humedadAmbiente, 1),
            'luz' => round($this->luz, 1),
        ];
    }
}