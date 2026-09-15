# -*- coding: utf-8 -*-
"""Genera el informe de GreenSense (Taller de Integración) en .docx
con diagramas creados con matplotlib. Fuentes de diagrama duplicadas."""

import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Ellipse, Circle

from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

TMP = r"C:\Users\Lucca\AppData\Local\Temp\opencode"
OUT = r"C:\Users\Lucca\Downloads\terra-vue-main\Informe_GreenSense_Taller_de_Integracion_v3.docx"

VERDE = "#15803d"
VERDE_CLARO = "#dcfce7"
AZUL = "#1d4ed8"
AZUL_CLARO = "#dbeafe"
GRIS = "#475569"

plt.rcParams["font.family"] = "DejaVu Sans"


def fig_auto(nombre, w, h):
    f = plt.figure(figsize=(w, h), dpi=170)
    ax = f.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, w * 4)
    ax.set_ylim(0, h * 4)
    ax.axis("off")
    return f, ax


def guardar(f, nombre):
    ruta = os.path.join(TMP, nombre)
    f.savefig(ruta, dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(f)
    return ruta


def caja_auto(ax, x, y, nombre, attrs, fnom=17, fatr=12.5, line=2.0,
              header=2.1, pad=1.6, color=AZUL_CLARO, borde=AZUL):
    """Caja de clase / tabla con alto y ancho estimados desde el contenido."""
    w = min(max(16.0, max((len(a) for a in attrs)) * 0.46 + 2.6), 22.0)
    h = header + len(attrs) * line + pad
    ax.add_patch(Rectangle((x, y + h - header), w, header, facecolor=color,
                           edgecolor=borde, lw=1.6))
    ax.text(x + w / 2, y + h - header / 2, nombre, ha="center", va="center",
            fontsize=fnom, fontweight="bold")
    ax.add_patch(Rectangle((x, y), w, h - header, facecolor="white",
                           edgecolor=borde, lw=1.6))
    for i, at in enumerate(attrs):
        ax.text(x + 0.8, y + h - header - line * (i + 0.5), at, ha="left",
                va="center", fontsize=fatr, family="monospace")
    return x, y, w, h


def rel(ax, x1, y1, x2, y2):
    ax.plot([x1, x2], [y1, y2], color=GRIS, lw=1.7, zorder=0)


def mult(ax, x, y, txt, font=11):
    ax.text(x, y, txt, fontsize=font, ha="center", va="center",
            bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


# ---------------------------------------------------------------- casos de uso
def diagrama_casos_uso():
    f, ax = fig_auto("cu", 14, 9)  # 56 x 36 unidades
    ax.add_patch(Rectangle((4.2, 1.0), 48.5, 32.4, facecolor="white",
                           edgecolor=GRIS, lw=2.0))
    ax.text(5.0, 32.3, "GreenSense — Panel Web", fontsize=18, fontweight="bold",
            color=GRIS)
    # actor
    cx, cy = 1.1, 16.5
    ax.add_patch(Circle((cx, cy + 2.6), 1.15, facecolor="white",
                        edgecolor="black", lw=2.0))
    ax.plot([cx, cx], [cy + 1.45, cy + 0.1], color="black", lw=2.0)
    ax.plot([cx - 1.3, cx + 1.3], [cy + 1.0, cy + 1.0], color="black", lw=2.0)
    ax.plot([cx, cx], [cy + 0.1, cy - 1.1], color="black", lw=2.0)
    ax.plot([cx - 1.25, cx + 1.25], [cy - 1.1, cy - 1.1], color="black", lw=2.0)
    ax.text(cx, cy - 2.3, "Productor", ha="center", fontsize=20,
            fontweight="bold")

    casos = [
        "Iniciar sesion",
        "Consultar dashboard en tiempo real",
        "Ver alertas",
        "Configurar umbrales por sensor",
        "Descargar reporte (CSV / Excel)",
        "Seleccionar invernadero",
        "Visualizar historico por rango",
        "Filtrar alertas por nivel / sensor",
        "Programar riego automatico",
        "Activar / desactivar riego manual",
    ]
    filas = [30.5, 23.5, 16.5, 9.5, 2.5]
    col = [14.0, 42.0]
    for i, texto in enumerate(casos):
        x = col[i % 2]
        y = filas[i // 2] if i % 2 == 0 else filas[i // 2]
        # reindex: fila = posicion de columna
        fila = i // 2
        y = filas[fila]
        ax.add_patch(Ellipse((x, y), 16.0, 3.2, facecolor=VERDE_CLARO,
                             edgecolor=VERDE, lw=2.0))
        ax.text(x, y, texto, ha="center", va="center", fontsize=16.5)
        ax.plot([cx + 1.5, x - 8.0], [cy, y], color="black", lw=1.3, zorder=0)
    # include: dashboard (col1, fila 1) -> visualizar historico (col2, fila 1)
    f1 = filas[1]
    ax.annotate("", xy=(42.0 - 8.0, f1), xytext=(14.0 + 8.0, f1),
                arrowprops=dict(arrowstyle="-", linestyle=(0, (5, 3)),
                                color="black", lw=1.5))
    ax.text(28.0, f1 + 2.0, "«include»", ha="center", fontsize=16,
            style="italic")
    return guardar(f, "casos_uso.png")


# ---------------------------------------------------------------- clases
def diagrama_clases():
    f, ax = fig_auto("cl", 12, 15)  # 48 x 60 unidades (portrait)
    # fila superior
    caja_auto(ax, 2, 50.5, "Lectura", ["timestamp: string",
                                       "humedadSuelo: number",
                                       "temperatura: number",
                                       "humedadAmbiente: number",
                                       "luz: number"])
    caja_auto(ax, 26, 44.0, "Alerta", ["id: string",
                                       "fecha: string",
                                       "sensor: SensorId",
                                       "nivel: NivelAlerta",
                                       "valor: number",
                                       "umbral: number",
                                       "mensaje: string",
                                       "vista: boolean"])
    # fila media
    caja_auto(ax, 2, 27.0, "Usuario", ["id: string",
                                       "nombre: string",
                                       "email: string",
                                       "passwordHash: string",
                                       "login(): void"])
    caja_auto(ax, 18, 27.0, "Invernadero", ["id: string",
                                            "nombre: string",
                                            "ubicacion: string",
                                            "cultivo: string",
                                            "enLinea: boolean"])
    caja_auto(ax, 35, 29.0, "EstadoRiego", ["activo: boolean",
                                            "ultimoRiego: string",
                                            "proximoRiego: string",
                                            "litrosHoy: number"])
    # fila inferior
    caja_auto(ax, 2, 8.0, "Umbral", ["min: number",
                                     "max: number",
                                     "evaluar(valor): Estado"])
    caja_auto(ax, 18, 6.0, "Configuracion", ["invernaderoId: string",
                                             "riegoAutomatico: boolean",
                                             "umbrales: Umbral[]",
                                             "horarios: HorarioRiego[]"])
    caja_auto(ax, 35, 8.0, "HorarioRiego", ["id: string",
                                            "hora: string",
                                            "duracionMin: number",
                                            "activo: boolean"])
    # relaciones
    rel(ax, 13.3, 33.8, 18.0, 33.8)   # Usuario - Invernadero
    mult(ax, 14.9, 34.9, "1", 11)
    mult(ax, 16.7, 32.6, "1..*", 11)
    rel(ax, 22.0, 40.6, 10.0, 50.0)   # Invernadero - Lectura
    mult(ax, 17.2, 43.6, "1..*", 11)
    rel(ax, 33.0, 40.0, 26.0, 44.0)   # Invernadero - Alerta
    mult(ax, 31.4, 40.6, "1..*", 11)
    rel(ax, 26.0, 27.0, 26.0, 16.4)   # Invernadero - Configuracion
    mult(ax, 27.2, 21.6, "1..1", 11)
    rel(ax, 18.0, 10.6, 13.3, 12.4)   # Configuracion - Umbral
    mult(ax, 16.2, 9.4, "1..*", 11)
    rel(ax, 35.0, 11.2, 35.0, 13.4)   # Configuracion - HorarioRiego
    mult(ax, 36.2, 10.0, "1..*", 11)
    rel(ax, 34.0, 33.8, 35.0, 34.3)   # Invernadero - EstadoRiego
    mult(ax, 34.0, 35.4, "1..1", 11)
    return guardar(f, "clases.png")


# ---------------------------------------------------------------- secuencia 1
def diagrama_secuencia_vivo():
    f, ax = fig_auto("sv", 15, 10)  # 60 x 40 unidades
    ax.set_xlim(0, 60)
    ax.set_ylim(0, 40)
    lifelines = [
        (3, "Productor"),
        (14, "Dashboard (UI)"),
        (25, "Hook useLecturasEnVivo"),
        (36, "api.service (axios)"),
        (47, "Backend REST / WS"),
        (57, "Base de datos"),
    ]
    for x, nombre in lifelines:
        ax.plot([x, x], [2, 37.5], color=GRIS, lw=1.4, ls="--")
        ax.add_patch(Rectangle((x - 3.3, 36.0), 6.6, 1.7,
                               facecolor=VERDE_CLARO, edgecolor=VERDE, lw=1.4))
        ax.text(x, 36.85, nombre, ha="center", va="center", fontsize=13)
    # fondo de activación en el hook
    ax.add_patch(Rectangle((25 - 0.9, 8.4), 1.8, 20.4, facecolor="#eef2f7",
                           edgecolor=GRIS, lw=0.8))

    def msg(x1, x2, y, texto, dashed=False):
        ax.annotate("", xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle="-|>", color="black", lw=1.6,
                                    linestyle=(0, (5, 3)) if dashed else "solid"))
        ax.text((x1 + x2) / 2, y + 1.25, texto, ha="center", va="center",
                fontsize=12.5)

    msg(3, 14, 34.2, "1. Seleccionar invernadero")
    msg(14, 25, 31.6, "2. Hook activado (id, rango)")
    msg(25, 36, 29.0, "3. listarLecturas(id, rango)")
    msg(36, 47, 26.4, "4. GET /lecturas?desde&hasta")
    msg(47, 57, 23.8, "5. SELECT lecturas", True)
    msg(57, 47, 21.2, "6. filas (historico)")
    msg(47, 25, 18.6, "7. Lectura[] — 200 OK")
    msg(25, 14, 16.0, "8. setLecturas(historico)")
    msg(14, 3, 13.4, "9. render tablero + grafico")
    msg(25, 47, 10.6, "10. suscribir a /ws/lecturas", True)
    msg(47, 25, 7.8, "11. nueva_lectura {sensor, valor}", True)
    msg(25, 14, 5.0, "12. agregar punto (max 400)")
    msg(14, 3, 2.6, "13. actualizacion en vivo")
    return guardar(f, "secuencia_vivo.png")


# ---------------------------------------------------------------- secuencia 2
def diagrama_secuencia_config():
    f, ax = fig_auto("sc", 15, 7)  # 60 x 28 unidades
    ax.set_xlim(0, 60)
    ax.set_ylim(0, 28)
    lifelines = [
        (5, "Productor"),
        (17, "Formulario Configuracion"),
        (29, "api.service (axios)"),
        (41, "Backend REST"),
        (54, "Base de datos"),
    ]
    for x, nombre in lifelines:
        ax.plot([x, x], [2, 26], color=GRIS, lw=1.4, ls="--")
        ax.add_patch(Rectangle((x - 3.6, 24.6), 7.2, 1.7,
                               facecolor=VERDE_CLARO, edgecolor=VERDE, lw=1.4))
        ax.text(x, 25.45, nombre, ha="center", va="center", fontsize=13)

    def msg(x1, x2, y, texto, dashed=False):
        ax.annotate("", xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle="-|>", color="black", lw=1.6,
                                    linestyle=(0, (5, 3)) if dashed else "solid"))
        ax.text((x1 + x2) / 2, y + 1.25, texto, ha="center", va="center",
                fontsize=12.5)

    msg(5, 17, 23.0, "1. Editar umbrales y horarios")
    msg(17, 29, 20.4, "2. guardarConfiguracion(config)")
    msg(29, 41, 17.8, "3. PUT /invernaderos/:id/configuracion")
    msg(41, 54, 15.2, "4. UPDATE configuraciones", True)
    msg(54, 41, 12.6, "5. OK")
    msg(41, 29, 10.0, "6. 200 — configuracion guardada")
    msg(29, 17, 7.4, "7. invalidar cache (Query)")
    msg(17, 5, 4.8, "8. toast \"Configuracion guardada\"")
    return guardar(f, "secuencia_config.png")


# ---------------------------------------------------------------- secuencia 3
def diagrama_secuencia_clima():
    f, ax = fig_auto("sc", 15, 7)  # 60 x 28 unidades
    ax.set_xlim(0, 60)
    ax.set_ylim(0, 28)
    lifelines = [
        (4, "Panel (Dashboard)"),
        (17, "useQuery / api.service"),
        (30, "Backend (EmaCenter)"),
        (42, "Cache 60 s"),
        (54, "EMA Center API"),
    ]
    for x, nombre in lifelines:
        ax.plot([x, x], [2, 26], color=GRIS, lw=1.4, ls="--")
        ax.add_patch(Rectangle((x - 3.6, 24.6), 7.2, 1.7,
                               facecolor=VERDE_CLARO, edgecolor=VERDE, lw=1.4))
        ax.text(x, 25.45, nombre, ha="center", va="center", fontsize=12)

    def msg(x1, x2, y, texto, dashed=False):
        ax.annotate("", xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle="-|>", color="black", lw=1.6,
                                    linestyle=(0, (5, 3)) if dashed else "solid"))
        ax.text((x1 + x2) / 2, y + 1.25, texto, ha="center", va="center",
                fontsize=11.5)

    msg(4, 17, 23.0, "1. Se monta el widget Clima")
    msg(17, 30, 20.4, "2. obtenerContextoClimatico()")
    msg(30, 42, 17.8, "3. cache valido (60 s)", True)
    msg(30, 54, 15.2, "4. no: GET api/station/{id}/")
    msg(54, 30, 12.6, "5. JSON {estacion, registro}")
    msg(30, 42, 10.0, "6. guardar cache")
    msg(30, 17, 7.4, "7. 200 — contexto climatico")
    msg(17, 4, 4.8, "8. render widget")
    return guardar(f, "secuencia_clima.png")


