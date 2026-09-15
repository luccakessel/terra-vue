<?php

declare(strict_types=1);

namespace GreenSense\Dominio;

use InvalidArgumentException;

/**
 * Identifica los sensores soportados. Los valores coinciden con los
 * tipos del frontend (src/types/greensense.ts).
 */
final class SensorId
{
    public const HUMEDAD_SUELO = 'humedadSuelo';
    public const TEMPERATURA = 'temperatura';
    public const HUMEDAD_AMBIENTE = 'humedadAmbiente';
    public const LUZ = 'luz';

    /** @return string[] */
    public static function todos(): array
    {
        return [self::HUMEDAD_SUELO, self::TEMPERATURA, self::HUMEDAD_AMBIENTE, self::LUZ];
    }

    public static function esValido(string $id): bool
    {
        return in_array($id, self::todos(), true);
    }

    public static function validar(string $id): void
    {
        if (!self::esValido($id)) {
            throw new InvalidArgumentException("Sensor desconocido: {$id}");
        }
    }
}

/**
 * Nivel de severidad de una alerta (mismo contrato que el frontend).
 */
final class NivelAlerta
{
    public const CRITICA = 'critica';
    public const ADVERTENCIA = 'advertencia';

    public static function esValido(string $nivel): bool
    {
        return in_array($nivel, [self::CRITICA, self::ADVERTENCIA], true);
    }

    public static function validar(string $nivel): void
    {
        if (!self::esValido($nivel)) {
            throw new InvalidArgumentException("Nivel de alerta desconocido: {$nivel}");
        }
    }
}