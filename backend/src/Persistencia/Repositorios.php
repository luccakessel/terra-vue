<?php

declare(strict_types=1);

namespace GreenSense\Persistencia;

use GreenSense\Dominio\Alerta;
use GreenSense\Dominio\Configuracion;
use GreenSense\Dominio\EstadoRiego;
use GreenSense\Dominio\HorarioRiego;
use GreenSense\Dominio\Invernadero;
use GreenSense\Dominio\SensorId;
use GreenSense\Dominio\Umbral;

/**
 * Usuarios registrados del sistema.
 */
final class RepositorioUsuarios extends Repositorio
{
    /** @return array{id:int,nombre:string,email:string,password_hash:string}|null */
    public function buscarPorEmail(string $email): ?array
    {
        return $this->fila('SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?', [$email]);
    }
}

/**
 * Invernaderos del productor.
 */
final class RepositorioInvernaderos extends Repositorio
{
    /** @return Invernadero[] */
    public function listarPorUsuario(int $usuarioId): array
    {
        $filas = $this->filas(
            'SELECT id, nombre, ubicacion, cultivo, en_linea FROM invernaderos WHERE usuario_id = ? ORDER BY id',
            [$usuarioId]
        );
        return array_map(fn (array $f): Invernadero => $this->desdeFila($f), $filas);
    }

    public function buscar(int $id): ?Invernadero
    {
        $fila = $this->fila('SELECT id, nombre, ubicacion, cultivo, en_linea FROM invernaderos WHERE id = ?', [$id]);
        return $fila === null ? null : $this->desdeFila($fila);
    }

    private function desdeFila(array $fila): Invernadero
    {
        return new Invernadero(
            (int) $fila['id'],
            $fila['nombre'],
            $fila['ubicacion'],
            $fila['cultivo'],
            (bool) $fila['en_linea']
        );
    }
}

/**
 * Alertas registradas, con una consulta global para los reportes.
 */
final class RepositorioAlertas extends Repositorio
{
    /** @return Alerta[] */
    public function listarPorInvernadero(int $invernaderoId): array
    {
        $filas = $this->filas(
            'SELECT id, invernadero_id, fecha, sensor, nivel, valor, umbral, mensaje, vista
             FROM alertas WHERE invernadero_id = ? ORDER BY fecha DESC',
            [$invernaderoId]
        );
        return array_map(fn (array $f): Alerta => $this->desdeFila($f), $filas);
    }

    public function existeReciente(int $invernaderoId, string $sensor, int $minutos): bool
    {
        $desde = (new \DateTimeImmutable("-{$minutos} minutes"))->format('Y-m-d H:i:s');
        $fila = $this->fila(
            'SELECT COUNT(*) AS n FROM alertas
             WHERE invernadero_id = ? AND sensor = ? AND fecha >= ?',
            [$invernaderoId, $sensor, $desde]
        );
        return (int) ($fila['n'] ?? 0) > 0;
    }

    public function guardar(Alerta $alerta): void
    {
        $j = $alerta->toJson();
        $this->insertar(
            'INSERT INTO alertas (invernadero_id, fecha, sensor, nivel, valor, umbral, mensaje, vista)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [(int) $j['invernaderoId'], $j['fecha'], $j['sensor'], $j['nivel'], $j['valor'], $j['umbral'], $j['mensaje'], $j['vista'] ? 1 : 0]
        );
    }

    /** @return array<int, array<string, mixed>> filas para el reporte */
    public function conInvernadero(string $desde, string $hasta): array
    {
        return $this->filas(
            'SELECT a.fecha, i.nombre AS invernadero, a.sensor, a.nivel, a.valor, a.umbral, a.mensaje
             FROM alertas a JOIN invernaderos i ON i.id = a.invernadero_id
             WHERE a.fecha >= ? AND a.fecha <= ? ORDER BY a.fecha DESC',
            [$desde, $hasta]
        );
    }

    private function desdeFila(array $fila): Alerta
    {
        return new Alerta(
            (string) $fila['id'],
            (int) $fila['invernadero_id'],
            $fila['fecha'],
            $fila['sensor'],
            $fila['nivel'],
            (float) $fila['valor'],
            (float) $fila['umbral'],
            $fila['mensaje'],
            (bool) $fila['vista']
        );
    }
}

/**
 * Configuración (umbrales + horarios + riego automático) de un invernadero.
 */
final class RepositorioConfiguracion extends Repositorio
{
    public function obtener(int $invernaderoId): ?array
    {
        $confId = $this->confIdDe($invernaderoId);
        if ($confId === null) {
            return null;
        }
        $umbrales = [];
        foreach ($this->filas('SELECT sensor, min, max FROM umbrales WHERE configuracion_id = ?', [$confId]) as $f) {
            $umbrales[$f['sensor']] = new Umbral((float) $f['min'], (float) $f['max']);
        }
        foreach (SensorId::todos() as $sensor) {
            $umbrales[$sensor] ??= new Umbral(0, 100);
        }
        $horarios = array_map(
            fn (array $f): HorarioRiego => new HorarioRiego(
                (string) $f['id'],
                $f['hora'],
                (int) $f['duracion_min'],
                (bool) $f['activo']
            ),
            $this->filas('SELECT id, hora, duracion_min, activo FROM horarios_riego WHERE configuracion_id = ? ORDER BY hora', [$confId])
        );
        $riegoAutomatico = (bool) $this->fila('SELECT riego_automatico FROM configuraciones WHERE id = ?', [$confId])['riego_automatico'];

        return [$riegoAutomatico, $umbrales, $horarios];
    }

