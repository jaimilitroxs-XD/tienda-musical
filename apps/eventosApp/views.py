from django.db.models import Count, Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAdminUser
from rest_framework.response import Response

from config.paginacion import paginar
from .models import Evento
from .precios import mapa_descuentos
from .serializers import EventoSerializer


class EventoPermission(BasePermission):
    """Lectura pública; gestión para vendedores y superadmin."""
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or (request.user.is_authenticated and request.user.is_staff)


def vista_admin(request):
    return request.query_params.get('admin', '').lower() == 'true' and request.user.is_authenticated and request.user.is_staff


def contexto(request, admin):
    return {'request': request, 'descuentos': mapa_descuentos(), 'admin': admin}


@api_view(['GET', 'POST'])
@permission_classes([EventoPermission])
def api_eventos(request):
    if request.method == 'POST':
        serializer = EventoSerializer(data=request.data, context=contexto(request, True))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    admin = vista_admin(request)
    eventos = Evento.objects.prefetch_related('productos_asociados')
    if admin:
        
        eventos = eventos.con_estado(request.query_params.get('estado', '')).order_by('-fecha_inicio', '-id')
        q = request.query_params.get('q', '').strip()
        if q:
            eventos = eventos.filter(Q(titulo__icontains=q) | Q(artista_invitado__icontains=q))
    else:
        
        eventos = eventos.visibles().order_by('fecha_inicio', 'id')
    tipo = request.query_params.get('tipo', '').strip()
    if tipo in Evento.Tipo.values:
        eventos = eventos.filter(tipo_evento=tipo)

    ctx = contexto(request, admin)
    return paginar(request, eventos, lambda objs: EventoSerializer(objs, many=True, context=ctx).data, por_defecto=10)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([EventoPermission])
def api_detalle_evento(request, pk):
    admin = request.user.is_authenticated and request.user.is_staff
    base = Evento.objects.prefetch_related('productos_asociados')
    evento = get_object_or_404(base if admin else base.visibles(), pk=pk)

    if request.method == 'GET':
        return Response(EventoSerializer(evento, context=contexto(request, admin)).data)
    if request.method == 'DELETE':
        evento.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = EventoSerializer(evento, data=request.data, partial=True, context=contexto(request, True))
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def api_resumen_eventos(request):
    """Cantidad de eventos por estado para las tarjetas del panel."""
    ahora = timezone.now()
    
    resumen = Evento.objects.aggregate(
        n_total=Count('id'),
        n_activo=Count('id', filter=Q(finalizado_manualmente=False, activo=True, fecha_inicio__lte=ahora, fecha_fin__gte=ahora)),
        n_programado=Count('id', filter=Q(finalizado_manualmente=False, activo=True, fecha_inicio__gt=ahora)),
        n_finalizado=Count('id', filter=Q(finalizado_manualmente=True) | Q(fecha_fin__lt=ahora)),
        n_desactivado=Count('id', filter=Q(finalizado_manualmente=False, activo=False, fecha_fin__gte=ahora)),
    )
    return Response({clave.removeprefix('n_'): valor for clave, valor in resumen.items()})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def api_finalizar_evento(request, pk):
    evento = get_object_or_404(Evento.objects.select_for_update(), pk=pk)
    if evento.estado() != 'finalizado':
        evento.finalizado_manualmente = True
        evento.activo = False
        evento.save(update_fields=['finalizado_manualmente', 'activo', 'actualizado'])
    return Response(EventoSerializer(evento, context=contexto(request, True)).data)
