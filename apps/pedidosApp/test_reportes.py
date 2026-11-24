from datetime import datetime
from decimal import Decimal
from unittest import skipUnless
from zoneinfo import ZoneInfo
from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from apps.catalogoApp.models import Producto
from apps.usuariosApp.models import Usuario, Cliente
from .models import Pedido, DetallePedido


@skipUnless(connection.vendor == 'postgresql', 'Esta prueba verifica el procedimiento real de PostgreSQL.')
class ProcedimientoReportesTest(TestCase):
    def setUp(self):
        admin = User.objects.create_user('vendedor', is_staff=True)
        user = User.objects.create_user('cliente', email='cliente@test.cl')
        perfil = Usuario.objects.create(user=user, nombre='Cliente', correo=user.email)
        self.cliente = Cliente.objects.create(usuario=perfil)
        self.producto = Producto.objects.create(nombre='Guitarra', marca='Prueba', categoria='Guitarras',
            precioVenta=1000, precioArriendoDia=100, stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)
        self.client = APIClient()
        self.client.force_authenticate(admin)

    def pedido(self, estado, fecha, items):
        p = Pedido.objects.create(cliente=self.cliente, estado=estado)
        Pedido.objects.filter(pk=p.pk).update(fechaPedido=datetime.fromisoformat(fecha).replace(tzinfo=ZoneInfo('America/Santiago')))
        for tipo, cantidad, monto in items:
            DetallePedido.objects.create(pedido=p, producto=self.producto, tipoOperacion=tipo,
                cantidad=cantidad, precioUnitario=Decimal(monto)/cantidad, subTotal=monto)

    def test_reporte_usa_call_y_cuenta_pedidos_mixtos(self):
        self.pedido('Pagado', '2026-11-10T23:30:00', [('venta', 2, 2000), ('arriendo', 1, 300)])
        self.pedido('Devuelto', '2026-11-11T12:00:00', [('arriendo', 1, 400)])
        self.pedido('Pendiente', '2026-11-10T12:00:00', [('venta', 1, 9999)])
        with CaptureQueriesContext(connection) as queries:
            r = self.client.get('/api/reportes/?fecha_inicio=2026-11-10&fecha_fin=2026-11-10')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(any('CALL public.reporte_tienda' in q['sql'] for q in queries))
        self.assertEqual(r.data['ingresosVentas'], 2000)
        self.assertEqual(r.data['ingresosArriendos'], 300)
        self.assertEqual(r.data['pedidosVentasCount'], 1)
        self.assertEqual(r.data['pedidosArriendosCount'], 1)
        self.assertEqual(r.data['topClientes'][0]['cantidadPedidos'], 1)
        self.assertEqual(r.data['topClientes'][0]['totalGastado'], 2300)
        todos = self.client.get('/api/reportes/').data
        self.assertEqual(todos['ingresosArriendos'], 700)
        self.assertEqual(todos['topClientes'][0]['cantidadPedidos'], 2)

    def test_rangos_y_sin_resultados(self):
        for filtros in ['fecha_inicio=no-es-fecha', 'fecha_inicio=2026-11-12&fecha_fin=2026-11-10']:
            self.assertEqual(self.client.get('/api/reportes/?'+filtros).status_code, 400)
        r = self.client.get('/api/reportes/?fecha_fin=2026-01-01')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['ingresosVentas'], 0)
        self.assertEqual(r.data['topProductos'], [])
        self.assertEqual(r.data['topClientes'], [])