    public function existe(int $invernaderoId): bool
    {
        return $this->confIdDe($invernaderoId) !== null;
    }

    /** Reemplaza por completo la configuración del invernadero. */
    public function guardar(int $invernaderoId, Configuracion $configuracion): void
    {
        $pdo = $this->pdo();
        $pdo->beginTransaction();
        try {
            $confId = $this->confIdDe($invernaderoId);
            $pdo->prepare('UPDATE configuraciones SET riego_automatico = ? WHERE id = ?')
                ->execute([$configuracion->riegoAutomatico() ? 1 : 0, $confId]);
            $pdo->prepare('DELETE FROM umbrales WHERE configuracion_id = ?')->execute([$confId]);
            foreach ($configuracion->umbrales() as $sensor => $umbral) {
                $this->ejecutar('INSERT INTO umbrales (configuracion_id, sensor, min, max) VALUES (?, ?, ?, ?)', [$confId, $sensor, $umbral->min(), $umbral->max()]);
            }
            $pdo->prepare('DELETE FROM horarios_riego WHERE configuracion_id = ?')->execute([$confId]);
            foreach ($configuracion->horarios() as $horario) {
                $this->ejecutar('INSERT INTO horarios_riego (configuracion_id, hora, duracion_min, activo) VALUES (?, ?, ?, ?)', [$confId, $horario->hora(), $horario->duracionMin(), $horario->activo() ? 1 : 0]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private function confIdDe(int $invernaderoId): ?int
    {
        $fila = $this->fila('SELECT id FROM configuraciones WHERE invernadero_id = ?', [$invernaderoId]);
        return $fila === null ? null : (int) $fila['id'];
    }
}

/**
 * Estado actual del riego y su historial de eventos.
 */
final class RepositorioRiego extends Repositorio
{
    public function estado(int $invernaderoId): EstadoRiego
    {
        $fila = $this->fila(
            'SELECT activo, ultimo_riego, proximo_riego, litros_hoy FROM riego_estado WHERE invernadero_id = ?',
            [$invernaderoId]
        );
        if ($fila === null) {
            return new EstadoRiego(false, null, null, 0.0);
        }
        return new EstadoRiego(
            (bool) $fila['activo'],
            $fila['ultimo_riego'],
            $fila['proximo_riego'],
            (float) $fila['litros_hoy']
        );
    }

    public function guardarEstado(int $invernaderoId, EstadoRiego $estado): void
    {
        $j = $estado->toJson();
        $this->ejecutar(
            'INSERT INTO riego_estado (invernadero_id, activo, ultimo_riego, proximo_riego, litros_hoy)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (invernadero_id) DO UPDATE SET
                activo = excluded.activo, ultimo_riego = excluded.ultimo_riego,
                proximo_riego = excluded.proximo_riego, litros_hoy = excluded.litros_hoy',
            [$invernaderoId, $j['activo'] ? 1 : 0, $j['ultimoRiego'], $j['proximoRiego'], $j['litrosHoy']]
        );
    }

    public function registrarEvento(int $invernaderoId, string $tipo, string $fecha, int $duracionMin, string $activadoPor): void
    {
        $litros = $duracionMin * EstadoRiego::CAUDAL_LITROS_POR_MIN;
        $this->insertar(
            'INSERT INTO riegos (invernadero_id, tipo, fecha_inicio, duracion_min, litros, activado_por) VALUES (?, ?, ?, ?, ?, ?)',
            [$invernaderoId, $tipo, $fecha, $duracionMin, $litros, $activadoPor]
        );
    }

    /** @return array<int, array<string, mixed>> eventos para el reporte */
    public function eventos(string $desde, string $hasta): array
    {
        return $this->filas(
            'SELECT r.fecha_inicio, i.nombre AS invernadero, r.tipo, r.duracion_min, r.litros, r.activado_por
             FROM riegos r JOIN invernaderos i ON i.id = r.invernadero_id
             WHERE r.fecha_inicio >= ? AND r.fecha_inicio <= ? ORDER BY r.fecha_inicio DESC',
            [$desde, $hasta]
        );
    }

    /** @return array<int, array<string, mixed>> litros totales por día */
    public function consumoPorDia(string $desde, string $hasta): array
    {
        return $this->filas(
            'SELECT date(fecha_inicio) AS fecha, SUM(litros) AS litros
             FROM riegos WHERE fecha_inicio >= ? AND fecha_inicio <= ?
             GROUP BY date(fecha_inicio) ORDER BY fecha',
            [$desde, $hasta]
        );
    }
}