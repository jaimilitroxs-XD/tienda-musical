from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.usuariosApp.models import Usuario, Cliente
from apps.catalogoApp.models import Producto
from .models import Pedido


class FlujosTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('cliente@test.cl', 'cliente@test.cl', 'Clave123!')
        perfil = Usuario.objects.create(user=self.user, nombre='Cliente', correo=self.user.email)
        Cliente.objects.create(usuario=perfil)
        self.admin = User.objects.create_user('admin', password='Clave123!', is_staff=True)
        self.producto = Producto.objects.create(nombre='Guitarra', categoria='Cuerdas', marca='Yamaha',
            precioVenta=100000, precioArriendoDia=10000, stockTotal=3, stockDisponibleVenta=2, stockDisponibleArriendo=1)
        self.payload = dict(cliente=dict(nombre='Ana', apellidos='Perez', rut='12.345.678-5',
            telefono='912345678', correo='cliente@test.cl'), aceptaTerminos=True,
            items=[dict(id=self.producto.id, cantidad=1, tipoOperacion='arriendo',
                fechaInicio=str(timezone.localdate()), fechaTermino=str(timezone.localdate()+timedelta(days=3)))])

    def test_arriendo_devolucion_y_precio_servidor(self):
        self.client.force_authenticate(self.user)
        self.payload['total'] = 1
        res = self.client.post('/api/pedidos/', self.payload, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(float(res.data['total']), 35700)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleArriendo, 0)
        self.assertEqual(self.client.post('/api/pedidos/', self.payload, format='json').status_code, 400)
        self.assertEqual(Pedido.objects.count(), 1)
        self.client.force_authenticate(self.admin)
        url = f"/api/pedidos/{res.data['id']}/"
        for estado in ['Pagado', 'Completado', 'Devuelto']:
            self.assertEqual(self.client.patch(url, {'estado': estado}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(url, {'estado': 'Devuelto'}, format='json').status_code, 400)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleArriendo, 1)
        reporte = self.client.get('/api/reportes/')
        self.assertEqual(reporte.status_code, 200)
        self.assertEqual(float(reporte.data['ingresosArriendos']), 30000)
        self.assertEqual(reporte.data['topProductos'][0]['cantidad'], 1)

    def test_taller_repara_una_sola_vez(self):
        from django.contrib.auth.models import Group
        tecnico = User.objects.create_user('tecnico', password='Clave123!')
        tecnico.groups.add(Group.objects.create(name='Tecnico'))
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/productos/reportar-falla/', {'producto_id': self.producto.pk, 'descripcion': 'Cuerda rota'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        url = f"/api/mantenciones/{res.data['reporte']['id']}/marcar-reparado/"
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleVenta, 1)
        self.assertEqual(self.producto.stockTotal, 3)
        catalogo = self.client.get('/api/productos/').data
        self.assertEqual(next(p for p in catalogo if p['id'] == self.producto.pk)['stockDisponibleVenta'], 1)
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Cambio de cuerda'}, format='json').status_code, 403)
        self.client.force_authenticate(tecnico)
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Cambio de cuerda'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Otra'}, format='json').status_code, 400)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockTotal, 3)
        self.assertEqual(self.producto.stockDisponibleVenta, 2)

    def test_unidad_arriendo_en_taller_no_se_puede_arrendar(self):
        from django.contrib.auth.models import Group
        tecnico = User.objects.create_user('tecnico', password='Clave123!')
        tecnico.groups.add(Group.objects.create(name='Tecnico'))
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/productos/reportar-falla/', {
            'producto_id': self.producto.pk, 'descripcion': 'Falla de audio', 'tipoStock': 'arriendo'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleArriendo, 0)
        self.assertEqual(self.producto.stockDisponibleVenta, 2)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/pedidos/', self.payload, format='json').status_code, 400)
        self.client.force_authenticate(tecnico)
        url = f"/api/mantenciones/{res.data['reporte']['id']}/marcar-reparado/"
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Reparado', 'tipoStock': 'venta'}, format='json').status_code, 200)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleArriendo, 1)
        self.assertEqual(self.producto.stockDisponibleVenta, 2)
        self.assertEqual(self.producto.stockTotal, 3)

    def test_permisos_y_perfil_no_suplantable(self):
        self.assertEqual(self.client.post('/api/productos/', {}, format='json').status_code, 403)
        self.assertEqual(self.client.post('/api/usuarios/crear/', {}, format='json').status_code, 403)
        self.client.force_authenticate(self.user)
        res = self.client.get(f'/api/usuarios/me/?user_id={self.admin.id}')
        self.assertEqual(res.data['id'], self.user.id)
        self.assertEqual(self.client.get('/api/reportes/').status_code, 403)

    def test_rollback_stock_y_bloqueo_desactivacion(self):
        self.client.force_authenticate(self.user)
        self.payload['items'] *= 2
        self.assertEqual(self.client.post('/api/pedidos/', self.payload, format='json').status_code, 400)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stockDisponibleArriendo, 1)
        self.payload['items'] = self.payload['items'][:1]
        self.client.post('/api/pedidos/', self.payload, format='json')
        self.assertEqual(self.client.delete('/api/usuarios/me/').status_code, 400)

    def test_csrf_login(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/usuarios/login/', {}, format='json').status_code, 403)
        token = client.get('/api/csrf/').data['csrfToken']
        res = client.post('/api/usuarios/login/', {'email': self.user.email, 'pass': 'Clave123!'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(res.status_code, 200)
