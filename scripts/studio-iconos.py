#!/usr/bin/env python3
"""C-193: los íconos de ElectroStudio salen del pack propio de Electro Shop (components/iconos/index.tsx, C-188).

El lienzo de las historias no dibuja componentes de React: este guion lee los dibujos del pack y escribe
lib/studio/iconos-pack.ts con cada pieza como un trazo de SVG (los círculos y rectángulos pasan a `d`) y su relleno
(`sup`: la superficie al 25 %, `sol`: el detalle sólido). Correrlo de nuevo cuando cambie el pack:

    python3 -I scripts/studio-iconos.py

Tres dibujos no existen en el pack (teclado, velocidad y energía): van aquí, hechos con sus reglas (cuadrícula de 24,
trazo de 2, puntas redondeadas y un solo acento). Si se suman al pack, se borran de EXTRA y se mapean como los demás.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PACK = RAIZ / 'components' / 'iconos' / 'index.tsx'
SALIDA = RAIZ / 'lib' / 'studio' / 'iconos-pack.ts'

# Nombre en el estudio (lo que guardan las historias) → componente del pack
MAPA = {
    'check': 'Confirmado', 'chip': 'Chip', 'memoria': 'Circuito', 'disco': 'DiscoDuro', 'luz': 'Novedad',
    'bateria': 'Bateria', 'camara': 'CamaraFotos', 'pantalla': 'Monitor', 'wifi': 'EnVivo', 'escudo': 'Garantia',
    'tarjeta': 'Tarjeta', 'control': 'Control', 'camion': 'Envio', 'movil': 'PagoMovil', 'cripto': 'Billete',
    'billetera': 'Web', 'billete': 'Billete', 'banco': 'Maletin', 'chat': 'Chat', 'tasa': 'Actualizar',
    'regalo': 'Regalo', 'estrella': 'Estrella', 'reloj': 'Reloj', 'ubicacion': 'Ubicacion', 'calendario': 'Calendario',
    'premio': 'Premio', 'oferta': 'Oferta', 'carrito': 'Carrito', 'audifonos': 'Audifonos', 'consola': 'Consola',
    'cable': 'CableUsb',
}

# Hechos con las reglas del pack, solo para el estudio
EXTRA = {
    'teclado': [
        ('M4.5 6h15A2.5 2.5 0 0 1 22 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 15.5v-7A2.5 2.5 0 0 1 4.5 6z', 'sup', None),
        ('M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8', None, None),
    ],
    'velocidad': [
        ('M3.5 17.5a8.5 8.5 0 1 1 17 0', None, None),
        ('M12 15.5l4-4.5', None, None),
        ('M12 14a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z', 'sol', None),
    ],
    'rayo': [
        ('M13.5 2.5L5 13.5h6.5L10.5 21.5 19 10.5h-6.5z', 'sup', None),
    ],
}

ESTILO = {'SUP': 'sup', 'SOL': 'sol', 'SOL_LIN': 'sol'}


def num(v: str) -> float:
    return float(v)


def fmt(v: float) -> str:
    t = f'{v:.3f}'.rstrip('0').rstrip('.')
    return t if t not in ('-0', '') else '0'


def circulo(cx: float, cy: float, r: float) -> str:
    return f'M{fmt(cx - r)} {fmt(cy)}a{fmt(r)} {fmt(r)} 0 1 0 {fmt(2 * r)} 0a{fmt(r)} {fmt(r)} 0 1 0 {fmt(-2 * r)} 0z'


def elipse(cx: float, cy: float, rx: float, ry: float) -> str:
    return f'M{fmt(cx - rx)} {fmt(cy)}a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(2 * rx)} 0a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(-2 * rx)} 0z'


def rectangulo(x: float, y: float, w: float, h: float, r: float) -> str:
    r = min(r, w / 2, h / 2)
    if r <= 0:
        return f'M{fmt(x)} {fmt(y)}h{fmt(w)}v{fmt(h)}h{fmt(-w)}z'
    return (f'M{fmt(x + r)} {fmt(y)}h{fmt(w - 2 * r)}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(r)} {fmt(r)}v{fmt(h - 2 * r)}'
            f'a{fmt(r)} {fmt(r)} 0 0 1 {fmt(-r)} {fmt(r)}h{fmt(-(w - 2 * r))}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(-r)} {fmt(-r)}'
            f'v{fmt(-(h - 2 * r))}a{fmt(r)} {fmt(r)} 0 0 1 {fmt(r)} {fmt(-r)}z')


def piezas(jsx: str):
    out = []
    for etiqueta, attrs in re.findall(r'<(path|circle|rect|ellipse|line|polyline|polygon)\b([^>]*?)/>', jsx):
        a = dict(re.findall(r'(\w+)="([^"]*)"', attrs))
        estilo = re.search(r'style=\{(\w+)\}', attrs)
        relleno = ESTILO.get(estilo.group(1)) if estilo else None
        grosor = num(a['strokeWidth']) if 'strokeWidth' in a else None
        if etiqueta == 'path':
            d = a['d']
        elif etiqueta == 'circle':
            d = circulo(num(a['cx']), num(a['cy']), num(a['r']))
        elif etiqueta == 'ellipse':
            d = elipse(num(a['cx']), num(a['cy']), num(a['rx']), num(a['ry']))
        elif etiqueta == 'rect':
            d = rectangulo(num(a['x']), num(a['y']), num(a['width']), num(a['height']), num(a.get('rx', '0')))
        elif etiqueta == 'line':
            d = f"M{a['x1']} {a['y1']}L{a['x2']} {a['y2']}"
        else:
            pts = a['points'].replace(',', ' ').split()
            d = 'M' + ' L'.join(f'{pts[i]} {pts[i + 1]}' for i in range(0, len(pts), 2)) + ('z' if etiqueta == 'polygon' else '')
        out.append((d, relleno, grosor))
    return out


def ts(p) -> str:
    d, relleno, grosor = p
    partes = [f"d: '{d}'"]
    if relleno:
        partes.append(f"relleno: '{relleno}'")
    if grosor is not None:
        partes.append(f'grosor: {fmt(grosor)}')
    return '{ ' + ', '.join(partes) + ' }'


def main() -> int:
    fuente = PACK.read_text(encoding='utf-8')
    comps = dict(re.findall(r'export function (Icono\w+)\(props: IconoProps\): ReactNode \{\n  return <Icono \{\.\.\.props\}>(.*?)</Icono>;', fuente, flags=re.S))
    faltan = [c for c in MAPA.values() if 'Icono' + c not in comps]
    if faltan:
        print('Faltan en el pack:', ', '.join(faltan), file=sys.stderr)
        return 1
    filas = []
    for nombre, comp in sorted(MAPA.items()):
        filas.append(f"  {nombre}: [{', '.join(ts(p) for p in piezas(comps['Icono' + comp]))}],")
    for nombre, lista in sorted(EXTRA.items()):
        filas.append(f"  {nombre}: [{', '.join(ts(p) for p in lista)}],")
    texto = (
        '// GENERADO por scripts/studio-iconos.py (C-193): no editar a mano.\n'
        '// Los íconos de las historias de ElectroStudio, del pack propio de Electro Shop (components/iconos, C-188).\n'
        '// `relleno`: sup = la superficie al 25 %, sol = el detalle sólido; `grosor`: el trazo si no es 2.\n'
        '// teclado, velocidad y rayo no están en el pack: están dibujados con sus reglas en el guion.\n\n'
        "export interface PiezaIcono {\n  d: string;\n  relleno?: 'sup' | 'sol';\n  grosor?: number;\n}\n\n"
        'export const ICONOS_PACK: Record<string, PiezaIcono[]> = {\n' + '\n'.join(filas) + '\n};\n'
    )
    SALIDA.write_text(texto, encoding='utf-8')
    print(f'{len(filas)} íconos en {SALIDA.relative_to(RAIZ)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
