from django.contrib import admin
from django.contrib import admin
from .models import Pedido, Venta, Arriendo, DetallePedido, Pago

class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 1

class PagoInline(admin.StackedInline):
    model = Pago
    can_delete = False

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'fechaPedido', 'estado', 'total')
    list_filter = ('estado', 'fechaPedido')
    search_fields = ('id', 'cliente__usuario__correo', 'cliente__usuario__nombre')
    inlines = [DetallePedidoInline, PagoInline]

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'get_cliente', 'get_total', 'get_estado')
    
    def get_cliente(self, obj):
        return obj.pedido.cliente
    get_cliente.short_description = 'Cliente'

    def get_total(self, obj):
        return obj.pedido.total
    get_total.short_description = 'Total'

    def get_estado(self, obj):
        return obj.pedido.estado
    get_estado.short_description = 'Estado'

@admin.register(Arriendo)
class ArriendoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'fechaInicio', 'fechaTermino', 'fechaDevolucionReal', 'recargoAtraso')
    list_filter = ('fechaInicio', 'fechaTermino')
    search_fields = ('pedido__id', 'pedido__cliente__usuario__correo')

@admin.register(DetallePedido)
class DetallePedidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'pedido', 'producto', 'cantidad', 'precioUnitario', 'subTotal')
    search_fields = ('pedido__id', 'producto__nombre')

@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('id', 'pedido', 'monto', 'fechaPago', 'metodo', 'estado')
    list_filter = ('metodo', 'estado', 'fechaPago')
    search_fields = ('pedido__id', 'metodo')