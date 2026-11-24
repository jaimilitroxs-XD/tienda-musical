from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from apps.eventosApp.models import Evento
from apps.pedidosApp.models import Pedido, Pago
from apps.usuariosApp.models import Cliente, Usuario
from .models import Producto, ReporteMantencion


class DatosPresentacionTest(TestCase):
    def setUp(self):
        User.objects.create_user('admin', is_staff=True, is_superuser=True)
        user = User.objects.create_user('jaime@tienda.cl')
        Cliente.objects.create(usuario=Usuario.objects.create(user=user, nombre='Jaime', correo='jaime@tienda.cl'))
        for categoria in ['Audífonos', 'Micrófonos', 'Accesorios', 'Guitarras y bajos', 'Teclados y sintetizadores', 'Audio profesional']:
            Producto.objects.create(nombre=categoria, categoria=categoria, marca='Demo', precioVenta=1000,
                precioArriendoDia=100, stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)

    def cargar(self, **opciones):
        call_command('seed_presentacion', stdout=StringIO(), **opciones)

    def test_carga_sin_duplicados_y_respeta_stock(self):
        self.cargar()
        self.cargar()
        self.assertEqual(Pedido.objects.filter(estado='Pagado').count(), 3)
        self.assertEqual(Pago.objects.count(), 3)
        self.assertEqual(ReporteMantencion.objects.filter(estado='pendiente').count(), 3)
        self.assertEqual(Evento.objects.count(), 3)
        self.assertEqual(sum(p.total for p in Pedido.objects.all()), 2618)
        self.assertEqual(Producto.objects.get(categoria='Micrófonos').stockDisponibleArriendo, 1)
        self.assertEqual(Producto.objects.get(categoria='Guitarras y bajos').stockDisponibleVenta, 2)
        self.assertTrue(all(e.fecha_fin > e.fecha_inicio for e in Evento.objects.all()))

    def test_simulacion_no_guarda_ni_descuenta_stock(self):
        self.cargar(dry_run=True)
        self.assertFalse(Pedido.objects.exists())
        self.assertFalse(ReporteMantencion.objects.exists())
        self.assertFalse(Evento.objects.exists())
        self.assertEqual(Producto.objects.get(categoria='Micrófonos').stockDisponibleArriendo, 2)
