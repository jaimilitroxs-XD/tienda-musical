from django.shortcuts import render

def ver_carrito(request):
    return render(request, 'pedidosApp/carrito.html')


from datetime import date
from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Prefetch, Q
from config.paginacion import paginar, ordenar_listado
from apps.eventosApp.precios import mapa_descuentos, precio_venta_final, precios_pack_pedido
from .models import Pedido, DetallePedido, Pago
from apps.catalogoApp.models import Producto
from apps.usuariosApp.models import Cliente


def serializar(p):
    items = []
    subtotal = Decimal(0)
    
    for d in p.detalles.all():
        subtotal += d.subTotal
        items.append(dict(id=d.producto_id, nombre=d.producto.nombre, marca=d.producto.marca,
            cantidad=d.cantidad, tipoOperacion=d.tipoOperacion, precioVenta=str(d.precioUnitario),
            precioArriendoDia=str(d.precioUnitario), fechaInicio=d.fechaInicio,
            fechaTermino=d.fechaTermino, diasArriendo=max(1, (d.fechaTermino-d.fechaInicio).days) if d.fechaInicio else 1))
    return dict(id=p.id, fecha=timezone.localtime(p.fechaPedido).strftime('%d-%m-%Y'),
        cliente=p.datosCliente, items=items, subtotal=str(subtotal), iva=str(p.total-subtotal),
        total=str(p.total), estado=p.estado)


def validar_cliente(data):
    import re
    if not all(str(data.get(k, '')).strip() for k in ['rut', 'nombre', 'apellidos', 'telefono', 'correo']):
        raise ValueError('Completa los datos de contacto.')
    validate_email(data['correo'])
    if not re.fullmatch(r'\d{8,9}', data['telefono']):
        raise ValueError('Teléfono inválido.')
    rut = data['rut'].replace('.', '').replace('-', '').upper()
    if not re.fullmatch(r'\d{7,8}[0-9K]', rut):
        raise ValueError('RUT inválido.')
    suma = sum(int(n) * (2 + i % 6) for i, n in enumerate(reversed(rut[:-1])))
    dv = 11 - suma % 11
    if rut[-1] != ('0' if dv == 11 else 'K' if dv == 10 else str(dv)):
        raise ValueError('El dígito verificador del RUT es incorrecto.')


