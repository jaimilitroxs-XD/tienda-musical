from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.catalogoApp.models import Producto


class EventoQuerySet(models.QuerySet):
    def vigentes(self, ahora=None):
        """Eventos publicados y vigentes."""
        ahora = ahora or timezone.now()
        return self.filter(activo=True, finalizado_manualmente=False, fecha_inicio__lte=ahora, fecha_fin__gte=ahora)

    def visibles(self, ahora=None):
        """Eventos publicados que todavía no terminan."""
        ahora = ahora or timezone.now()
        return self.filter(activo=True, finalizado_manualmente=False, fecha_fin__gte=ahora)

    def con_estado(self, estado, ahora=None):
        ahora = ahora or timezone.now()
        filtros = {
            'finalizado': Q(finalizado_manualmente=True) | Q(fecha_fin__lt=ahora),
            'desactivado': Q(finalizado_manualmente=False, activo=False, fecha_fin__gte=ahora),
            'programado': Q(finalizado_manualmente=False, activo=True, fecha_inicio__gt=ahora),
            'activo': Q(finalizado_manualmente=False, activo=True, fecha_inicio__lte=ahora, fecha_fin__gte=ahora),
        }
        return self.filter(filtros[estado]) if estado in filtros else self


class Evento(models.Model):
    class Tipo(models.TextChoices):
        DESCUENTO = 'descuento', 'Descuento directo'
        PACK_ARRIENDO = 'pack_arriendo', 'Pack de arriendo'
        PREVENTA = 'preventa', 'Lanzamiento / Preventa'
        OUTLET = 'outlet', 'Liquidación / Outlet ex-arriendo'
        EN_VIVO = 'en_vivo', 'DJs y músicos en vivo'

    class Condicion(models.TextChoices):
        COMO_NUEVO = 'como_nuevo', 'Como nuevo'
        BUEN_ESTADO = 'buen_estado', 'Buen estado'
        CON_DETALLES = 'con_detalles', 'Con detalles estéticos'

    
    TIPOS_CON_DESCUENTO = (Tipo.DESCUENTO, Tipo.OUTLET, Tipo.PREVENTA)

    titulo = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    tipo_evento = models.CharField(max_length=20, choices=Tipo.choices)
    imagen_banner = models.ImageField(upload_to='eventos/', blank=True, null=True)

    
    porcentaje_descuento = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(90)])
    
    precio_pack_arriendo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    artista_invitado = models.CharField(max_length=150, blank=True, default='')
    lugar_o_link = models.CharField(max_length=255, blank=True, default='')
    
    fecha_disponibilidad = models.DateField(null=True, blank=True)
    permite_reserva = models.BooleanField(default=True)
    
    condicion_outlet = models.CharField(max_length=20, choices=Condicion.choices, blank=True, default='')
    estado_verificado = models.BooleanField(default=False)

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    activo = models.BooleanField(default=True)
    finalizado_manualmente = models.BooleanField(default=False)
    productos_asociados = models.ManyToManyField(Producto, related_name='eventos', blank=True)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    objects = EventoQuerySet.as_manager()

    class Meta:
        ordering = ['fecha_inicio', 'id']
        constraints = [
            models.CheckConstraint(condition=Q(fecha_fin__gte=F('fecha_inicio')), name='evento_fin_despues_de_inicio'),
        ]

    def estado(self, ahora=None):
        ahora = ahora or timezone.now()
        if self.finalizado_manualmente or self.fecha_fin < ahora:
            return 'finalizado'
        if not self.activo:
            return 'desactivado'
        if self.fecha_inicio > ahora:
            return 'programado'
        return 'activo'

    def __str__(self):
        return f'{self.get_tipo_evento_display()}: {self.titulo}'
