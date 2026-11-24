from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.test import APIClient
from apps.usuariosApp.models import Cliente, Usuario
from apps.pedidosApp.models import DetallePedido, Pedido
from .models import Producto, ReporteMantencion


def crear_producto(nombre, categoria='Guitarras y bajos', estado=True, marca='Demo'):
    return Producto.objects.create(nombre=nombre, categoria=categoria, marca=marca, estado=estado,
        precioVenta=1000, precioArriendoDia=100, stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)


class PaginacionProductosTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        for i in range(8):
            crear_producto(f'Guitarra {i}')
        crear_producto('Piano de cola', categoria='Pianos', marca='Yamaha')
        crear_producto('Piano viejo', categoria='Pianos', estado=False)

    def test_sin_page_sigue_respondiendo_lista(self):
        r = self.client.get('/api/productos/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), 9)  

    def test_detalle_calcula_stock_resenas_y_promocion_sin_consultas_repetidas(self):
        producto = Producto.objects.get(nombre='Guitarra 0')
        with self.assertNumQueries(2):
            r = self.client.get(f'/api/productos/{producto.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['stockComprometidoVenta'], 0)
        self.assertEqual(r.data['totalResenas'], 0)

    def test_catalogo_de_a_seis(self):
        r = self.client.get('/api/productos/', {'page': 1, 'page_size': 6})
        self.assertEqual((r.data['count'], r.data['pages'], len(r.data['results'])), (9, 2, 6))
        r = self.client.get('/api/productos/', {'page': 2, 'page_size': 6})
        self.assertEqual((r.data['page'], len(r.data['results'])), (2, 3))
        r = self.client.get('/api/productos/', {'page': 99, 'page_size': 6})
        self.assertEqual(r.data['page'], 2)  

    def test_filtros_categoria_y_busqueda(self):
        r = self.client.get('/api/productos/', {'page': 1, 'categoria': 'pianos'})
        self.assertEqual([p['nombre'] for p in r.data['results']], ['Piano de cola'])
        r = self.client.get('/api/productos/', {'page': 1, 'q': 'yamaha'})
        self.assertEqual(r.data['count'], 1)

    def test_familia_de_varias_categorias(self):
        crear_producto('Teclado', categoria='Teclados y sintetizadores')
        r = self.client.get('/api/productos/', {'page': 1, 'categoria': 'Pianos,Teclados y sintetizadores'})
        self.assertEqual(sorted(p['nombre'] for p in r.data['results']), ['Piano de cola', 'Teclado'])

    def test_orden_por_precio(self):
        barato = crear_producto('Barato')
        Producto.objects.filter(pk=barato.pk).update(precioVenta=10)
        caro = crear_producto('Caro')
        Producto.objects.filter(pk=caro.pk).update(precioVenta=99999)
        r = self.client.get('/api/productos/', {'page': 1, 'page_size': 1, 'orden': 'precio_asc'})
        self.assertEqual(r.data['results'][0]['nombre'], 'Barato')
        r = self.client.get('/api/productos/', {'page': 1, 'page_size': 1, 'orden': 'precio_desc'})
        self.assertEqual(r.data['results'][0]['nombre'], 'Caro')

    def test_admin_ve_inactivos_y_filtra_por_estado(self):
        self.client.force_authenticate(User.objects.create_user('vendedor', is_staff=True))
        r = self.client.get('/api/productos/', {'admin': 'true', 'page': 1, 'estado': 'inactivos'})
        self.assertEqual([p['nombre'] for p in r.data['results']], ['Piano viejo'])

    def test_datatable_ordena_antes_de_paginar(self):
        crear_producto('Acordeón')
        params = {'page': 1, 'page_size': 1, 'ordering': 'nombre'}
        r = self.client.get('/api/productos/', params)
        self.assertEqual(r.data['results'][0]['nombre'], 'Acordeón')
        params.update(page=2)
        r = self.client.get('/api/productos/', params)
        self.assertEqual(r.data['results'][0]['nombre'], 'Guitarra 0')
        params.update(page=1, ordering='-nombre', q='guitarra')
        r = self.client.get('/api/productos/', params)
        self.assertEqual(r.data['count'], 8)
        self.assertEqual(r.data['results'][0]['nombre'], 'Guitarra 7')

    def test_datatable_ignora_columnas_no_permitidas(self):
        original = self.client.get('/api/productos/', {'page': 1}).data
        r = self.client.get('/api/productos/', {'page': 1, 'ordering': 'campo_inexistente__password'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, original)

    def test_categorias(self):
        r = self.client.get('/api/productos/categorias/')
        self.assertEqual(r.data, [{'nombre': 'Guitarras y bajos', 'cantidad': 8, 'subcategorias': []},
                                  {'nombre': 'Pianos', 'cantidad': 1, 'subcategorias': []}])

    def test_subcategorias(self):
        Producto.objects.filter(nombre__in=['Guitarra 0', 'Guitarra 1']).update(subcategoria='Bajos')
        Producto.objects.filter(nombre='Guitarra 2').update(subcategoria='Guitarras acústicas')
        r = self.client.get('/api/productos/', {'page': 1, 'categoria': 'Guitarras y bajos', 'subcategoria': 'bajos'})
        self.assertEqual(sorted(p['nombre'] for p in r.data['results']), ['Guitarra 0', 'Guitarra 1'])
        self.assertEqual(r.data['results'][0]['subcategoria'], 'Bajos')
        guitarras = self.client.get('/api/productos/categorias/').data[0]
        self.assertEqual((guitarras['cantidad'], guitarras['subcategorias']),
                         (8, [{'nombre': 'Bajos', 'cantidad': 2}, {'nombre': 'Guitarras acústicas', 'cantidad': 1}]))

    def test_migracion_asigna_subcategorias(self):
        from importlib import import_module
        from django.apps import apps as registro
        asignar = import_module('apps.catalogoApp.migrations.0006_asignar_subcategorias').asignar
        bajo = crear_producto('Bajo eléctrico Jazz Bass')
        sinte = crear_producto('Sintetizador MicroFreak', categoria='Teclados y sintetizadores')
        manual = crear_producto('Bajo con sub manual')
        Producto.objects.filter(pk=manual.pk).update(subcategoria='Otra')
        asignar(registro, None)
        valores = dict(Producto.objects.filter(pk__in=[bajo.pk, sinte.pk, manual.pk]).values_list('nombre', 'subcategoria'))
        self.assertEqual(valores['Bajo eléctrico Jazz Bass'], 'Bajos')
        self.assertEqual(valores['Sintetizador MicroFreak'], 'Sintetizadores')
        self.assertEqual(valores['Bajo con sub manual'], 'Otra')  
        self.assertEqual(Producto.objects.get(nombre='Guitarra 3').subcategoria, 'Guitarras acústicas')

    def test_stock_comprometido_se_calcula_en_el_listado(self):
        producto = Producto.objects.get(nombre='Guitarra 0')
        user = User.objects.create_user('c@test.cl')
        cliente = Cliente.objects.create(usuario=Usuario.objects.create(user=user, nombre='C', correo='c@test.cl'))
        pedido = Pedido.objects.create(cliente=cliente, estado='Pagado', total=1)
        DetallePedido.objects.create(pedido=pedido, producto=producto, cantidad=2, precioUnitario=1, subTotal=2, tipoOperacion='venta')
        r = self.client.get('/api/productos/', {'page': 1, 'q': 'Guitarra 0'})
        self.assertEqual(r.data['results'][0]['stockComprometidoVenta'], 2)
        self.assertEqual(r.data['results'][0]['stockComprometidoArriendo'], 0)


class PaginacionUsuariosYPedidosTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.super = User.objects.create_user('super', 'super@test.cl', is_staff=True, is_superuser=True)
        User.objects.create_user('vende', 'vende@test.cl', is_staff=True)
        tecnico = User.objects.create_user('tec', 'tec@test.cl')
        tecnico.groups.add(Group.objects.create(name='Tecnico'))
        self.cliente_user = User.objects.create_user('cli', 'cli@test.cl', first_name='Clara')
        self.cliente = Cliente.objects.create(usuario=Usuario.objects.create(user=self.cliente_user, nombre='Clara', correo='cli@test.cl'))

    def test_usuarios_paginados_y_filtrados_por_rol(self):
        self.client.force_authenticate(self.super)
        r = self.client.get('/api/usuarios/', {'page': 1, 'page_size': 2})
        self.assertEqual((r.data['count'], r.data['pages'], len(r.data['results'])), (4, 2, 2))
        for rol, esperado in [('Superadmin', 'super@test.cl'), ('Vendedor', 'vende@test.cl'), ('Tecnico', 'tec@test.cl'), ('Cliente', 'cli@test.cl')]:
            r = self.client.get('/api/usuarios/', {'page': 1, 'rol': rol})
            self.assertEqual([u['email'] for u in r.data['results']], [esperado], rol)
            self.assertEqual(r.data['results'][0]['rol'], rol)
        r = self.client.get('/api/usuarios/', {'page': 1, 'q': 'clara'})
        self.assertEqual(r.data['count'], 1)

    def test_mios_limita_los_pedidos_del_personal(self):
        Pedido.objects.create(cliente=self.cliente, estado='Pagado', total=1)
        self.client.force_authenticate(self.super)
        self.assertEqual(len(self.client.get('/api/pedidos/').data), 1)
        self.assertEqual(len(self.client.get('/api/pedidos/', {'mios': '1'}).data), 0)
        r = self.client.get('/api/pedidos/', {'page': 1, 'estado': 'pagado'})
        self.assertEqual(r.data['count'], 1)

    def test_orden_usuarios_y_pedidos_con_filtros(self):
        self.client.force_authenticate(self.super)
        r = self.client.get('/api/usuarios/', {'page': 1, 'page_size': 1, 'ordering': 'email'})
        self.assertEqual(r.data['results'][0]['email'], 'cli@test.cl')
        Pedido.objects.create(cliente=self.cliente, estado='Pagado', total=10)
        mayor = Pedido.objects.create(cliente=self.cliente, estado='Pagado', total=20)
        Pedido.objects.create(cliente=self.cliente, estado='Pendiente', total=100)
        r = self.client.get('/api/pedidos/', {'page': 1, 'page_size': 1, 'ordering': '-total', 'estado': 'pagado'})
        self.assertEqual(r.data['count'], 2)
        self.assertEqual(r.data['results'][0]['id'], mayor.pk)

    def test_mantenciones_ordenadas_solo_pendientes(self):
        self.client.force_authenticate(self.super)
        piano = crear_producto('Piano')
        bajo = crear_producto('Bajo')
        ReporteMantencion.objects.create(producto=piano, fallaReportada='Tecla dañada')
        esperado = ReporteMantencion.objects.create(producto=bajo, fallaReportada='Cuerda dañada')
        ReporteMantencion.objects.create(producto=bajo, fallaReportada='Terminada', estado='reparado')
        r = self.client.get('/api/mantenciones/', {'page': 1, 'page_size': 1, 'ordering': 'producto_nombre'})
        self.assertEqual(r.data['count'], 2)
        self.assertEqual(r.data['results'][0]['id'], esperado.pk)
