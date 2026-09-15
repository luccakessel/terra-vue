<?php

declare(strict_types=1);

use GreenSense\Dominio\Configuracion;
use GreenSense\Http\Respuesta;
use GreenSense\Http\Router;
use GreenSense\Persistencia\Conexion;
use GreenSense\Persistencia\RepositorioAlertas;
use GreenSense\Persistencia\RepositorioConfiguracion;
use GreenSense\Persistencia\RepositorioInvernaderos;
use GreenSense\Persistencia\RepositorioRiego;
use GreenSense\Persistencia\RepositorioUsuarios;
use GreenSense\Servicios\Alertas;
use GreenSense\Servicios\Autenticacion;
use GreenSense\Servicios\EmaCenter;
use GreenSense\Servicios\Riego;
use GreenSense\Servicios\Simulador;

require dirname(__DIR__) . '/vendor/autoload.php';

// --- Composition root: se arman las dependencias y se inyectan hacia abajo.

$conexion = Conexion::instancia();

$auth = new Autenticacion(
    new RepositorioUsuarios($conexion),
    getenv('GREENSENSE_SECRETO') ?: 'greenSense-dev-secreto-cambiar-en-produccion'
);
$invernaderos = new RepositorioInvernaderos($conexion);
$alertasRepo = new RepositorioAlertas($conexion);
$configuraciones = new RepositorioConfiguracion($conexion);
$riesgos = new RepositorioRiego($conexion);
$simulador = new Simulador();
$ema = new EmaCenter();
$alertas = new Alertas($alertasRepo);
$riego = new Riego($riesgos, $configuraciones);

$ahora = fn (): string => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c');

$router = new Router($auth);

// --- Rutas públicas ---------------------------------------------------------

$router->post('/api/auth/login', function (Router $r) use ($auth): array {
    $dato = $r->cuerpo();
    $sesion = $auth->login(trim((string) ($dato['email'] ?? '')), (string) ($dato['password'] ?? ''));
    if ($sesion === null) {
        Respuesta::error('Credenciales inválidas.', 401);
    }
    return $sesion;
}, publico: true);

$router->get('/api/reportes/:tipo', function (Router $r, array $p) use ($alertasRepo, $riesgos, $ahora): void {
    $desde = $r->consulta('desde') ?? (new DateTimeImmutable('-7 days'))->format('c');
    $hasta = $r->consulta('hasta') ?? $ahora();

    $reporte = match ($p['tipo']) {
        'riego' => [
            'encabezados' => ['Fecha', 'Invernadero', 'Tipo', 'Duracion (min)', 'Litros', 'Activado por'],
            'filas' => array_map(fn ($f) => [$f['fecha_inicio'], $f['invernadero'], $f['tipo'], (int) $f['duracion_min'], round((float) $f['litros'], 1), $f['activado_por']], $riesgos->eventos($desde, $hasta)),
        ],
        'consumo' => [
            'encabezados' => ['Fecha', 'Litros'],
            'filas' => array_map(fn ($f) => [$f['fecha'], round((float) $f['litros'], 1)], $riesgos->consumoPorDia($desde, $hasta)),
        ],
        'alertas' => [
            'encabezados' => ['Fecha', 'Invernadero', 'Sensor', 'Nivel', 'Valor', 'Umbral', 'Mensaje'],
            'filas' => array_map(fn ($f) => [$f['fecha'], $f['invernadero'], $f['sensor'], $f['nivel'], round((float) $f['valor'], 1), round((float) $f['umbral'], 1), $f['mensaje']], $alertasRepo->conInvernadero($desde, $hasta)),
        ],
        default => Respuesta::error("Tipo de reporte desconocido: {$p['tipo']}", 422),
    };

    $excel = $r->consulta('formato', 'csv') === 'excel';

    if ($excel) {
        $celda = static fn (mixed $v): string => '<td>' . htmlspecialchars((string) $v) . '</td>';
        $celdaEnc = static fn (string $v): string => '<th>' . htmlspecialchars($v) . '</th>';
        $cuerpo = implode('', array_map(fn ($enc) => $celdaEnc($enc), $reporte['encabezados']));
        $cuerpo .= '</tr>';
        foreach ($reporte['filas'] as $fila) {
            $cuerpo .= '<tr>' . implode('', array_map($celda, $fila)) . '</tr>';
        }
        $contenido = '<html><head><meta charset="utf-8"><style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 10px}</style></head>'
            . '<body><table><tr>' . $cuerpo . '</table></body></html>';
    } else {
        $escapar = static fn (mixed $v): string => '"' . str_replace(['"', "\n", "\r"], ['""', ' ', ' '], (string) $v) . '"';
        $lineas = [implode(';', array_map($escapar, $reporte['encabezados']))];
        foreach ($reporte['filas'] as $fila) {
            $lineas[] = implode(';', array_map($escapar, $fila));
        }
        $contenido = "\xEF\xBB\xBF" . implode("\r\n", $lineas);
    }

    Respuesta::archivo(
        $contenido,
        "reporte_{$p['tipo']}." . ($excel ? 'xls' : 'csv'),
        $excel ? 'application/vnd.ms-excel' : 'text/csv; charset=utf-8'
    );
}, publico: true);

