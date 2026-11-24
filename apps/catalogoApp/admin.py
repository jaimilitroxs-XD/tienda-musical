from django.contrib import admin
from .models import Producto, ReporteMantencion

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'marca', 'categoria', 'precioVenta', 'precioArriendoDia', 'estado')
    search_fields = ('nombre', 'marca', 'categoria')
    list_filter = ('categoria', 'estado')

@admin.register(ReporteMantencion)
class ReporteMantencionAdmin(admin.ModelAdmin):
    list_display = ('id', 'producto', 'fechaReporte', 'estado')
    search_fields = ('producto__nombre', 'fallaReportada')
    list_filter = ('estado', 'fechaReporte')