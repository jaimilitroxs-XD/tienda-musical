from rest_framework import serializers
from .models import Producto, ReporteMantencion

class ProductoSerializer(serializers.ModelSerializer):
    stockComprometidoVenta = serializers.SerializerMethodField()
    stockComprometidoArriendo = serializers.SerializerMethodField()
    
    precioVentaPromo = serializers.SerializerMethodField()
    promocion = serializers.SerializerMethodField()
    
    calificacionPromedio = serializers.SerializerMethodField()
    totalResenas = serializers.SerializerMethodField()

    def _calificaciones(self, obj):
        
        if hasattr(obj, 'total_resenas'):
            return obj.calificacion_promedio, obj.total_resenas
        from django.db.models import Avg, Count
        datos = obj.resenas.filter(visible=True).aggregate(p=Avg('calificacion'), n=Count('id'))
        return datos['p'], datos['n']

    def get_calificacionPromedio(self, obj):
        promedio = self._calificaciones(obj)[0]
        return round(float(promedio), 1) if promedio is not None else None

    def get_totalResenas(self, obj):
        return self._calificaciones(obj)[1]

    def _promo(self, obj):
        from apps.eventosApp.precios import mapa_descuentos
        
        if 'descuentos' not in self.context:
            self.context['descuentos'] = mapa_descuentos()
        return self.context['descuentos'].get(obj.id)

    def get_precioVentaPromo(self, obj):
        from apps.eventosApp.precios import aplicar_descuento
        promo = self._promo(obj)
        return aplicar_descuento(obj.precioVenta, promo['porcentaje']) if promo else None

    def get_promocion(self, obj):
        promo = self._promo(obj)
        if not promo:
            return None
        return {'eventoId': promo['evento_id'], 'titulo': promo['titulo'], 'tipo': promo['tipo'], 'porcentaje': promo['porcentaje']}

    def comprometido(self, obj, tipo):
        from django.db.models import Sum
        estados = ['Pendiente', 'Pagado', 'Completado'] if tipo == 'arriendo' else ['Pendiente', 'Pagado']
        return obj.detallepedido_set.filter(tipoOperacion=tipo, pedido__estado__in=estados).aggregate(n=Sum('cantidad'))['n'] or 0

    
    def get_stockComprometidoVenta(self, obj):
        if hasattr(obj, 'comprometido_venta'):
            return obj.comprometido_venta or 0
        return self.comprometido(obj, 'venta')

    def get_stockComprometidoArriendo(self, obj):
        if hasattr(obj, 'comprometido_arriendo'):
            return obj.comprometido_arriendo or 0
        return self.comprometido(obj, 'arriendo')

    def validate(self, attrs):
        from django.core.exceptions import ValidationError
        obj = Producto()
        if self.instance:
            for field in Producto._meta.fields:
                setattr(obj, field.attname, getattr(self.instance, field.attname))
        for key, value in attrs.items():
            setattr(obj, key, value)
        try:
            obj.clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        if self.instance:
            venta, arriendo = self.comprometido(obj, 'venta'), self.comprometido(obj, 'arriendo')
            pendientes = obj.mantenciones.filter(estado='pendiente').count()
            if not obj.estado and (venta or arriendo or pendientes):
                raise serializers.ValidationError('Hay pedidos o mantenciones pendientes.')
            if obj.stockTotal < obj.stockDisponibleVenta + obj.stockDisponibleArriendo + venta + arriendo + pendientes:
                raise serializers.ValidationError('El stock total debe cubrir unidades libres, comprometidas y en taller.')
        return attrs

    class Meta:
        model = Producto
        fields = '__all__'

class ReporteMantencionSerializer(serializers.ModelSerializer):
    
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')

    class Meta:
        model = ReporteMantencion
        fields = '__all__'
