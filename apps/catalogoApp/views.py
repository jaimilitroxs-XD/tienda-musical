from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Producto, ReporteMantencion
from .serializers import ProductoSerializer, ReporteMantencionSerializer
from config.permissions import CatalogoPermission, TallerPermission
from rest_framework.permissions import IsAdminUser
from django.db import transaction
from django.db.models import Count, Q, Sum
from config.paginacion import paginar, ordenar_listado


def con_stock_comprometido(queryset):
    
    return queryset.annotate(
        comprometido_venta=Sum('detallepedido__cantidad', filter=Q(
            detallepedido__tipoOperacion='venta', detallepedido__pedido__estado__in=['Pendiente', 'Pagado'])),
        comprometido_arriendo=Sum('detallepedido__cantidad', filter=Q(
            detallepedido__tipoOperacion='arriendo', detallepedido__pedido__estado__in=['Pendiente', 'Pagado', 'Completado'])),
    )


def con_calificaciones(queryset):
    # Las subconsultas evitan duplicar el stock al combinar reseñas.
    from django.db.models import Avg, IntegerField, OuterRef, Subquery
    from django.db.models.functions import Coalesce
    from .models import Resena
    visibles = Resena.objects.filter(producto=OuterRef('pk'), visible=True).order_by().values('producto')
    return queryset.annotate(
        calificacion_promedio=Subquery(visibles.annotate(v=Avg('calificacion')).values('v')[:1]),
        total_resenas=Coalesce(Subquery(visibles.annotate(v=Count('id')).values('v')[:1], output_field=IntegerField()), 0),
    )


def filtrar_productos(request, productos):
    
    q = request.query_params.get('q', '').strip()
    categoria = request.query_params.get('categoria', '').strip()
    estado = request.query_params.get('estado', '').strip()
    if q:
        productos = productos.filter(Q(nombre__icontains=q) | Q(marca__icontains=q))
    if categoria:
        
        filtro = Q()
        for nombre in (c.strip() for c in categoria.split(',')):
            if nombre:
                filtro |= Q(categoria__iexact=nombre)
        productos = productos.filter(filtro)
    subcategoria = request.query_params.get('subcategoria', '').strip()
    if subcategoria:
        productos = productos.filter(subcategoria__iexact=subcategoria)
    if estado == 'activos':
        productos = productos.filter(estado=True)
    elif estado == 'inactivos':
        productos = productos.filter(estado=False)
    return productos


def puede_ver_inactivos(request):
    return request.query_params.get('admin', 'false').lower() == 'true' and request.user.is_authenticated and (
        request.user.is_staff or request.user.groups.filter(name='Tecnico').exists())



@api_view(['GET', 'POST'])
@permission_classes([CatalogoPermission])
def api_lista_productos(request):
    if request.method == 'GET':
        if puede_ver_inactivos(request):
            productos = Producto.objects.all()
        else:
            productos = Producto.objects.filter(estado=True)

        
        orden = {'precio_asc': ('precioVenta', 'id'), 'precio_desc': ('-precioVenta', 'id')}.get(
            request.query_params.get('orden', ''), ('id',))
        productos = con_calificaciones(con_stock_comprometido(filtrar_productos(request, productos))).order_by(*orden)
        productos = ordenar_listado(request, productos, {
            'id': 'id', 'nombre': 'nombre', 'categoria': 'categoria', 'precioVenta': 'precioVenta',
            'precioArriendoDia': 'precioArriendoDia', 'stockTotal': 'stockTotal', 'estado': 'estado',
        })
        return paginar(request, productos, lambda objs: ProductoSerializer(objs, many=True).data, por_defecto=10)
    
    elif request.method == 'POST':
        serializer = ProductoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([CatalogoPermission])
def api_categorias_productos(request):
    productos = Producto.objects.all() if puede_ver_inactivos(request) else Producto.objects.filter(estado=True)
    filas = productos.values('categoria', 'subcategoria').annotate(cantidad=Count('id')).order_by('categoria', 'subcategoria')
    resultado = {}
    for fila in filas:
        cat = resultado.setdefault(fila['categoria'], {'nombre': fila['categoria'], 'cantidad': 0, 'subcategorias': []})
        cat['cantidad'] += fila['cantidad']
        if fila['subcategoria']:
            cat['subcategorias'].append({'nombre': fila['subcategoria'], 'cantidad': fila['cantidad']})
    return Response(list(resultado.values()))



