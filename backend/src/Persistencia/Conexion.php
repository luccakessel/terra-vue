<?php

declare(strict_types=1);

namespace GreenSense\Persistencia;

use PDO;

/**
 * Conexión única a SQLite (patrón Singleton). Al crear la instancia por
 * primera vez también deja el esquema listo y siembra datos de ejemplo.
 */
final class Conexion
{
    private static ?Conexion $instancia = null;

    private PDO $pdo;

    private function __construct()
    {
        $directorio = dirname(__DIR__, 2) . '/var';
        if (!is_dir($directorio)) {
            mkdir($directorio, 0777, true);
        }
        $this->pdo = new PDO('sqlite:' . $directorio . '/greensense.sqlite');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->pdo->exec('PRAGMA foreign_keys = ON;');

        $this->esquema();
        $this->sembrar();
    }

    public static function instancia(): self
    {
        return self::$instancia ??= new self();
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    private function esquema(): void
    {
        $this->pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    creado_en     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invernaderos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    ubicacion  TEXT NOT NULL,
    cultivo    TEXT NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    en_linea   INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS configuraciones (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    invernadero_id   INTEGER NOT NULL UNIQUE REFERENCES invernaderos(id),
    riego_automatico INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS umbrales (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    configuracion_id INTEGER NOT NULL REFERENCES configuraciones(id),
    sensor           TEXT NOT NULL,
    min              REAL NOT NULL,
    max              REAL NOT NULL,
    UNIQUE (configuracion_id, sensor)
);
CREATE TABLE IF NOT EXISTS horarios_riego (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    configuracion_id INTEGER NOT NULL REFERENCES configuraciones(id),
    hora             TEXT NOT NULL,
    duracion_min     INTEGER NOT NULL,
    activo           INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS alertas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    invernadero_id INTEGER NOT NULL REFERENCES invernaderos(id),
    fecha          TEXT NOT NULL,
    sensor         TEXT NOT NULL,
    nivel          TEXT NOT NULL,
    valor          REAL NOT NULL,
    umbral         REAL NOT NULL,
    mensaje        TEXT NOT NULL,
    vista          INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS riego_estado (
    invernadero_id INTEGER PRIMARY KEY REFERENCES invernaderos(id),
    activo         INTEGER NOT NULL DEFAULT 0,
    ultimo_riego   TEXT,
    proximo_riego  TEXT,
    litros_hoy     REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS riegos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    invernadero_id INTEGER NOT NULL REFERENCES invernaderos(id),
    tipo           TEXT NOT NULL,
    fecha_inicio   TEXT NOT NULL,
    duracion_min   INTEGER NOT NULL,
    litros         REAL NOT NULL,
    activado_por   TEXT NOT NULL
);
SQL);
    }

    private function sembrar(): void
    {
        $yaSembrado = (int) $this->pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
        if ($yaSembrado > 0) {
            return;
        }

        $this->pdo->beginTransaction();
        $ahora = (new \DateTimeImmutable())->format('c');
        $this->pdo->prepare('INSERT INTO usuarios (nombre, email, password_hash, creado_en) VALUES (?, ?, ?, ?)')
            ->execute(['Productor Demo', 'productor@greensense.ar', password_hash('demo1234', PASSWORD_DEFAULT), $ahora]);
        $usuarioId = (int) $this->pdo->lastInsertId();

        $inv = [
            ['Invernadero Norte', 'Lote 3 — Luján, BA', 'Tomate cherry', 1],
            ['Vivero Almácigos', 'Lote 1 — Luján, BA', 'Plantines varios', 1],
            ['Invernadero Sur', 'Lote 7 — Mercedes, BA', 'Lechuga hidropónica', 0],
        ];
        $umbrales = [
            'humedadSuelo' => [25, 65],
            'temperatura' => [15, 32],
            'humedadAmbiente' => [45, 90],
            'luz' => [400, 1800],
        ];

        foreach ($inv as [$nombre, $ubicacion, $cultivo, $enLinea]) {
            $this->pdo->prepare('INSERT INTO invernaderos (nombre, ubicacion, cultivo, usuario_id, en_linea) VALUES (?, ?, ?, ?, ?)')
                ->execute([$nombre, $ubicacion, $cultivo, $usuarioId, $enLinea]);
            $invId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('INSERT INTO configuraciones (invernadero_id, riego_automatico) VALUES (?, 1)')
                ->execute([$invId]);
            $confId = (int) $this->pdo->lastInsertId();

            foreach ($umbrales as $sensor => [$min, $max]) {
                $this->pdo->prepare('INSERT INTO umbrales (configuracion_id, sensor, min, max) VALUES (?, ?, ?, ?)')
                    ->execute([$confId, $sensor, $min, $max]);
            }
            foreach ([[7, 20], [19, 15]] as [$hora, $duracion]) {
                $this->pdo->prepare('INSERT INTO horarios_riego (configuracion_id, hora, duracion_min, activo) VALUES (?, ?, ?, 1)')
                    ->execute([$confId, sprintf('%02d:00', $hora), $duracion]);
            }
            $this->pdo->prepare('INSERT INTO riego_estado (invernadero_id, litros_hoy) VALUES (?, 84.0)')
                ->execute([$invId]);
        }

        $alertas = [
            [1, 'humedadSuelo', 'critica', 18.4, 25, 'Humedad de suelo por debajo del mínimo crítico. Riego de emergencia sugerido.', 0, 4],
            [1, 'temperatura', 'advertencia', 33.6, 32, 'Temperatura sobre el máximo configurado durante 40 minutos.', 1, 2],
            [2, 'humedadAmbiente', 'advertencia', 92.1, 90, 'Humedad ambiente elevada: riesgo de hongos en almácigos.', 1, 3],
            [3, 'luz', 'critica', 120, 400, 'Luminosidad insuficiente al mediodía. Verificar sombreado o sensor.', 0, 3],
        ];
        foreach ($alertas as [$invId, $sensor, $nivel, $valor, $umbral, $mensaje, $vista, $horas]) {
            $fecha = (new \DateTimeImmutable("-{$horas} hours"))->format('c');
            $this->pdo->prepare('INSERT INTO alertas (invernadero_id, fecha, sensor, nivel, valor, umbral, mensaje, vista) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$invId, $fecha, $sensor, $nivel, $valor, $umbral, $mensaje, $vista]);
        }

        $this->pdo->commit();
    }
}