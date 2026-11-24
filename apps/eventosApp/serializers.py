from decimal import Decimal

from rest_framework import serializers
from django.utils import timezone
from django.db import connection, transaction

from apps.catalogoApp.models import Producto
from .models import Evento
from .precios import aplicar_descuento, mapa_descuentos, prorratear_pack

LIMITE_PUBLICADOS = 6


def validar_cupo_evento(instancia, datos):
    if instancia and instancia.finalizado_manualmente:
        if datos.get('activo'):
            raise serializers.ValidationError({'activo': 'Un evento finalizado no se puede volver a publicar.'})
        return
    ahora = timezone.now()
    activo = datos.get('activo', instancia.activo if instancia else True)
    fin = datos.get('fecha_fin', instancia.fecha_fin if instancia else None)
    if not activo or not fin or fin < ahora:
        return
    if instancia and instancia.activo and instancia.fecha_fin >= ahora:
        return
    if Evento.objects.visibles(ahora).count() >= LIMITE_PUBLICADOS:
        raise serializers.ValidationError({'activo': 'Ya hay 6 eventos publicados. Desactiva uno antes de publicar otro.'})


def bloquear_publicacion():
    # Evita publicaciones simultáneas por encima del límite.
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_xact_lock(20261124, 6)')


CAMPOS_POR_TIPO = {
    Evento.Tipo.DESCUENTO: {'porcentaje_descuento'},
    Evento.Tipo.PACK_ARRIENDO: {'precio_pack_arriendo'},
    Evento.Tipo.PREVENTA: {'porcentaje_descuento', 'fecha_disponibilidad', 'permite_reserva'},
    Evento.Tipo.OUTLET: {'porcentaje_descuento', 'condicion_outlet', 'estado_verificado'},
    Evento.Tipo.EN_VIVO: {'artista_invitado', 'lugar_o_link'},
}
VALORES_VACIOS = {
    'porcentaje_descuento': Decimal(0), 'precio_pack_arriendo': None, 'artista_invitado': '',
    'lugar_o_link': '', 'fecha_disponibilidad': None, 'permite_reserva': True,
    'condicion_outlet': '', 'estado_verificado': False,
}