@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([CatalogoPermission])
def api_detalle_producto(request, pk):
    productos = Producto.objects.all()
    if request.method == 'GET':
        productos = con_calificaciones(con_stock_comprometido(productos))
    producto = get_object_or_404(productos, pk=pk)

    if request.method == 'GET':
        serializer = ProductoSerializer(producto)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ProductoSerializer(producto, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        serializer = ProductoSerializer(producto, data={'estado': False}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'mensaje': 'Producto desactivado.'})



@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def api_reportar_falla(request):
    data = request.data
    producto_id = data.get('producto_id')
    descripcion = data.get('descripcion', '').strip()

    if not producto_id or not descripcion:
        return Response({'error': 'El producto y la descripción del problema son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

    producto = get_object_or_404(Producto.objects.select_for_update(), pk=producto_id)
    tipo = data.get('tipoStock', 'venta')
    if tipo not in ('venta', 'arriendo'):
        return Response({'error': 'Selecciona stock de venta o arriendo.'}, status=400)
    campo = 'stockDisponibleArriendo' if tipo == 'arriendo' else 'stockDisponibleVenta'
    if getattr(producto, campo) < 1:
        return Response({'error': 'No hay stock libre para enviar a mantención.'}, status=400)
    setattr(producto, campo, getattr(producto, campo) - 1)
    producto.save()

    reporte = ReporteMantencion.objects.create(
        producto=producto,
        fallaReportada=descripcion,
        estado='pendiente'
        , tipoStock=tipo
    )

    serializer = ReporteMantencionSerializer(reporte)
    return Response({
        'exito': True,
        'mensaje': 'Falla registrada exitosamente.',
        'reporte': serializer.data
    }, status=status.HTTP_201_CREATED)



@api_view(['GET'])
@permission_classes([TallerPermission])
def api_lista_mantenciones(request):
    orden = request.query_params.get('orden', 'antiguos')

    mantenciones = ReporteMantencion.objects.filter(estado='pendiente').select_related('producto')
    q = request.query_params.get('q', '').strip()
    if q:
        mantenciones = mantenciones.filter(Q(producto__nombre__icontains=q) | Q(fallaReportada__icontains=q))
    tipo = request.query_params.get('tipoStock', '').strip()
    if tipo in ('venta', 'arriendo'):
        mantenciones = mantenciones.filter(tipoStock=tipo)

    
    if orden == 'antiguos':
        mantenciones = mantenciones.order_by('fechaReporte', 'id')
    else:
        mantenciones = mantenciones.order_by('-fechaReporte', '-id')

    mantenciones = ordenar_listado(request, mantenciones, {
        'id': 'id', 'producto_nombre': 'producto__nombre', 'fallaReportada': 'fallaReportada',
        'fechaReporte': 'fechaReporte',
    })
    return paginar(request, mantenciones, lambda objs: ReporteMantencionSerializer(objs, many=True).data, por_defecto=10)



@api_view(['POST'])
@permission_classes([TallerPermission])
@transaction.atomic
def api_marcar_reparado(request, pk):
    reporte = get_object_or_404(ReporteMantencion.objects.select_for_update(), pk=pk)
    if reporte.estado != 'pendiente':
        return Response({'error': 'La mantención ya fue resuelta.'}, status=400)
    
    descripcion_reparacion = request.data.get('descripcionReparacion', '').strip()
    tipo_stock = reporte.tipoStock

    if not descripcion_reparacion:
        return Response({'error': 'Debe ingresar una breve descripción del trabajo realizado.'}, status=status.HTTP_400_BAD_REQUEST)

    reporte.descripcionReparacion = descripcion_reparacion
    reporte.fechaReparacion = timezone.now().date()
    reporte.estado = 'reparado'
    reporte.save()

    producto = Producto.objects.select_for_update().get(pk=reporte.producto_id)
    if tipo_stock == 'arriendo':
        producto.stockDisponibleArriendo += 1
    else:
        producto.stockDisponibleVenta += 1
    
    producto.save()

    serializer = ReporteMantencionSerializer(reporte)
    return Response({
        'exito': True,
        'mensaje': 'Producto marcado como reparado y stock actualizado exitosamente.',
        'reporte': serializer.data
    }, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([TallerPermission])
def api_historial_mantenciones_producto(request, pk):
    producto = get_object_or_404(Producto, pk=pk)
    mantenciones = ReporteMantencion.objects.filter(producto=producto).select_related('producto').order_by('-fechaReporte', '-id')
    serializer = ReporteMantencionSerializer(mantenciones, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
