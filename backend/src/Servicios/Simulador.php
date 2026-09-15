<?php

declare(strict_types=1);

namespace GreenSense\Servicios;

use DateTimeImmutable;
use DateTimeZone;
use GreenSense\Dominio\Lectura;

/**
 * Simula las lecturas de los sensores con un patrón día/noche realista y
 * datos deterministas (misma base que el mock del frontend) hasta que
 * existan sensores físicos conectados al backend.
 */
final class Simulador
{
    private const AMANECER = 6;
    private const ATARDECER = 20;
    private const ZONA_LOCAL = 'America/Argentina/Buenos_Aires';

    /** Determina el paso de muestreo según el rango pedido. */
    public function pasoMinutos(DateTimeImmutable $desde, DateTimeImmutable $hasta): int
    {
        $horas = ($hasta->getTimestamp() - $desde->getTimestamp()) / 3600;
        return $horas <= 36 ? 15 : ($horas <= 240 ? 60 : 180);
    }

    /** @return Lectura[] serie ascendente desde `desde` hasta `hasta` */
    public function historico(string $invernaderoId, string $desde, string $hasta): array
    {
        $desdeDt = new DateTimeImmutable($desde);
        $hastaDt = new DateTimeImmutable($hasta);
        $paso = $this->pasoMinutos($desdeDt, $hastaDt);
        $puntos = (int) floor(($hastaDt->getTimestamp() - $desdeDt->getTimestamp()) / ($paso * 60));
        $semilla = (float) (ord($invernaderoId[strlen($invernaderoId) - 1] ?? '1'));

        $suelo = 58.0;
        $utc = new DateTimeZone('UTC');
        $lecturas = [];

        for ($i = 0; $i <= $puntos; $i++) {
            $fechaUtc = $desdeDt->setTimezone($utc)->modify('+' . ($i * $paso) . ' minutes');
            $horaLocal = (float) $fechaUtc->setTimezone(new DateTimeZone(self::ZONA_LOCAL))->format('H.i');
            $s = $semilla + $i;

            $luz = round($this->sol($horaLocal) * 1900 + $this->ruido($s) * 90);

            $solR = $this->sol(max(0.0, $horaLocal - 2.0));
            $temperatura = 16 + $solR * 16 + $this->ruido($s + 7) * 1.6;
            $humedadAmbiente = 88 - $solR * 42 + $this->ruido($s + 13) * 4.0;

            $esRiego = ($horaLocal >= 7 && $horaLocal < 7.5) || ($horaLocal >= 19 && $horaLocal < 19.5);
            $suelo = $esRiego ? min(68.0, $suelo + 6.0) : max(21.0, $suelo - (0.35 + $this->sol($horaLocal) * 0.55));
            $humedadSuelo = $suelo + $this->ruido($s + 21) * 1.2;

            $lecturas[] = new Lectura(
                $fechaUtc->format('c'),
                round($humedadSuelo, 1),
                round($temperatura, 1),
                round($humedadAmbiente, 1),
                $luz
            );
        }
        return $lecturas;
    }

    /** Última lectura disponible (estado actual del invernadero). */
    public function ultima(string $invernaderoId): Lectura
    {
        $ahora = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $serie = $this->historico($invernaderoId, $ahora->modify('-30 minutes')->format('c'), $ahora->format('c'));
        return $serie[count($serie) - 1];
    }

    private function ruido(float $semilla): float
    {
        $x = sin($semilla * 12.9898) * 43758.5453;
        return $x - floor($x);
    }

    /** Factor de luz solar [0..1] según la hora decimal local. */
    private function sol(float $hora): float
    {
        if ($hora < self::AMANECER || $hora > self::ATARDECER) {
            return 0.0;
        }
        return sin(M_PI * ($hora - self::AMANECER) / (self::ATARDECER - self::AMANECER));
    }
}