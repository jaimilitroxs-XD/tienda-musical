import json

from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.pedidosApp.models import DetallePedido, Pedido
from apps.usuariosApp.models import Cliente, Usuario
from .models import Producto, Resena


class ResenasTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.producto = Producto.objects.create(nombre='Guitarra', categoria='Guitarras y bajos', marca='Demo',
            precioVenta=1000, precioArriendoDia=100, stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)
        self.url = f'/api/productos/{self.producto.id}/resenas/'
        self.ana = self.cliente('ana@test.cl', 'Ana María')
        self.beto = self.cliente('beto@test.cl', 'Beto')
        self.staff = User.objects.create_user('vendedor', 'v@test.cl', is_staff=True)
        self.tecnico = User.objects.create_user('tec', 'tec@test.cl')
        self.tecnico.groups.add(Group.objects.create(name='Tecnico'))

    def cliente(self, email, nombre):
        user = User.objects.create_user(email, email, 'Clave123!', first_name=nombre)
        Cliente.objects.create(usuario=Usuario.objects.create(user=user, nombre=nombre, correo=email))
        return user

    def publicar(self, user, **datos):
        self.client.force_authenticate(user)
        return self.client.post(self.url, {'calificacion': 5, 'comentario': 'Excelente', **datos}, format='json')

    def test_quien_puede_publicar(self):
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertIn(self.client.post(self.url, {'calificacion': 5}, format='json').status_code, (401, 403))
        self.assertEqual(self.publicar(self.staff).status_code, 403)
        self.assertEqual(self.publicar(self.tecnico).status_code, 403)
        self.assertEqual(self.publicar(self.ana).status_code, 201)
        r = self.publicar(self.ana)  
        self.assertEqual(r.status_code, 400)
        for mala in (0, 6, 'x'):
            self.assertEqual(self.publicar(self.beto, calificacion=mala).status_code, 400, mala)

    def test_resumen_privacidad_y_compra_verificada(self):
        self.publicar(self.ana, calificacion=5)
        self.publicar(self.beto, calificacion=2)
        
        for user, estado in ((self.ana, 'Pagado'), (self.beto, 'Pendiente')):
            pedido = Pedido.objects.create(cliente=user.perfil_usuario.cliente_rel, estado=estado, total=1000)
            DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precioUnitario=1000, subTotal=1000, tipoOperacion='venta')
        self.client.force_authenticate(None)
        r = self.client.get(self.url)
        self.assertEqual(r.data['resumen'], {'promedio': 3.5, 'total': 2, 'distribucion': {'5': 1, '4': 0, '3': 0, '2': 1, '1': 0}})
        por_autor = {x['autor']: x for x in r.data['results']}
        self.assertEqual(set(por_autor), {'Ana', 'Beto'})  
        self.assertTrue(por_autor['Ana']['compra_verificada'])
        self.assertFalse(por_autor['Beto']['compra_verificada'])
        self.assertNotIn('@test.cl', json.dumps(r.data))  
        r = self.client.get(self.url, {'orden': 'peores'})
        self.assertEqual(r.data['results'][0]['calificacion'], 2)

    def test_editar_borrar_y_moderar(self):
        resena_id = self.publicar(self.ana, calificacion=4).data['id']
        detalle = f'/api/resenas/{resena_id}/'
        self.client.force_authenticate(self.beto)
        self.assertEqual(self.client.patch(detalle, {'calificacion': 1}, format='json').status_code, 403)
        self.client.force_authenticate(self.ana)
        r = self.client.patch(detalle, {'calificacion': 3, 'titulo': 'Cambié de opinión'}, format='json')
        self.assertEqual((r.status_code, r.data['calificacion']), (200, 3))

        
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch(detalle, {'comentario': 'otro'}, format='json').status_code, 400)
        r = self.client.patch(detalle, {'visible': False}, format='json')
        self.assertEqual((r.status_code, r.data['visible']), (200, False))
        self.assertEqual(self.client.get(self.url).data['count'], 1)  
        self.client.force_authenticate(None)
        r = self.client.get(self.url)
        self.assertEqual((r.data['count'], r.data['resumen']['total']), (0, 0))

        self.client.force_authenticate(self.ana)
        mia = self.client.get(self.url).data
        self.assertEqual(mia['mi_resena']['id'], resena_id)
        self.assertFalse(mia['puede_resenar'] and mia['mi_resena'] is None)
        self.assertEqual(self.client.delete(detalle).status_code, 204)
        self.assertFalse(Resena.objects.exists())

    def test_estrellas_en_el_listado_sin_alterar_stock_comprometido(self):
        self.publicar(self.ana, calificacion=5)
        self.publicar(self.beto, calificacion=4)
        pedido = Pedido.objects.create(cliente=self.ana.perfil_usuario.cliente_rel, estado='Pagado', total=1)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=2, precioUnitario=1, subTotal=2, tipoOperacion='venta')
        self.client.force_authenticate(None)
        p = self.client.get('/api/productos/', {'page': 1}).data['results'][0]
        self.assertEqual((p['calificacionPromedio'], p['totalResenas']), (4.5, 2))
        self.assertEqual(p['stockComprometidoVenta'], 2)  
        detalle = self.client.get(f'/api/productos/{self.producto.id}/').data
        self.assertEqual((detalle['calificacionPromedio'], detalle['totalResenas']), (4.5, 2))
