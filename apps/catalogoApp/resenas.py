"""Validación y gestión de reseñas."""
from datetime import timedelta

from django.core.paginator import Paginator
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response

from config.permissions import tecnico
from .models import Producto, Resena

RESENAS_POR_PAGINA = 5
ESTADOS_COMPRA = ['Pagado', 'Completado', 'Devuelto']
ORDENES = {
    'recientes': ('-creado', '-id'),
    'mejores': ('-calificacion', '-creado'),
    'peores': ('calificacion', '-creado'),
}


def es_moderador(user):
    return user.is_authenticated and user.is_staff


def puede_resenar(user):
    """Solo los clientes pueden opinar."""
    return user.is_authenticated and not user.is_staff and not tecnico(user)


def compradores_verificados(producto, usuarios_ids):
    """Clientes con pedidos pagados del producto."""
    from apps.pedidosApp.models import DetallePedido
    return set(DetallePedido.objects.filter(
        producto=producto, pedido__estado__in=ESTADOS_COMPRA,
        pedido__cliente__usuario__user_id__in=usuarios_ids,
    ).values_list('pedido__cliente__usuario__user_id', flat=True))


def nombre_publico(user):
    """Solo el primer nombre (nunca el correo)."""
    nombre = (user.first_name or '').strip().split(' ')[0]
    return nombre or 'Cliente'


class ResenaSerializer(serializers.ModelSerializer):
    calificacion = serializers.IntegerField(min_value=1, max_value=5)
    titulo = serializers.CharField(max_length=100, required=False, allow_blank=True, trim_whitespace=True)
    comentario = serializers.CharField(max_length=1000, required=False, allow_blank=True, trim_whitespace=True)
    autor = serializers.SerializerMethodField()
    compra_verificada = serializers.SerializerMethodField()
    es_mia = serializers.SerializerMethodField()
    editada = serializers.SerializerMethodField()

    class Meta:
        model = Resena
        fields = ['id', 'calificacion', 'titulo', 'comentario', 'autor', 'compra_verificada',
                  'es_mia', 'editada', 'visible', 'creado', 'actualizado']
        read_only_fields = ['visible', 'creado', 'actualizado']

    def get_autor(self, obj):
        return nombre_publico(obj.usuario)

    def get_compra_verificada(self, obj):
        verificados = self.context.get('verificados')
        if verificados is None:
            verificados = compradores_verificados(obj.producto, [obj.usuario_id])
        return obj.usuario_id in verificados

    def get_es_mia(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.id == obj.usuario_id)

    def get_editada(self, obj):
        return obj.actualizado - obj.creado > timedelta(minutes=1)


def resumen_resenas(producto):
    """Promedio, total y cantidad por estrella (solo reseñas visibles)."""
    visibles = producto.resenas.filter(visible=True)
    datos = visibles.aggregate(promedio=Avg('calificacion'), total=Count('id'))
    por_estrella = dict(visibles.values_list('calificacion').annotate(n=Count('id')))
    return {
        'promedio': round(datos['promedio'], 1) if datos['promedio'] is not None else None,
        'total': datos['total'],
        'distribucion': {str(e): por_estrella.get(e, 0) for e in range(5, 0, -1)},
    }


class ResenaPermission(BasePermission):
    """Lectura pública; escritura con sesión iniciada."""
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated


@api_view(['GET', 'POST'])
@permission_classes([ResenaPermission])
def api_resenas_producto(request, pk):
    producto = get_object_or_404(Producto, pk=pk)
    user = request.user

    if request.method == 'POST':
        if not puede_resenar(user):
            return Response({'error': 'Solo los clientes pueden publicar reseñas.'}, status=status.HTTP_403_FORBIDDEN)
        if not producto.estado:
            return Response({'error': 'Este producto ya no está disponible.'}, status=status.HTTP_400_BAD_REQUEST)
        if Resena.objects.filter(producto=producto, usuario=user).exists():
            return Response({'error': 'Ya publicaste una reseña de este producto. Puedes editarla.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ResenaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(producto=producto, usuario=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    
    moderador = es_moderador(user)
    resenas = producto.resenas.select_related('usuario', 'producto')
    if not moderador:
        resenas = resenas.filter(visible=True)
    resenas = resenas.order_by(*ORDENES.get(request.query_params.get('orden'), ORDENES['recientes']))
    pagina = Paginator(resenas, RESENAS_POR_PAGINA).get_page(request.query_params.get('page'))

    items = list(pagina.object_list)
    contexto = {'request': request, 'verificados': compradores_verificados(producto, [r.usuario_id for r in items])}
    mia = Resena.objects.filter(producto=producto, usuario=user).first() if user.is_authenticated else None
    return Response({
        'count': pagina.paginator.count,
        'page': pagina.number,
        'pages': pagina.paginator.num_pages,
        'page_size': RESENAS_POR_PAGINA,
        'results': ResenaSerializer(items, many=True, context=contexto).data,
        'resumen': resumen_resenas(producto),
        'mi_resena': ResenaSerializer(mia, context={'request': request}).data if mia else None,
        'autenticado': user.is_authenticated,
        'puede_resenar': puede_resenar(user) and producto.estado,
        'es_moderador': moderador,
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([ResenaPermission])
def api_detalle_resena(request, pk):
    resena = get_object_or_404(Resena.objects.select_related('usuario', 'producto'), pk=pk)
    autor = request.user.id == resena.usuario_id
    moderador = es_moderador(request.user)
    if not autor and not moderador:
        return Response({'error': 'No puedes modificar esta reseña.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        resena.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    
    if moderador and not autor:
        if set(request.data) - {'visible'} or not isinstance(request.data.get('visible'), bool):
            return Response({'error': 'El personal solo puede ocultar o mostrar reseñas.'}, status=status.HTTP_400_BAD_REQUEST)
        # Ocultar una reseña conserva su fecha de edición.
        Resena.objects.filter(pk=resena.pk).update(visible=request.data['visible'])
        resena.refresh_from_db()
        return Response(ResenaSerializer(resena, context={'request': request}).data)

    serializer = ResenaSerializer(resena, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