class EventoSerializer(serializers.ModelSerializer):
    productos_asociados = serializers.PrimaryKeyRelatedField(many=True, queryset=Producto.objects.all(), required=False)
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    estado = serializers.SerializerMethodField()
    productos = serializers.SerializerMethodField()
    precio_pack_normal = serializers.SerializerMethodField()

    @transaction.atomic
    def create(self, validated_data):
        bloquear_publicacion()
        validar_cupo_evento(None, validated_data)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        bloquear_publicacion()
        instance.refresh_from_db()
        validar_cupo_evento(instance, validated_data)
        return super().update(instance, validated_data)

    def validate_titulo(self, titulo):
        if len(titulo.strip()) < 3:
            raise serializers.ValidationError('El título debe tener al menos 3 caracteres.')
        return titulo.strip()

    def validate_precio_pack_arriendo(self, precio):
        if precio is not None and precio <= 0:
            raise serializers.ValidationError('El precio del pack debe ser mayor a 0.')
        return precio

    class Meta:
        model = Evento
        fields = [
            'id', 'titulo', 'descripcion', 'tipo_evento', 'tipo_evento_display', 'imagen_banner',
            'porcentaje_descuento', 'precio_pack_arriendo', 'artista_invitado', 'lugar_o_link',
            'fecha_disponibilidad', 'permite_reserva', 'condicion_outlet', 'estado_verificado',
            'fecha_inicio', 'fecha_fin', 'activo', 'finalizado_manualmente', 'estado', 'productos_asociados', 'productos',
            'precio_pack_normal', 'creado', 'actualizado',
        ]
        read_only_fields = ['creado', 'actualizado', 'finalizado_manualmente']

    def get_estado(self, obj):
        return obj.estado()

    def _descuentos(self):
        if 'descuentos' not in self.context:
            self.context['descuentos'] = mapa_descuentos()
        return self.context['descuentos']

    def get_productos(self, obj):
        """Productos del evento y sus precios promocionales."""
        productos = [p for p in obj.productos_asociados.all() if p.estado or self.context.get('admin')]
        descuentos = self._descuentos()
        pack = {}
        if obj.tipo_evento == Evento.Tipo.PACK_ARRIENDO and obj.precio_pack_arriendo and len(productos) >= 2:
            pack = prorratear_pack(obj.precio_pack_arriendo, productos)
        resultado = []
        for p in productos:
            promo = descuentos.get(p.id)
            resultado.append({
                'id': p.id, 'nombre': p.nombre, 'marca': p.marca, 'categoria': p.categoria,
                'foto': p.foto.url if p.foto else None,
                'precioVenta': p.precioVenta, 'precioArriendoDia': p.precioArriendoDia,
                'stockDisponibleVenta': p.stockDisponibleVenta, 'stockDisponibleArriendo': p.stockDisponibleArriendo,
                'estado': p.estado,
                
                'precioVentaPromo': aplicar_descuento(p.precioVenta, promo['porcentaje']) if promo else None,
                'descuentoPromo': promo['porcentaje'] if promo else None,
                
                'precioPackDia': pack.get(p.id),
            })
        return resultado

    def get_precio_pack_normal(self, obj):
        if obj.tipo_evento != Evento.Tipo.PACK_ARRIENDO:
            return None
        return sum((p.precioArriendoDia for p in obj.productos_asociados.all()), Decimal(0))

    def validate(self, attrs):
        def valor(campo):
            if campo in attrs:
                return attrs[campo]
            if self.instance is not None:
                if campo == 'productos_asociados':
                    return list(self.instance.productos_asociados.all())
                return getattr(self.instance, campo)
            return VALORES_VACIOS.get(campo)

        tipo = valor('tipo_evento')
        inicio, fin = valor('fecha_inicio'), valor('fecha_fin')
        productos = valor('productos_asociados') or []
        errores = {}

        hoy = timezone.localdate()
        cambia_inicio = self.instance is None or inicio != self.instance.fecha_inicio
        cambia_fin = self.instance is None or fin != self.instance.fecha_fin
        if inicio and cambia_inicio and timezone.localtime(inicio).date() < hoy:
            errores['fecha_inicio'] = 'El evento no puede comenzar antes de hoy.'
        if inicio and fin and fin <= inicio:
            errores['fecha_fin'] = 'La fecha de término debe ser posterior al inicio.'
        elif fin and (cambia_inicio or cambia_fin) and fin <= timezone.now():
            errores['fecha_fin'] = 'La fecha de término debe estar en el futuro.'

        if len({p.pk for p in productos}) != len(productos):
            errores['productos_asociados'] = 'No puedes repetir un producto dentro del evento.'

        porcentaje = valor('porcentaje_descuento') or Decimal(0)
        if tipo in (Evento.Tipo.DESCUENTO, Evento.Tipo.OUTLET):
            if porcentaje <= 0:
                errores['porcentaje_descuento'] = 'Indica un porcentaje de descuento mayor a 0.'
            if not productos:
                errores['productos_asociados'] = 'Selecciona al menos un producto.'
        elif tipo == Evento.Tipo.PREVENTA:
            disponible = valor('fecha_disponibilidad')
            cambia_disponibilidad = self.instance is None or disponible != self.instance.fecha_disponibilidad
            if not disponible:
                errores['fecha_disponibilidad'] = 'Indica desde cuándo estará disponible.'
            elif cambia_disponibilidad and disponible < hoy:
                errores['fecha_disponibilidad'] = 'La disponibilidad no puede ser anterior a hoy.'
            elif inicio and disponible < timezone.localtime(inicio).date():
                errores['fecha_disponibilidad'] = 'La disponibilidad no puede ser anterior al inicio de la preventa.'
            if not productos:
                errores['productos_asociados'] = 'Selecciona el o los productos en preventa.'
        elif tipo == Evento.Tipo.PACK_ARRIENDO:
            precio = valor('precio_pack_arriendo')
            if len(productos) < 2:
                errores['productos_asociados'] = 'Un pack necesita al menos 2 productos.'
            elif any(p.precioArriendoDia <= 0 for p in productos):
                errores['productos_asociados'] = 'Todos los productos del pack deben tener precio de arriendo.'
            if not precio or precio <= 0:
                errores['precio_pack_arriendo'] = 'Indica el precio por día del pack.'
            elif len(productos) >= 2 and precio >= sum(p.precioArriendoDia for p in productos):
                errores['precio_pack_arriendo'] = 'El precio del pack debe ser menor que arrendarlos por separado.'
        elif tipo == Evento.Tipo.EN_VIVO:
            if not (valor('artista_invitado') or '').strip():
                errores['artista_invitado'] = 'Indica el artista o DJ invitado.'
            if not (valor('lugar_o_link') or '').strip():
                errores['lugar_o_link'] = 'Indica el lugar o el link de la transmisión.'

        if errores:
            raise serializers.ValidationError(errores)

        validar_cupo_evento(self.instance, attrs)

        
        if tipo:
            for campo, vacio in VALORES_VACIOS.items():
                if campo not in CAMPOS_POR_TIPO[tipo]:
                    attrs[campo] = vacio
        return attrs
