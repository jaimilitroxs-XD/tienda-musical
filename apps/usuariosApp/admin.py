from django.contrib import admin
from .models import Usuario, Cliente, Tecnico, VendedorAdmin


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'correo', 'telefono', 'obtener_activo', 'obtener_fecha')
    list_filter = ('user__is_active',)
    search_fields = ('nombre', 'correo', 'telefono')
    list_select_related = ('user',)

    @admin.display(boolean=True, description='Activo')
    def obtener_activo(self, obj):
        return obj.user.is_active if obj.user else False

    @admin.display(description='Fecha Registro')
    def obtener_fecha(self, obj):
        fecha = getattr(obj, 'fechaRegistro', None) or (obj.user.date_joined if obj.user else None)
        if fecha:
            try:
                return fecha.strftime('%d/%m/%Y %H:%M')
            except AttributeError:
                
                return str(fecha)[:16]
        return '-'


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('usuario_id', 'obtener_nombre', 'obtener_correo', 'obtener_telefono')
    search_fields = ('usuario__nombre', 'usuario__correo')
    list_select_related = ('usuario',)

    @admin.display(description='Nombre')
    def obtener_nombre(self, obj):
        return obj.usuario.nombre if obj.usuario else ''

    @admin.display(description='Correo')
    def obtener_correo(self, obj):
        return obj.usuario.correo if obj.usuario else ''

    @admin.display(description='Teléfono')
    def obtener_telefono(self, obj):
        return obj.usuario.telefono or '-' if obj.usuario else '-'


@admin.register(Tecnico)
class TecnicoAdmin(admin.ModelAdmin):
    list_display = ('usuario_id', 'obtener_nombre', 'obtener_correo', 'obtener_telefono')
    search_fields = ('usuario__nombre', 'usuario__correo')
    list_select_related = ('usuario',)

    @admin.display(description='Nombre')
    def obtener_nombre(self, obj):
        return obj.usuario.nombre if obj.usuario else ''

    @admin.display(description='Correo')
    def obtener_correo(self, obj):
        return obj.usuario.correo if obj.usuario else ''

    @admin.display(description='Teléfono')
    def obtener_telefono(self, obj):
        return obj.usuario.telefono or '-' if obj.usuario else '-'


@admin.register(VendedorAdmin)
class VendedorAdminAdmin(admin.ModelAdmin):
    list_display = ('usuario_id', 'obtener_nombre', 'obtener_correo', 'obtener_telefono')
    search_fields = ('usuario__nombre', 'usuario__correo')
    list_select_related = ('usuario',)

    @admin.display(description='Nombre')
    def obtener_nombre(self, obj):
        return obj.usuario.nombre if obj.usuario else ''

    @admin.display(description='Correo')
    def obtener_correo(self, obj):
        return obj.usuario.correo if obj.usuario else ''

    @admin.display(description='Teléfono')
    def obtener_telefono(self, obj):
        return obj.usuario.telefono or '-' if obj.usuario else '-'