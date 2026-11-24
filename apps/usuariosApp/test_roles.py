from django.contrib.auth.models import User, Group
from django.test import TestCase
from rest_framework.test import APIClient
from apps.usuariosApp.models import Usuario, Cliente
from apps.catalogoApp.models import Producto, ReporteMantencion


class RolesTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser('super@test.cl', 'super@test.cl', 'Clave123!', first_name='Super')
        self.vendedor = User.objects.create_user('vendedor@test.cl', 'vendedor@test.cl', 'Clave123!', first_name='Vendedor', is_staff=True)
        self.tecnico = User.objects.create_user('tecnico@test.cl', 'tecnico@test.cl', 'Clave123!', first_name='Tecnico')
        self.tecnico.groups.add(Group.objects.create(name='Tecnico'))
        self.cliente = User.objects.create_user('cliente@test.cl', 'cliente@test.cl', 'Clave123!', first_name='Cliente')
        for user in [self.superadmin, self.vendedor, self.tecnico, self.cliente]:
            perfil = Usuario.objects.create(user=user, nombre=user.first_name, correo=user.email)
            if user == self.cliente:
                Cliente.objects.create(usuario=perfil)

    def test_solo_superadmin_gestiona_usuarios(self):
        for user in [self.vendedor, self.tecnico, self.cliente]:
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get('/api/usuarios/').status_code, 403)
            self.assertEqual(self.client.post('/api/usuarios/crear/', {}, format='json').status_code, 403)
            self.assertEqual(self.client.patch(f'/api/usuarios/{self.cliente.pk}/', {'rol': 'Superadmin'}, format='json').status_code, 403)
            self.assertEqual(self.client.delete(f'/api/usuarios/{self.cliente.pk}/').status_code, 403)
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.get('/api/usuarios/').status_code, 200)

    def test_crear_editar_y_promover(self):
        self.client.force_authenticate(self.superadmin)
        for rol in ['Superadmin', 'Vendedor', 'Tecnico', 'Cliente']:
            r = self.client.post('/api/usuarios/crear/', {'nombre': rol, 'email': rol.lower()+'@nuevo.cl', 'pass': 'Prueba2026!', 'rol': rol}, format='json')
            self.assertEqual(r.status_code, 201, r.data)
            self.assertEqual(r.data['usuario']['rol'], rol)
        r = self.client.patch(f'/api/usuarios/{self.cliente.pk}/', {'nombre': 'Cliente editado', 'email': 'editado@test.cl', 'telefono': '912345678', 'rol': 'Vendedor'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.cliente.refresh_from_db()
        self.assertTrue(self.cliente.is_staff)
        self.assertFalse(self.cliente.is_superuser)
        self.assertEqual(self.cliente.email, 'editado@test.cl')
        self.assertEqual(self.client.delete(f'/api/usuarios/{self.cliente.pk}/').status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.cliente.pk).exists())

    def test_proteccion_cuenta_propia_y_registro(self):
        self.client.force_authenticate(self.superadmin)
        for payload in [{'activo': False}, {'rol': 'Cliente'}]:
            self.assertEqual(self.client.patch(f'/api/usuarios/{self.superadmin.pk}/', payload, format='json').status_code, 400)
        self.assertEqual(self.client.delete('/api/usuarios/me/').status_code, 400)
        self.client.force_authenticate(None)
        r = self.client.post('/api/usuarios/registro/', {'nombre': 'Nuevo', 'email': 'publico@test.cl', 'pass': 'Prueba2026!', 'rol': 'Superadmin', 'is_superuser': True}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertFalse(User.objects.get(email='publico@test.cl').is_superuser)

    def test_superadmin_repara_y_vendedor_no(self):
        producto = Producto.objects.create(nombre='Guitarra', marca='Prueba', categoria='Guitarras', precioVenta=100, precioArriendoDia=10, stockTotal=2, stockDisponibleVenta=1)
        reporte = ReporteMantencion.objects.create(producto=producto, fallaReportada='Cuerda rota')
        url = f'/api/mantenciones/{reporte.pk}/marcar-reparado/'
        self.client.force_authenticate(self.vendedor)
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Reparada'}, format='json').status_code, 403)
        self.client.force_authenticate(self.superadmin)
        self.assertEqual(self.client.post(url, {'descripcionReparacion': 'Reparada'}, format='json').status_code, 200)
        self.assertEqual(self.client.get('/api/usuarios/me/').data['rol'], 'Superadmin')