# ---------------------------------------------------------------- DER
def diagrama_der():
    f, ax = fig_auto("der", 14, 9.5)  # 56 x 38 unidades
    ax.set_xlim(0, 56)
    ax.set_ylim(0, 38)

    def tabla(x, y, nombre, campos):
        w = min(max(12.0, max((len(c) for c in campos)) * 0.44 + 2.4), 14.5)
        h = 1.9 + len(campos) * 1.9 + 1.3
        ax.add_patch(Rectangle((x, y + h - 1.9), w, 1.9, facecolor=AZUL_CLARO,
                               edgecolor=AZUL, lw=1.6))
        ax.text(x + w / 2, y + h - 0.95, nombre, ha="center", va="center",
                fontsize=15.5, fontweight="bold")
        ax.add_patch(Rectangle((x, y), w, h - 1.9, facecolor="white",
                               edgecolor=AZUL, lw=1.6))
        for i, c in enumerate(campos):
            es_pk = c.startswith("id ")
            txt = c
            if es_pk:
                ax.text(x + 0.8, y + h - 1.9 - 1.9 * (i + 0.5), txt,
                        ha="left", va="center", fontsize=12.5, family="monospace",
                        color=AZUL, fontweight="bold")
            else:
                ax.text(x + 0.8, y + h - 1.9 - 1.9 * (i + 0.5), txt,
                        ha="left", va="center", fontsize=12.5, family="monospace")
        return x, y, w, h

    # fila superior
    tx, ty, tw, th = tabla(0.5, 25.5, "usuarios",
                           ["id PK", "nombre", "email", "password_hash", "creado_en"])
    ix, iy, iw, ih = tabla(14, 25.5, "invernaderos",
                           ["id PK", "nombre", "ubicacion", "cultivo",
                            "usuario_id FK", "en_linea"])
    lx, ly, lw, lh = tabla(27.5, 25.5, "lecturas",
                           ["id PK", "invernadero_id FK", "timestamp",
                            "humedad_suelo", "temperatura",
                            "humedad_ambiente", "luz"])
    ex, ey, ew, eh = tabla(41.5, 25.5, "eventos_riego",
                           ["id PK", "invernadero_id FK", "tipo",
                            "fecha_inicio", "duracion_min", "litros"])
    # fila inferior
    ux, uy, uw, uh = tabla(0.5, 3.5, "umbrales",
                           ["id PK", "configuracion_id FK", "sensor",
                            "min", "max"])
    cx, cy2, cw, ch = tabla(14, 3.5, "configuraciones",
                            ["id PK", "invernadero_id FK", "riego_automatico"])
    hx, hy, hw, hh = tabla(27.5, 3.5, "horarios_riego",
                           ["id PK", "configuracion_id FK", "hora",
                            "duracion_min", "activo"])
    ax2, ax3, aw, ah = tabla(41.5, 3.5, "alertas",
                             ["id PK", "invernadero_id FK", "fecha",
                              "sensor", "nivel", "valor", "umbral",
                              "mensaje", "vista"])
    # relaciones
    rel(ax, 11.0, 33.4, 14.0, 33.4)
    mult(ax, 12.0, 35.0, "1:N", 12)
    rel(ax, 24.5, 33.4, 27.5, 33.4)
    mult(ax, 25.8, 35.0, "1:N", 12)
    rel(ax, 38.5, 33.4, 41.5, 33.4)
    mult(ax, 39.8, 35.0, "1:N", 12)
    rel(ax, 19.5, 25.5, 19.5, 13.5)
    mult(ax, 21.0, 19.5, "1:1", 12)
    rel(ax, 14.0, 6.6, 10.0, 6.9)
    mult(ax, 11.9, 5.2, "1:N", 12)
    rel(ax, 24.0, 6.6, 27.5, 6.9)
    mult(ax, 25.5, 5.2, "1:N", 12)
    rel(ax, 24.0, 25.5, 41.5, 13.6)
    mult(ax, 30.0, 20.5, "1:N", 12)
    return guardar(f, "der.png")