// --- Rutas protegidas por token ---------------------------------------------

$router->get('/api/contexto-climatico', function (Router $r, array $p) use ($ema): ?array {
    $contexto = $ema->contexto();
    if ($contexto === null) {
        Respuesta::error('Datos meteorológicos no disponibles en este momento.', 503);
    }
    return $contexto;
});

$router->get('/api/invernaderos', fn (Router $r, array $p) => $invernaderos->listarPorUsuario($p['usuarioId']));

$router->get('/api/invernaderos/:id/lecturas', function (Router $r, array $p) use ($simulador): array {
    $hasta = $r->consulta('hasta') ?? (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c');
    $desde = $r->consulta('desde') ?? (new DateTimeImmutable($hasta))->modify('-24 hours')->format('c');
    return $simulador->historico((string) $p['id'], $desde, $hasta);
});

$router->get('/api/invernaderos/:id/lecturas/ultima', fn (Router $r, array $p) => $simulador->ultima((string) $p['id']));

$router->get('/api/invernaderos/:id/alertas', function (Router $r, array $p) use ($invernaderos, $alertasRepo): array {
    if ($invernaderos->buscar((int) $p['id']) === null) {
        Respuesta::error('Invernadero no encontrado.', 404);
    }
    return $alertasRepo->listarPorInvernadero((int) $p['id']);
});

$router->get('/api/invernaderos/:id/riego', fn (Router $r, array $p) => $riego->estado((int) $p['id']));

$router->post('/api/invernaderos/:id/riego', function (Router $r, array $p) use ($riego) {
    $activar = filter_var($r->cuerpo()['activar'] ?? false, FILTER_VALIDATE_BOOL);
    return $activar ? $riego->activar((int) $p['id'], 'productor') : $riego->desactivar((int) $p['id']);
});

$router->get('/api/invernaderos/:id/configuracion', function (Router $r, array $p) use ($configuraciones): Configuracion {
    $datos = $configuraciones->obtener((int) $p['id']);
    if ($datos === null) {
        Respuesta::error('Invernadero no encontrado.', 404);
    }
    return Configuracion::desdePersistencia((int) $p['id'], $datos[0], $datos[1], $datos[2]);
});

$router->put('/api/invernaderos/:id/configuracion', function (Router $r, array $p) use ($configuraciones, $simulador, $alertas, $invernaderos): Configuracion {
    if ($invernaderos->buscar((int) $p['id']) === null) {
        Respuesta::error('Invernadero no encontrado.', 404);
    }
    try {
        $configuracion = Configuracion::desdeJson((int) $p['id'], $r->cuerpo());
    } catch (InvalidArgumentException $e) {
        Respuesta::error($e->getMessage(), 422);
    }
    $configuraciones->guardar((int) $p['id'], $configuracion);
    // Evalúa la lectura actual con las nuevas reglas: si ya se vulneran, genera alerta.
    $alertas->evaluarLectura($simulador->ultima((string) $p['id']), (int) $p['id'], $configuracion);
    return $configuracion;
});

try {
    $router->despachar();
} catch (Throwable $t) {
    Respuesta::error('Error interno del servidor: ' . $t->getMessage(), 500);
}