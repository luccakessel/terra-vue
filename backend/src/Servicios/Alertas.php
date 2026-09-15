<?php

declare(strict_types=1);

namespace GreenSense\Servicios;

use DateTimeImmutable;
use DateTimeZone;
use GreenSense\Dominio\Alerta;
use GreenSense\Dominio\Configuracion;
use GreenSense\Dominio\Lectura;
use GreenSense\Dominio\NivelAlerta;
use GreenSense\Dominio\SensorId;
use GreenSense\Dominio\Umbral;
use GreenSense\Persistencia\RepositorioAlertas;

/**
 * Estrategia de análisis de un sensor (patrón Strategy). Cada sensor
 * aporta su propia regla de severidad y su mensaje.
 */
interface EstrategiaAlerta
{
    public function sensor(): string;

    /** @return array{nivel:string, mensaje:string, umbral:float}|null */
    public function analizar(float $valor, Umbral $umbral): ?array;
}

/**
 * Base común: la regla de severidad la resuelve la entidad Umbral y cada
 * estrategia solo describe su sensor y el texto del mensaje (Template Method).
 */
abstract class EstrategiaUmbral implements EstrategiaAlerta
{
    final public function analizar(float $valor, Umbral $umbral): ?array
    {
        $estado = $umbral->evaluar($valor);
        if ($estado === Umbral::OK) {
            return null;
        }
        return [
            'nivel' => $estado === Umbral::CRITICO ? NivelAlerta::CRITICA : NivelAlerta::ADVERTENCIA,
            'mensaje' => $this->mensaje($estado, $valor, $umbral),
            'umbral' => $valor < $umbral->min() ? $umbral->min() : $umbral->max(),
        ];
    }

    abstract protected function mensaje(string $estado, float $valor, Umbral $umbral): string;
}

final class EstrategiaHumedadSuelo extends EstrategiaUmbral
{
    public function sensor(): string
    {
        return SensorId::HUMEDAD_SUELO;
    }

    protected function mensaje(string $estado, float $valor, Umbral $umbral): string
    {
        if ($estado === Umbral::CRITICO) {
            return 'Humedad de suelo por debajo del mínimo crítico. Riego de emergencia sugerido.';
        }
        return $valor < $umbral->min()
            ? 'Humedad de suelo cerca del límite inferior; verificar riego programado.'
            : 'Humedad de suelo sobre el máximo; revisar drenaje.';
    }
}

final class EstrategiaTemperatura extends EstrategiaUmbral
{
    public function sensor(): string
    {
        return SensorId::TEMPERATURA;
    }

    protected function mensaje(string $estado, float $valor, Umbral $umbral): string
    {
        if ($estado === Umbral::CRITICO) {
            return $valor > $umbral->max()
                ? 'Temperatura sobre el máximo crítico. Ventilar el invernadero.'
                : 'Temperatura bajo el mínimo crítico. Riesgo de helada.';
        }
        return 'Temperatura fuera del rango configurado; monitorear evolución.';
    }
}

final class EstrategiaHumedadAmbiente extends EstrategiaUmbral
{
    public function sensor(): string
    {
        return SensorId::HUMEDAD_AMBIENTE;
    }

    protected function mensaje(string $estado, float $valor, Umbral $umbral): string
    {
        if ($estado === Umbral::CRITICO) {
            return $valor > $umbral->max()
                ? 'Humedad ambiente crítica: riesgo de hongos en cultivo.'
                : 'Humedad ambiente crítica: exceso de evaporación.';
        }
        return $valor > $umbral->max()
            ? 'Humedad ambiente elevada: posible riesgo de hongos.'
            : 'Humedad ambiente baja: conviene humidificar.';
    }
}

final class EstrategiaLuz extends EstrategiaUmbral
{
    public function sensor(): string
    {
        return SensorId::LUZ;
    }

    protected function mensaje(string $estado, float $valor, Umbral $umbral): string
    {
        if ($estado === Umbral::CRITICO) {
            return 'Luminosidad insuficiente al mediodía. Verificar sombreado o sensor.';
        }
        return $valor < $umbral->min()
            ? 'Luminosidad baja respecto del rango configurado.'
            : 'Luminosidad muy alta: evaluar sombreado del invernadero.';
    }
}

/**
 * Orquesta las estrategias: evalúa una lectura contra la configuración y
 * registra las alertas nuevas (sin repetir el mismo sensor en la ventana).
 */
final class Alertas
{
    public const VENTANA_MINUTOS = 60;

    /** @var array<string, EstrategiaAlerta> */
    private array $estrategias;

    public function __construct(private RepositorioAlertas $repositorio)
    {
        $this->estrategias = [];
        foreach ([new EstrategiaHumedadSuelo(), new EstrategiaTemperatura(), new EstrategiaHumedadAmbiente(), new EstrategiaLuz()] as $estrategia) {
            $this->estrategias[$estrategia->sensor()] = $estrategia;
        }
    }

    /** @return array<int, array<string, mixed>> alertas generadas (JSON) */
    public function evaluarLectura(Lectura $lectura, int $invernaderoId, Configuracion $configuracion): array
    {
        $generadas = [];
        foreach ($this->estrategias as $sensor => $estrategia) {
            $umbral = $configuracion->umbralPara($sensor);
            $evaluacion = $estrategia->analizar($lectura->sensor($sensor), $umbral);
            if ($evaluacion === null
                || $this->repositorio->existeReciente($invernaderoId, $sensor, self::VENTANA_MINUTOS)
            ) {
                continue;
            }
            $alerta = new Alerta(
                'al-' . bin2hex(random_bytes(4)),
                $invernaderoId,
                (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c'),
                $sensor,
                $evaluacion['nivel'],
                $lectura->sensor($sensor),
                $evaluacion['umbral'],
                $evaluacion['mensaje'],
                false
            );
            $this->repositorio->guardar($alerta);
            $generadas[] = $alerta->toJson();
        }
        return $generadas;
    }
}