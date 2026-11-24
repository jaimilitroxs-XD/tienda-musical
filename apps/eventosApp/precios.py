"""Precios promocionales de los eventos."""
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone


def mapa_descuentos(ahora=None):
    """Obtiene el mayor descuento vigente por producto."""
    from .models import Evento
    vigentes = Evento.objects.vigentes(ahora or timezone.now()).filter(
        tipo_evento__in=Evento.TIPOS_CON_DESCUENTO, porcentaje_descuento__gt=0)
    filas = Evento.productos_asociados.through.objects.filter(evento__in=vigentes).values(
        'producto_id', 'evento_id', 'evento__porcentaje_descuento', 'evento__titulo', 'evento__tipo_evento')
    mapa = {}
    for f in filas:
        actual = mapa.get(f['producto_id'])
        if actual is None or f['evento__porcentaje_descuento'] > actual['porcentaje']:
            mapa[f['producto_id']] = {
                'porcentaje': f['evento__porcentaje_descuento'], 'evento_id': f['evento_id'],
                'titulo': f['evento__titulo'], 'tipo': f['evento__tipo_evento'],
            }
    return mapa


def aplicar_descuento(precio, porcentaje):
    """Precio rebajado, redondeado a pesos enteros."""
    return (Decimal(precio) * (Decimal(100) - Decimal(porcentaje)) / Decimal(100)).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def precio_venta_final(producto, descuentos):
    promo = descuentos.get(producto.id)
    return aplicar_descuento(producto.precioVenta, promo['porcentaje']) if promo else producto.precioVenta


def prorratear_pack(precio_pack, productos):
    """Reparte el precio del pack sin perder pesos por redondeo."""
    ordenados = sorted(productos, key=lambda p: p.id)
    pack = int(Decimal(precio_pack))
    bases = [int(Decimal(p.precioArriendoDia)) for p in ordenados]
    total = sum(bases)
    precios, asignado = {}, 0
    for i, (p, base) in enumerate(zip(ordenados, bases)):
        if i == len(ordenados) - 1:
            parte = pack - asignado
        else:
            parte = (pack * base) // total if total else pack // len(ordenados)
        precios[p.id] = Decimal(parte)
        asignado += parte
    return precios


def precios_pack_pedido(items, ahora=None):
    """Aplica el pack solo si sus productos comparten cantidad y fechas."""
    from .models import Evento
    grupos = {}
    for item in items if isinstance(items, list) else []:
        if isinstance(item, dict) and item.get('packId') and item.get('tipoOperacion') == 'arriendo':
            grupos.setdefault(str(item['packId']), []).append(item)

    precios = {}
    for pack_id, grupo in grupos.items():
        if not pack_id.isdigit():
            continue
        evento = Evento.objects.vigentes(ahora).filter(pk=int(pack_id), tipo_evento=Evento.Tipo.PACK_ARRIENDO).first()
        if not evento or not evento.precio_pack_arriendo:
            continue
        productos = list(evento.productos_asociados.filter(estado=True))
        try:
            ids_items = sorted(int(i['id']) for i in grupo)
            fechas = {(date.fromisoformat(i['fechaInicio']), date.fromisoformat(i['fechaTermino'])) for i in grupo}
        except (KeyError, TypeError, ValueError):
            continue
        completo = (
            len(productos) >= 2
            and ids_items == sorted(p.id for p in productos)
            and len(fechas) == 1
            and all(i.get('cantidad') == 1 for i in grupo)
            and all(p.precioArriendoDia > 0 for p in productos)
        )
        if completo and evento.precio_pack_arriendo < sum(p.precioArriendoDia for p in productos):
            for producto_id, precio in prorratear_pack(evento.precio_pack_arriendo, productos).items():
                precios.setdefault(producto_id, precio)
    return precios