@api_view(['GET', 'POST'])
def api_pedidos(request):
    if request.method == 'GET':
        qs = Pedido.objects.order_by('-id').prefetch_related(
            Prefetch('detalles', queryset=DetallePedido.objects.select_related('producto')))
        # ?mios=1 devuelve solo los pedidos propios.
        if not request.user.is_staff or request.query_params.get('mios') == '1':
            qs = qs.filter(cliente__usuario__user=request.user)
        estado = request.query_params.get('estado', '').strip()
        if estado:
            qs = qs.filter(estado__iexact=estado)
        tipo = request.query_params.get('tipo', '').strip()
        if tipo in ('venta', 'arriendo'):
            qs = qs.filter(detalles__tipoOperacion=tipo).distinct()
        q = request.query_params.get('q', '').strip()
        if q:
            filtro = Q(datosCliente__nombre__icontains=q) | Q(datosCliente__apellidos__icontains=q) | Q(datosCliente__correo__icontains=q)
            if q.lstrip('#').isdigit():
                filtro |= Q(pk=int(q.lstrip('#')))
            qs = qs.filter(filtro)
        qs = ordenar_listado(request, qs, {
            'id': 'id', 'cliente': 'datosCliente__nombre', 'total': 'total', 'estado': 'estado',
        })
        return paginar(request, qs, lambda objs: [serializar(p) for p in objs], por_defecto=10)
    if not request.user.is_superuser and (request.user.is_staff or request.user.groups.filter(name='Tecnico').exists()):
        return Response({'error': 'Usa una cuenta de cliente para comprar.'}, status=403)
    try:
        items = request.data.get('items', [])
        contacto = request.data.get('cliente', {})
        validar_cliente(contacto)
        if request.data.get('aceptaTerminos') is not True or not isinstance(items, list) or not 1 <= len(items) <= 100:
            raise ValueError('Revisa el carrito y acepta los términos.')
        
        descuentos = mapa_descuentos()
        precios_pack = precios_pack_pedido(items)
        with transaction.atomic():
            perfil = request.user.perfil_usuario
            cliente, _ = Cliente.objects.get_or_create(usuario=perfil)
            p = Pedido.objects.create(cliente=cliente, datosCliente=contacto, estado='Pendiente')
            subtotal = Decimal(0)
            for item in sorted(items, key=lambda x: int(x['id'])):
                producto = get_object_or_404(Producto.objects.select_for_update(), pk=item['id'], estado=True)
                cantidad = item.get('cantidad')
                tipo = item.get('tipoOperacion')
                if type(cantidad) is not int or cantidad < 1 or tipo not in ['venta', 'arriendo']:
                    raise ValueError('Cantidad o modalidad inválida.')
                inicio = termino = None
                dias = 1
                if tipo == 'arriendo':
                    inicio, termino = date.fromisoformat(item['fechaInicio']), date.fromisoformat(item['fechaTermino'])
                    if cantidad != 1 or inicio < timezone.localdate() or termino < inicio:
                        raise ValueError('Revisa las fechas del arriendo (máximo una unidad).')
                    dias = max(1, (termino-inicio).days)
                campo = 'stockDisponibleArriendo' if tipo == 'arriendo' else 'stockDisponibleVenta'
                if getattr(producto, campo) < cantidad:
                    raise ValueError(f'Stock insuficiente para {producto.nombre}.')
                setattr(producto, campo, getattr(producto, campo)-cantidad)
                producto.save()
                if tipo == 'arriendo':
                    precio = precios_pack.get(producto.id, producto.precioArriendoDia)
                else:
                    precio = precio_venta_final(producto, descuentos)
                monto = precio * cantidad * dias
                subtotal += monto
                DetallePedido.objects.create(pedido=p, producto=producto, cantidad=cantidad,
                    precioUnitario=precio, subTotal=monto, tipoOperacion=tipo, fechaInicio=inicio, fechaTermino=termino)
            p.total = (subtotal * Decimal('1.19')).quantize(Decimal('1'))
            p.save()
        return Response(serializar(p), status=201)
    except (ValueError, KeyError, TypeError, ValidationError, Cliente.DoesNotExist) as exc:
        return Response({'error': str(exc)}, status=400)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def api_estado_pedido(request, pk):
    with transaction.atomic():
        p = get_object_or_404(Pedido.objects.select_for_update(), pk=pk)
        nuevo = request.data.get('estado')
        tiene_arriendo = p.detalles.filter(tipoOperacion='arriendo').exists()
        permitido = (p.estado, nuevo) in [('Pendiente', 'Pagado'), ('Pagado', 'Completado')]
        permitido |= p.estado == 'Completado' and nuevo == 'Devuelto' and tiene_arriendo
        if not permitido:
            return Response({'error': 'Cambio de estado inválido.'}, status=400)
        if nuevo == 'Pagado':
            Pago.objects.create(pedido=p, monto=p.total, metodo='Pago presencial')
        if nuevo == 'Devuelto':
            for d in p.detalles.filter(tipoOperacion='arriendo').order_by('producto_id'):
                producto = Producto.objects.select_for_update().get(pk=d.producto_id)
                producto.stockDisponibleArriendo += d.cantidad
                producto.save()
        p.estado = nuevo
        p.save()
    return Response(serializar(p))