# ---------------------------------------------------------------- Gantt
def diagrama_gantt():
    fases = [
        ("1. Planificacion y relevamiento", 1, 2, VERDE_CLARO, VERDE),
        ("2. Analisis de requerimientos", 3, 4, VERDE_CLARO, VERDE),
        ("3. Arquitectura y diseno de datos", 5, 6, "#fef9c3", "#a16207"),
        ("4. Desarrollo backend y API REST", 7, 10, "#bfdbfe", AZUL),
        ("5. Desarrollo frontend (panel web)", 8, 14, "#bfdbfe", AZUL),
        ("6. Integracion REST + WebSocket", 13, 15, "#ddd6fe", "#6d28d9"),
        ("7. Pruebas y control de calidad", 15, 17, "#fecaca", "#b91c1c"),
        ("8. Documentacion y ajustes", 16, 20, "#cbd5e1", GRIS),
        ("9. Entrega y presentacion", 21, 22, "#fdba74", "#c2410c"),
    ]
    f, ax = fig_auto("gantt", 15, 8)
    ax.set_xlim(0.5, 22.5)
    ax.set_ylim(0.4, len(fases) + 0.6)
    for i, (_, ini, fin, _, borde) in enumerate(fases):
        ax.add_patch(Rectangle((ini, (len(fases) - i) - 0.34),
                               fin - ini + 1, 0.68, facecolor=VERDE_CLARO,
                               edgecolor=borde, lw=1.6))
    ax.set_yticks(list(range(len(fases), 0, -1)))
    ax.set_yticklabels([fa[0] for fa in fases], fontsize=12.5)
    ax.set_xticks(range(1, 23))
    ax.set_xticklabels([f"S{s}" for s in range(1, 23)], fontsize=10)
    ax.set_xlabel("Semanas (S1 – S22, ~6 meses)", fontsize=13)
    ax.tick_params(axis="y", length=0)
    ax.grid(axis="x", color="#e2e8f0", lw=0.8)
    ax.spines[["top", "right"]].set_visible(False)
    f.tight_layout()
    return guardar(f, "gantt.png")


