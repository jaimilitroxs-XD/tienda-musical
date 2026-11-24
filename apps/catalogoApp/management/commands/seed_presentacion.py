from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.catalogoApp.models import Producto, ReporteMantencion
from apps.catalogoApp.views import api_reportar_falla
from apps.eventosApp.models import Evento
from apps.eventosApp.serializers import EventoSerializer
from apps.pedidosApp.models import Pedido
from apps.pedidosApp.views import api_pedidos, api_estado_pedido
from apps.usuariosApp.models import Cliente
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Carga tres pedidos pagados, tres mantenciones y tres eventos de presentación sin duplicarlos.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Valida la carga sin guardar cambios.')

    def handle(self, *args, **options):
        with transaction.atomic():
            resultado = self.cargar()
            if options['dry_run']:
                transaction.set_rollback(True)
        prefijo = 'Simulación sin guardar' if options['dry_run'] else 'Datos de presentación preparados'
        self.stdout.write(self.style.SUCCESS(f'{prefijo}: {resultado}'))

    def cargar(self):
        vendedor = User.objects.filter(is_staff=True, is_active=True).order_by('-is_superuser', 'pk').first()
        cliente = Cliente.objects.select_related('usuario__user').filter(
            usuario__user__username__in=['jaime', 'jaime@tienda.cl']).first()
        if not cliente:
            cliente = Cliente.objects.select_related('usuario__user').filter(
                usuario__correo='jaime@tienda.cl').first()
        if not cliente or not vendedor:
            raise CommandError('Se necesita la cuenta de Jaime como cliente y un vendedor o superadmin activo.')
        fabrica = APIRequestFactory()
        hoy = timezone.localdate()

        def llamar(vista, usuario, metodo, ruta, datos, **kwargs):
            peticion = getattr(fabrica, metodo)(ruta, datos, format='json')
            force_authenticate(peticion, user=usuario)
            respuesta = vista(peticion, **kwargs)
            if respuesta.status_code not in (200, 201):
                raise CommandError(f'No se pudo preparar un ejemplo: {respuesta.data}')
            return respuesta

        pedidos = []
        for numero, tipo, categoria in [(1, 'venta', 'Audífonos'), (2, 'arriendo', 'Micrófonos'), (3, 'venta', 'Accesorios')]:
            referencia = f'presentacion-simple-{numero}'
            pedido = Pedido.objects.filter(datosCliente__demo_ref=referencia).first()
            if not pedido:
                campo = 'stockDisponibleVenta' if tipo == 'venta' else 'stockDisponibleArriendo'
                producto = Producto.objects.filter(estado=True, categoria=categoria, **{f'{campo}__gt': 0}).order_by('pk').first()
                if not producto:
                    raise CommandError(f'No hay stock disponible en {categoria} para el ejemplo.')
                item = {'id': producto.pk, 'cantidad': 1, 'tipoOperacion': tipo}
                if tipo == 'arriendo':
                    item.update(fechaInicio=str(hoy + timedelta(days=1)), fechaTermino=str(hoy + timedelta(days=3)))
                contacto = {'nombre': cliente.usuario.nombre, 'apellidos': 'Demo', 'rut': '12.345.678-5',
                    'telefono': '912345678', 'correo': cliente.usuario.correo, 'demo_ref': referencia}
                respuesta = llamar(api_pedidos, cliente.usuario.user, 'post', '/api/pedidos/',
                    {'cliente': contacto, 'aceptaTerminos': True, 'items': [item]})
                pedido = Pedido.objects.get(pk=respuesta.data['id'])
                llamar(api_estado_pedido, vendedor, 'patch', f'/api/pedidos/{pedido.pk}/', {'estado': 'Pagado'}, pk=pedido.pk)
            pedidos.append(pedido.pk)

        mantenciones = []
        for categoria, falla in [('Guitarras y bajos', 'Una cuerda está dañada.'),
                ('Teclados y sintetizadores', 'Una tecla no responde.'), ('Audio profesional', 'El sonido se corta.')]:
            descripcion = f'{falla} Ejemplo de presentación.'
            reporte = ReporteMantencion.objects.filter(fallaReportada=descripcion).first()
            if not reporte:
                producto = Producto.objects.filter(estado=True, categoria=categoria, stockDisponibleVenta__gt=0).order_by('pk').first()
                if not producto:
                    raise CommandError(f'No hay stock de venta en {categoria} para reportar la falla.')
                respuesta = llamar(api_reportar_falla, vendedor, 'post', '/api/productos/reportar-falla/',
                    {'producto_id': producto.pk, 'descripcion': descripcion, 'tipoStock': 'venta'})
                reporte = ReporteMantencion.objects.get(pk=respuesta.data['reporte']['id'])
            mantenciones.append(reporte.pk)

        eventos = []
        for dias, artista in [(3, 'System of a Down'), (5, 'Mamborap'), (7, 'Los Bunkers')]:
            titulo = f'{artista} en la tienda'
            evento = Evento.objects.filter(titulo=titulo, descripcion='Evento ficticio para presentar el proyecto.').first()
            if not evento:
                inicio = timezone.localtime().replace(hour=19, minute=0, second=0, microsecond=0) + timedelta(days=dias)
                serializador = EventoSerializer(data={'titulo': titulo, 'descripcion': 'Evento ficticio para presentar el proyecto.',
                    'tipo_evento': 'en_vivo', 'artista_invitado': artista, 'lugar_o_link': 'Sala de Distortion House',
                    'fecha_inicio': inicio.isoformat(), 'fecha_fin': (inicio + timedelta(hours=2)).isoformat(), 'activo': True})
                serializador.is_valid(raise_exception=True)
                evento = serializador.save()
            eventos.append(evento.pk)
        return f'pedidos {pedidos}; mantenciones {mantenciones}; eventos {eventos}. Los pedidos también alimentan Reportes.'
