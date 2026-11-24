from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from apps.catalogoApp.models import Producto, ReporteMantencion
from apps.usuariosApp.models import Usuario, Cliente
from .models import Pedido, DetallePedido


class DashboardReportesTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('vendedor', is_staff=True)
        user = User.objects.create_user('cliente', email='cliente@test.cl')
        self.cliente_user = user
        self.cliente = Cliente.objects.create(usuario=Usuario.objects.create(user=user, nombre='Cliente', correo=user.email))
        self.guitarra = Producto.objects.create(nombre='Guitarra', marca='P', categoria='Guitarras y bajos',
            precioVenta=1000, precioArriendoDia=100, stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)
        self.piano = Producto.objects.create(nombre='Piano', marca='P', categoria='Pianos',
            precioVenta=5000, precioArriendoDia=500, stockTotal=1, stockDisponibleVenta=1, stockDisponibleArriendo=0)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def pedido(self, estado, fecha, producto, tipo, monto):
        p = Pedido.objects.create(cliente=self.cliente, estado=estado)
        Pedido.objects.filter(pk=p.pk).update(fechaPedido=datetime.fromisoformat(fecha).replace(tzinfo=ZoneInfo('America/Santiago')))
        DetallePedido.objects.create(pedido=p, producto=producto, tipoOperacion=tipo, cantidad=1,
            precioUnitario=Decimal(monto), subTotal=monto)

    def test_solo_personal_ve_reportes(self):
        self.client.force_authenticate(self.cliente_user)
        self.assertEqual(self.client.get('/api/reportes/').status_code, 403)

    def test_serie_diaria_con_dias_vacios_y_categorias(self):
        self.pedido('Pagado', '2026-11-10T12:00:00', self.guitarra, 'venta', 1000)
        self.pedido('Completado', '2026-11-12T12:00:00', self.piano, 'arriendo', 500)
        self.pedido('Pendiente', '2026-11-11T12:00:00', self.piano, 'venta', 9999)  
        r = self.client.get('/api/reportes/')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['agrupacionSerie'], 'dia')
        self.assertEqual(r.data['serie'], [
            {'periodo': '2026-11-10', 'ventas': 1000.0, 'arriendos': 0.0},
            {'periodo': '2026-11-11', 'ventas': 0.0, 'arriendos': 0.0},
            {'periodo': '2026-11-12', 'ventas': 0.0, 'arriendos': 500.0},
        ])
        self.assertEqual(r.data['ingresosPorCategoria'], [
            {'categoria': 'Guitarras y bajos', 'total': 1000.0}, {'categoria': 'Pianos', 'total': 500.0}])

    def test_rango_largo_se_agrupa_por_mes(self):
        self.pedido('Pagado', '2026-01-05T12:00:00', self.guitarra, 'venta', 1000)
        self.pedido('Pagado', '2026-03-20T12:00:00', self.guitarra, 'arriendo', 300)
        r = self.client.get('/api/reportes/')
        self.assertEqual(r.data['agrupacionSerie'], 'mes')
        self.assertEqual([s['periodo'] for s in r.data['serie']], ['2026-01', '2026-03'])
        r = self.client.get('/api/reportes/', {'fecha_inicio': '2026-03-01', 'fecha_fin': '2026-03-31'})
        self.assertEqual(r.data['agrupacionSerie'], 'dia')
        self.assertEqual(len(r.data['serie']), 31)
        self.assertEqual(sum(s['arriendos'] for s in r.data['serie']), 300)

    def test_alertas_de_stock_y_taller(self):
        ReporteMantencion.objects.create(producto=self.guitarra, fallaReportada='Traste suelto', estado='pendiente')
        ReporteMantencion.objects.create(producto=self.guitarra, fallaReportada='Ya resuelta', estado='reparado')
        alertas = self.client.get('/api/reportes/').data['alertas']
        self.assertEqual(alertas['stockCriticoTotal'], 1)
        self.assertEqual(alertas['stockCritico'][0]['nombre'], 'Piano')
        self.assertEqual(alertas['enMantencionTotal'], 1)
        self.assertEqual(alertas['enMantencion'][0]['falla'], 'Traste suelto')

    def test_alertas_cuentan_todos_los_registros_aunque_muestren_ocho(self):
        from .views import datos_dashboard
        for i in range(11):
            ReporteMantencion.objects.create(producto=self.guitarra, fallaReportada=f'Falla {i}')
        with self.assertNumQueries(4):
            alertas = datos_dashboard(DetallePedido.objects.all(), None, None)['alertas']
        self.assertEqual(alertas['enMantencionTotal'], 11)
        self.assertEqual(len(alertas['enMantencion']), 8)