# ================================================================ DOCX
def estilo_doc(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    for h, size in zip(["Title", "Heading 1", "Heading 2"], [20, 14, 12]):
        st = doc.styles[h]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
    for h in ["Heading 1", "Heading 2"]:
        doc.styles[h].font.color.rgb = RGBColor(0x15, 0x80, 0x3D)


def parrafo(doc, texto, bold=False, espacio=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(espacio)
    r = p.add_run(texto)
    r.bold = bold
    return p


def viñeta(doc, texto):
    p = doc.add_paragraph(style="List Bullet")
    p.add_run(texto)
    return p


def tabla_doc(doc, encabezados, filas):
    t = doc.add_table(rows=1, cols=len(encabezados))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, e in enumerate(encabezados):
        celda = t.rows[0].cells[i]
        celda.text = ""
        r = celda.paragraphs[0].add_run(e)
        r.bold = True
        r.font.size = Pt(9.5)
        shd = celda._element.get_or_add_tcPr()
        el = OxmlElement("w:shd")
        el.set(qn("w:val"), "clear")
        el.set(qn("w:fill"), "DCFCE7")
        shd.append(el)
    for fila in filas:
        celdas = t.add_row().cells
        for i, valor in enumerate(fila):
            celdas[i].text = ""
            run = celdas[i].paragraphs[0].add_run(str(valor))
            run.font.size = Pt(9.5)
    return t


def main():
    rutas = {
        "casos_uso": diagrama_casos_uso(),
        "clases": diagrama_clases(),
        "secvivo": diagrama_secuencia_vivo(),
        "secconf": diagrama_secuencia_config(),
        "seclima": diagrama_secuencia_clima(),
        "der": diagrama_der(),
        "gantt": diagrama_gantt(),
    }

    doc = Document()
    estilo_doc(doc)
    seccion = doc.sections[0]
    seccion.page_width = Cm(21)
    seccion.page_height = Cm(29.7)
    seccion.left_margin = Cm(2.2)
    seccion.right_margin = Cm(2.2)
    seccion.top_margin = Cm(2.2)
    seccion.bottom_margin = Cm(2.2)
    IMG = Cm(16.4)

    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = t.add_run("Informe del Proyecto\nGreenSense — Sistema de Monitoreo Inteligente de Invernaderos")
    run.font.size = Pt(18)
    run.bold = True
    run.font.color.rgb = RGBColor(0x15, 0x80, 0x3D)
    st = doc.add_paragraph()
    st.alignment = WD_ALIGN_PARAGRAPH.CENTER
    st.add_run("Taller de Integración — Carrera Analista de Sistemas").bold = True
    doc.add_paragraph()

    # 1
    doc.add_heading("1. Presentación del Grupo", level=1)
    parrafo(doc, "Fecha de presentación: [Día/Mes/Año]", bold=True)
    parrafo(doc, "Docentes de la Cátedra:", bold=True)
    viñeta(doc, "Mg. Diaz Santiago R.")
    viñeta(doc, "Anl. Rios Nuñez Marcos Elias")
    viñeta(doc, "Lic. Arrejin Martin")
    parrafo(doc, "Integrantes:", bold=True)
    viñeta(doc, "[Nombre y Apellido del Integrante 1] — [correo electrónico]")
    viñeta(doc, "[Nombre y Apellido del Integrante 2] — [correo electrónico]")
    viñeta(doc, "[Nombre y Apellido del Integrante N] — [correo electrónico]")

    # 2
    doc.add_heading("2. Contexto del Problema y Análisis de Requerimientos", level=1)

    doc.add_heading("2.1. Caso de Negocio / Idea a Desarrollar", level=2)
    parrafo(doc, "GreenSense es el desarrollo de una tecnología/software innovador: un panel web en "
                 "tiempo real para el monitoreo y control de invernaderos y viveros, presentado como "
                 "Trabajo Final de Integración de la carrera Analista de Sistemas. No sistematiza un "
                 "proceso existente en una empresa: aborda una oportunidad de mercado en el marco de la "
                 "agricultura digital.")
    parrafo(doc, "Problema central: los productores hortícolas de pequeña y mediana escala gestionan "
                 "sus invernaderos con recorridas manuales y decisiones basadas en la experiencia. La "
                 "falta de datos objetivos e históricos demora la detección de situaciones adversas —"
                 "estrés térmico o hídrico, humedad propicia para hongos, luminosidad insuficiente— y "
                 "deriva en pérdidas de cultivo y en un uso ineficiente del agua de riego.")
    parrafo(doc, "Investigación del campo: existen plataformas comerciales internacionales de monitoreo "
                 "agrícola (sensores conectados y paneles de control), pero en general son costosas, "
                 "orientadas a grandes superficies o dependen de hardware propietario. GreenSense propone "
                 "un sistema abarcable por productores PyME/familiares: sensores de bajo costo publicando "
                 "lecturas a un backend propio, con un panel web accesible desde cualquier dispositivo "
                 "que combina monitoreo en tiempo real, alertas tempranas y control programado del riego.")

    doc.add_heading("2.2. Procesos Actuales", level=2)
    parrafo(doc, "Como se trata de una innovación, se describe el proceso típico vigente en invernaderos "
                 "convencionales, que GreenSense busca superar:")
    parrafo(doc, "Paso a paso actual:", bold=True)
    viñeta(doc, "Recorrida manual del predio una o dos veces por día para inspeccionar el cultivo.")
    viñeta(doc, "Medición puntual con termómetro/higrómetro en pocos sectores representativos.")
    viñeta(doc, "Riego por cronograma fijo (cantidad y horario predefinidos), sin validar la humedad real del suelo.")
    viñeta(doc, "Registro de novedades en papel o planillas si el productor lo realiza.")
    viñeta(doc, "Reacción ante el problema cuando ya se visualiza el daño en la planta.")
    parrafo(doc, "Deficiencias identificadas:", bold=True)
    viñeta(doc, "Detección tardía: la respuesta ocurre después de que el cultivo ya sufrió daño.")
    viñeta(doc, "Cobertura incompleta: lecturas puntuales que no reflejan la evolución en el tiempo.")
    viñeta(doc, "Sin historial consolidado: no existe trazabilidad para decidir ni para justificar gastos.")
    viñeta(doc, "Desperdicio de agua y energía por riego sin datos.")
    viñeta(doc, "Dependencia de la experiencia individual; el conocimiento no queda registrado.")

    doc.add_heading("2.3. Requerimientos", level=2)
    parrafo(doc, "Requerimientos Funcionales:", bold=True)
    viñeta(doc, "RF-01 Autenticación de usuarios con token entregado por el backend; todas las páginas requieren sesión.")
    viñeta(doc, "RF-02 Listado de invernaderos del usuario y selección del invernadero activo.")
    viñeta(doc, "RF-03 Dashboard con el estado actual de 4 sensores (humedad de suelo, temperatura, humedad ambiente, luminosidad).")
    viñeta(doc, "RF-04 Gráfico histórico configurable por rango: 24 horas, 7 días y 30 días.")
    viñeta(doc, "RF-05 Lecturas en vivo vía WebSocket que se agregan a la serie sin recargar la página.")
    viñeta(doc, "RF-06 Generación de alertas cuando una lectura sale de los umbrales (crítica / advertencia).")
    viñeta(doc, "RF-07 Historial de alertas con filtros por nivel y por sensor.")
    viñeta(doc, "RF-08 Configuración de umbrales mínimo/máximo por sensor por invernadero.")
    viñeta(doc, "RF-09 Riego automático con horarios programados y duración configurable por invernadero.")
    viñeta(doc, "RF-10 Activación/desactivación manual del riego y visualización de su estado.")
    viñeta(doc, "RF-11 Reportes de riego, consumo de agua y alertas exportables en CSV o Excel.")
    viñeta(doc, "RF-12 Indicadores de estado de conexión del invernadero y de la transmisión en vivo.")
    parrafo(doc, "Requerimientos No Funcionales:", bold=True)
    viñeta(doc, "RNF-01 Seguridad: el token de sesión se guarda solo en memoria (nunca en localStorage) y se envía como Bearer token en cada request.")
    viñeta(doc, "RNF-02 Rendimiento: respuesta de listas e histórico en menos de 2 segundos; el stream en vivo actualiza el gráfico sin degradación (máximo 400 puntos en memoria).")
    viñeta(doc, "RNF-03 Usabilidad: interfaz responsive (escritorio y móvil), estados de carga (skeletons) y mensajes de error claros con reintento.")
    viñeta(doc, "RNF-04 Accesibilidad: navegación por teclado, roles ARIA y etiquetas en controles.")
    viñeta(doc, "RNF-05 Mantenibilidad: capa única de servicios HTTP (src/services/api.ts), tipos de dominio centralizados y hook único para histórico + en vivo.")
    viñeta(doc, "RNF-06 Portabilidad/despliegue: build estático desplegable (Vercel) y modo demo sin backend mediante variables de entorno (VITE_USE_MOCK).")

    # 3
    doc.add_heading("3. Búsqueda de Formas de Mejorar la Situación Actual", level=1)
    doc.add_heading("3.1. Propuesta de Mejora", level=2)
    parrafo(doc, "GreenSense propone sensorizar el invernadero y centralizar la información en un panel "
                 "web. Cada invernadero cuenta con sensores que publican lecturas periódicas a un backend "
                 "propio; el panel consume esa información por dos canales: REST para el histórico y "
                 "WebSocket (socket.io) para las lecturas en tiempo real.")
    parrafo(doc, "Cambios que facilita el software (sin afectar el proceso productivo actual):")
    viñeta(doc, "El productor deja la recorrida sistemática y pasa a revisar el estado desde cualquier dispositivo (sección 4.1, casos de uso).")
    viñeta(doc, "El riego se decide con datos: automático según horarios programados y humedad del suelo, o manual desde el panel (sección 4.3, flujo de lectura y control).")
    viñeta(doc, "Las alertas avisan antes del daño, priorizando por nivel crítico/advertencia (sección 4.3).")
    viñeta(doc, "El historial se registra automáticamente y habilita reportes exportables para auditoría y planificación (sección 5, módulo Reportes).")

    doc.add_heading("3.2. Justificación de las Mejoras", level=2)
    parrafo(doc, "Beneficios concretos y medibles:")
    viñeta(doc, "Menor reacción: de detectar el problema tras la recorrida a recibirlo como alerta en el momento en que la lectura sale de umbral.")
    viñeta(doc, "Ahorro de agua: el riego se ejecuta cuando la humedad de suelo lo requiere, no por cronograma fijo.")
    viñeta(doc, "Reducción de pérdidas de cultivo por estrés hídrico, térmico o humedad propicia a hongos.")
    viñeta(doc, "Trazabilidad completa: historial y reportes de riego, consumo y alertas por invernadero.")
    viñeta(doc, "Toma de decisiones objetiva y documentada, independiente de la experiencia de un operador.")

    # 4
    doc.add_heading("4. Propuesta de Ingeniería de Software", level=1)
    parrafo(doc, "Arquitectura: aplicación SPA en React 19 sobre TanStack Start (Vite), con file-based "
                 "routing (TanStack Router), caché y sincronización de datos (TanStack Query), cliente "
                 "HTTP Axios, WebSocket con socket.io-client e interfaz Tailwind CSS v4. El backend "
                 "esperado es una API REST + WebSocket (/ws/lecturas) con los contratos documentados en "
                 "la sección 6. Como integración externa, el sistema consume la EMA Center API del "
                 "Laboratorio Gugler para aportar el clima real de la zona (módulo 5.2).")
    doc.add_heading("4.1. Diagrama de Casos de Uso", level=2)
    doc.add_picture(rutas["casos_uso"], width=IMG)
    parrafo(doc, "Justificación: el diagrama muestra al Productor como único actor y las interacciones "
                 "clave del sistema: consulta del tablero en tiempo real, histórico configurable, gestión "
                 "de alertas, configuración de umbrales y del riego, y descarga de reportes. Con un "
                 "«include» queda explícito que el dashboard depende de la visualización del histórico, "
                 "base del monitoreo.")

    doc.add_heading("4.2. Diagrama de Clases", level=2)
    doc.add_picture(rutas["clases"], width=IMG)
    parrafo(doc, "Justificación: estructura las entidades principales del dominio (Invernadero, Lectura, "
                 "Alerta, Configuracion, Umbral, HorarioRiego, EstadoRiego, Usuario) y sus relaciones, "
                 "reflejando los tipos definidos en src/types/greensense.ts. Es la base compartida entre "
                 "frontend y backend para el contrato de datos.")

    doc.add_heading("4.3. Diagrama de Secuencia", level=2)
    doc.add_picture(rutas["secvivo"], width=IMG)
    parrafo(doc, "Justificación (lectura en vivo): es el comportamiento central del sistema. El "
                 "diagrama muestra cómo el histórico llega por REST y se enriquece con el stream "
                 "WebSocket, y por qué el hook useLecturasEnVivo concentra ambos canales para actualizar "
                 "el gráfico sin recargar.")
    doc.add_picture(rutas["secconf"], width=IMG)
    parrafo(doc, "Justificación (configuración): muestra la persistencia de umbrales y horarios con "
                 "PUT, la invalidación de caché y la confirmación al usuario, clave para que el cambio "
                 "de parámetros impacte de inmediato en las alertas.")

    doc.add_heading("4.4. Modelo DER (SQL)", level=2)
    doc.add_picture(rutas["der"], width=IMG)
    parrafo(doc, "Justificación: se adopta un modelo relacional (ver justificación del paradigma en "
                 "6.1). El DER contempla solo las tablas de negocio: usuarios, invernaderos, lecturas, "
                 "alertas, configuraciones, umbrales, horarios_riego y eventos_riego (historial de "
                 "activaciones), excluyendo tablas generadas automáticamente por el framework.")

    # 5
    doc.add_heading("5. Detalle de Módulos", level=1)
    tabla_doc(
        doc,
        ["Nombre del Módulo", "Funcionalidad Principal", "Caso de Uso Asociado", "Dependencias / Requisitos Previos"],
        [
            ["Autenticación", "Inicio de sesión con token guardado solo en memoria; cierre de sesión.",
             "Iniciar sesión", "Ninguna"],
            ["Dashboard", "Tarjetas del estado actual de los 4 sensores, gráfico histórico por rango (24h/7d/30d) y panel de riego.",
             "Consultar dashboard en tiempo real", "Requerir sesión iniciada"],
            ["Alertas", "Historial de alertas con filtros por nivel (crítica/advertencia) y por sensor.",
             "Ver y filtrar alertas", "Funciona sobre alertas del invernadero seleccionado"],
            ["Configuración", "Umbrales min/máximo por sensor, riego automático y horarios programados con duración.",
             "Configurar umbrales y programar riego", "Requiere invernadero seleccionado (Módulo Dashboard)"],
            ["Riego", "Panel de estado del riego (activo/último/proximo/litros hoy) y control manual.",
             "Activar/desactivar riego manual", "Requiere configuración de umbrales/horarios"],
            ["Reportes", "Exportación de historial de riego, consumo de agua y alertas en CSV o Excel con rango de fechas.",
             "Descargar reporte", "Requiere invernadero y datos históricos (lecturas y eventos)"],
            ["Clima externo (EMA Center)", "Widget con datos meteorológicos reales de una estación (temperatura, humedad, luz, viento, lluvia) como contexto del invernadero.",
             "Consultar dashboard en tiempo real", "Requiere backend con acceso a la API pública EMA Center (Laboratorio Gugler)"],
            ["Tiempo real (WebSocket)", "Suscripción al canal /ws/lecturas, recepción de nueva_lectura y actualización incremental de la serie.",
             "Consultar dashboard en tiempo real", "Requiere servidor WebSocket del backend"],
        ],
    )
    parrafo(doc, "Tabla de flujos (Fig. 2):", bold=True)
    tabla_doc(
        doc,
        ["Flujo", "Descripción", "Actividades principales"],
        [
            ["Inicio de sesión", "Validación de credenciales y token en memoria.",
             "Ingresar email/contraseña → POST /auth/login → guardar token en memoria → redirigir al dashboard"],
            ["Lectura en vivo", "Histórico REST + stream WebSocket consolidados en la serie del gráfico.",
             "Obtener histórico → suscribirse a nueva_lectura → agregar puntos (máx. 400) → actualizar tarjetas"],
            ["Configuración de umbrales", "Ajuste y persistencia de parámetros de alerta.",
             "Editar min/max → validar min<max → PUT configuracion → invalidar caché → confirmar"],
            ["Activación de riego", "Control manual o automático del riego.",
             "POST riego {activar} → actualizar EstadoRiego → reflejar en panel"],
            ["Descarga de reporte", "Generación de archivo por tipo y rango.",
             "Elegir tipo/formato/dates → validar rango → GET /reportes/:tipo → descargar archivo"],
            ["Clima externo (EMA Center)", "Actualización del widget con datos reales de la estación meteorológica.",
             "GET /contexto-climatico → cache 60 s (backend) → GET api/station/{id} → render widget"],
        ],
    )

    doc.add_heading("5.2. Módulo Clima Externo — Integración con la EMA Center API", level=2)
    parrafo(doc, "GreenSense se integra con la API pública EMA Center del Laboratorio de "
                 "investigación Gugler (https://emacenter.gugler.com.ar) para aportar al panel el "
                 "contexto meteorológico real de la zona del invernadero. El catálogo registra, entre "
                 "otros, la estación Aramburu_Centro (ID 1), ubicada en Paraná, Entre Ríos.")
    parrafo(doc, "El backend expone un endpoint protegido GET /api/contexto-climatico que delega en el "
                 "servicio EmaCenter (capa Servicios). El servicio consulta GET /api/station/{id} en la "
                 "API externa con un timeout de 8 segundos y cachea la respuesta 60 segundos en disco "
                 "(backend/var/ema_centro_cache.json), evitando sobrecargar una API de terceros en cada "
                 "request del tablero. Si la API externa no responde y no hay cache vigente, responde "
                 "503 y el widget muestra el estado de indisponibilidad con opción de reintentar.")
    parrafo(doc, "Mapeo de variables: temperatura_externa→temperaturaExterna (°C), humedad_externa→"
                 "humedadExterna (%), luxer_intencidad→luz (lux), viento_velocidad→vientoVelocidad (m/s), "
                 "lluvia_acumulado_diario→lluviaDiaria (mm) y presion_relativa→presionRelativa (hPa).")
    parrafo(doc, "Incluir una fuente de datos abierta y real demuestra la capacidad de integración del "
                 "sistema con APIs de terceros, cumpliendo el enfoque innovador del TFI: el productor "
                 "enriquece el monitoreo interno (sensores del invernadero) con el clima externo, clave "
                 "para decisiones de ventilación, protección ante heladas u olas de calor.")
    doc.add_picture(rutas["seclima"], width=IMG)
    parrafo(doc, "Figura: flujo del widget Clima externo. El panel consulta el backend propio (que "
                 "aplica cache de 60 s y fallback ante indisponibilidad) y este consume la API externa "
                 "del Laboratorio Gugler, sin exponer la estación directamente al navegador.")

    # 6
    doc.add_heading("6. Manejo de la Información y Modelado de Datos", level=1)
    doc.add_heading("6.1. Elección de Tecnología (SQL)", level=2)
    parrafo(doc, "Se elige el paradigma relacional (SQL) por las siguientes razones analíticas:")
    viñeta(doc, "Los datos son fuertemente estructurados y homogéneos: cada lectura tiene el mismo esquema fijo (timestamp + 4 variables), y lo mismo ocurre con invernaderos, alertas y configuraciones.")
    viñeta(doc, "Existen relaciones e integridad referencial claras: un invernadero pertenece a un usuario, las lecturas/alertas/eventos pertenecen a un invernadero y los umbrales/horarios a una configuración.")
    viñeta(doc, "El acceso es principalmente por consultas predecibles de rango temporal (histórico de lecturas por invernadero y período), donde la indexación y las agregaciones SQL resultan naturales.")
    viñeta(doc, "La configuración (umbrales, horarios) requiere consistencia inmediata y transaccional al guardarse; transacciones ACID del modelo relacional la garantizan.")
    viñeta(doc, "El volumen de datos estimado (lecturas cada pocos minutos por invernadero) es manejable para un motor relacional sin necesidad de escalabilidad horizontal de documentos ni esquema flexible, que es lo que justificaría NoSQL.")
    parrafo(doc, "Conclusión: el esquema NoSQL aportaría flexibilidad que el dominio no requiere, a costa "
                 "de perder integridad referencial y transaccionalidad; por eso el modelo relacional es "
                 "la elección apropiada.")

    doc.add_heading("6.2. Diagrama de Modelado de Datos", level=2)
    doc.add_picture(rutas["der"], width=IMG)
    parrafo(doc, "El modelo incluye únicamente las entidades de negocio del punto 4.4. Las claves foráneas "
                 "reflejan las relaciones del diagrama de clases (sección 4.2).")

    # 7
    doc.add_heading("7. Esquema de Colaboración con la Institución", level=1)
    parrafo(doc, "Este punto se omite según las instrucciones de la plantilla: se trata de un proyecto "
                 "innovador independiente sin mandatario ni cliente real que exija refinamiento de "
                 "requisitos con una institución.")

    # 8
    doc.add_heading("8. Plan de Trabajo en Grupo y Responsabilidades", level=1)
    doc.add_heading("8.1. Metodología de Trabajo", level=2)
    parrafo(doc, "Se adopta un esquema híbrido Scrum/Kanban adaptado al contexto académico: sprints "
                 "quincenales con objetivo definido, tablero de tareas (por hacer, en curso, en revisión, "
                 "hecho) y reuniones breves de sincronización. Cada sprint cierra con una demo al grupo y "
                 "una retrospectiva para ajustar la siguiente iteración.")
    doc.add_heading("8.2. Distribución de Responsabilidades", level=2)
    tabla_doc(
        doc,
        ["Integrante", "Rol", "Responsabilidades principales"],
        [
            ["[Integrante 1]", "Project Manager / Documentación", "Planificación de sprints, actas, informe y cronograma (sección 9)."],
            ["[Integrante 2]", "Frontend / UX", "Panel web, gráficos, alertas y configuración; accesibilidad y respuesta móvil."],
            ["[Integrante 3]", "Backend / API", "API REST, autenticación y WebSocket; integración con el panel."],
            ["[Integrante 4]", "Base de datos / QA", "Modelo de datos, casos de uso en pruebas y control de calidad."],
        ],
    )

    # 9
    doc.add_heading("9. Diagrama de Gantt Tentativo", level=1)
    parrafo(doc, "El proyecto se planifica en 22 semanas (~5,5 meses), dentro del rango de 4 meses a 1 "
                 "año indicado por la cátedra. El inicio presupone la regularidad obtenida.")
    doc.add_picture(rutas["gantt"], width=IMG)
    parrafo(doc, "Fases:", bold=True)
    viñeta(doc, "Fase 1: Planificación y relevamiento — S1-S2.")
    viñeta(doc, "Fase 2: Análisis de requerimientos — S3-S4.")
    viñeta(doc, "Fase 3: Arquitectura y diseño de datos — S5-S6.")
    viñeta(doc, "Fase 4: Desarrollo backend y API REST — S7-S10.")
    viñeta(doc, "Fase 5: Desarrollo frontend (panel web) — S8-S14.")
    viñeta(doc, "Fase 6: Integración REST + WebSocket — S13-S15.")
    viñeta(doc, "Fase 7: Pruebas y control de calidad — S15-S17.")
    viñeta(doc, "Fase 8: Documentación y ajustes — S16-S20.")
    viñeta(doc, "Fase 9: Entrega y presentación — S21-S22.")

    doc.save(OUT)
    print("OK ->", OUT)
    for k, v in rutas.items():
        print("  ", k, os.path.getsize(v), "bytes")


if __name__ == "__main__":
    main()