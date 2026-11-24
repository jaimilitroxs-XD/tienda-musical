from django.contrib import admin
from .models import Evento


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo_evento', 'fecha_inicio', 'fecha_fin', 'activo')
    list_filter = ('tipo_evento', 'activo')
    search_fields = ('titulo', 'artista_invitado')
    filter_horizontal = ('productos_asociados',)
    readonly_fields = ('finalizado_manualmente',)