def datos_dashboard(qs, desde, hasta, max_dias=62, limite_alertas=8):
    """Datos extra del dashboard que el procedimiento reporte_tienda no calcula."""
    from datetime import timedelta
    from django.db.models import Count, F, Sum, Window
    from django.db.models.functions import TruncDate
    from apps.catalogoApp.models import ReporteMantencion

    por_dia = {}
    for fila in qs.annotate(dia=TruncDate('pedido__fechaPedido')).values('dia', 'tipoOperacion').annotate(total=Sum('subTotal')):
        entrada = por_dia.setdefault(fila['dia'], {'ventas': 0.0, 'arriendos': 0.0})
        entrada['ventas' if fila['tipoOperacion'] == 'venta' else 'arriendos'] += float(fila['total'] or 0)

    serie, agrupacion = [], 'dia'
    if por_dia:
        inicio = desde or min(por_dia)
        fin = hasta or max(por_dia)
        if (fin - inicio).days + 1 <= max_dias:
            
            dia = inicio
            while dia <= fin:
                valores = por_dia.get(dia, {'ventas': 0.0, 'arriendos': 0.0})
                serie.append({'periodo': dia.isoformat(), **valores})
                dia += timedelta(days=1)
        else:
            agrupacion = 'mes'
            por_mes = {}
            for dia, valores in por_dia.items():
                mes = por_mes.setdefault(dia.strftime('%Y-%m'), {'ventas': 0.0, 'arriendos': 0.0})
                mes['ventas'] += valores['ventas']
                mes['arriendos'] += valores['arriendos']
            serie = [{'periodo': mes, **valores} for mes, valores in sorted(por_mes.items())]

    categorias = [{'categoria': f['producto__categoria'], 'total': float(f['total'] or 0)}
                  for f in qs.values('producto__categoria').annotate(total=Sum('subTotal')).order_by('-total')]

    criticos = Producto.objects.filter(estado=True).annotate(
        libre=F('stockDisponibleVenta') + F('stockDisponibleArriendo')).filter(libre__lt=2).order_by('libre', 'nombre')
    mantenciones = ReporteMantencion.objects.filter(estado='pendiente').select_related('producto').order_by('fechaReporte', 'id')
    criticos = list(criticos.annotate(total_alertas=Window(Count('pk')))[:limite_alertas])
    mantenciones = list(mantenciones.annotate(total_alertas=Window(Count('pk')))[:limite_alertas])

    return {
        'serie': serie,
        'agrupacionSerie': agrupacion,
        'ingresosPorCategoria': categorias,
        'alertas': {
            'stockCriticoTotal': criticos[0].total_alertas if criticos else 0,
            'stockCritico': [dict(id=p.id, nombre=p.nombre, marca=p.marca, venta=p.stockDisponibleVenta,
                                  arriendo=p.stockDisponibleArriendo) for p in criticos],
            'enMantencionTotal': mantenciones[0].total_alertas if mantenciones else 0,
            'enMantencion': [dict(id=m.id, producto=m.producto.nombre, falla=m.fallaReportada,
                                  fecha=m.fechaReporte.isoformat(), tipoStock=m.tipoStock) for m in mantenciones],
        },
    }


@api_view(['GET'])
@permission_classes([IsAdminUser])
def api_reportes(request):
    from django.db.models import Sum, Count, F
    from django.db import connection
    import json
    qs = DetallePedido.objects.filter(pedido__estado__in=['Pagado', 'Completado', 'Devuelto'])
    try:
        desde = date.fromisoformat(request.query_params['fecha_inicio']) if request.query_params.get('fecha_inicio') else None
        hasta = date.fromisoformat(request.query_params['fecha_fin']) if request.query_params.get('fecha_fin') else None
        if desde and hasta and desde > hasta:
            return Response({'error': 'La fecha inicial no puede superar la fecha final.'}, status=400)
        for param, lookup in [('fecha_inicio', 'pedido__fechaPedido__date__gte'), ('fecha_fin', 'pedido__fechaPedido__date__lte')]:
            if request.query_params.get(param):
                qs = qs.filter(**{lookup: date.fromisoformat(request.query_params[param])})
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute('CALL public.reporte_tienda(%s::date, %s::date, NULL::jsonb)', [desde, hasta])
                resultado = cursor.fetchone()[0]
            resultado = json.loads(resultado) if isinstance(resultado, str) else resultado
            return Response({**resultado, **datos_dashboard(qs, desde, hasta)})
    except ValueError:
        return Response({'error': 'Fecha inválida.'}, status=400)
    # SQLite se usa solo en las pruebas.
    result = datos_dashboard(qs, desde, hasta)
    for tipo, label in [('venta', 'Ventas'), ('arriendo', 'Arriendos')]:
        subset = qs.filter(tipoOperacion=tipo)
        result['ingresos'+label] = subset.aggregate(n=Sum('subTotal'))['n'] or 0
        result['pedidos'+label+'Count'] = subset.values('pedido_id').distinct().count()
    result['topProductos'] = [dict(id=row['producto_id'], nombre=row['producto__nombre'], tipo=row['tipoOperacion'], cantidad=row['cantidad'], totalGenerado=row['totalGenerado']) for row in qs.values('producto_id', 'producto__nombre', 'tipoOperacion').annotate(cantidad=Sum('cantidad'), totalGenerado=Sum('subTotal')).order_by('-cantidad')[:10]]
    result['topClientes'] = [dict(id=row['pedido__cliente_id'], nombre=row['pedido__cliente__usuario__nombre'], email=row['pedido__cliente__usuario__correo'], cantidadPedidos=row['cantidadPedidos'], totalGastado=row['totalGastado']) for row in qs.values('pedido__cliente_id', 'pedido__cliente__usuario__nombre', 'pedido__cliente__usuario__correo').annotate(cantidadPedidos=Count('pedido', distinct=True), totalGastado=Sum('subTotal')).order_by('-cantidadPedidos')[:10]]
    return Response(result)
