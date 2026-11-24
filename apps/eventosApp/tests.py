from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from tempfile import TemporaryDirectory

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.catalogoApp.models import Producto
from apps.pedidosApp.models import Pedido
from apps.usuariosApp.models import Cliente, Usuario
from .models import Evento
from .precios import prorratear_pack


def producto(nombre, venta=100000, arriendo=10000, stock_arriendo=2):
    return Producto.objects.create(nombre=nombre, categoria='Guitarras y bajos', marca='Demo',
        precioVenta=venta, precioArriendoDia=arriendo, stockTotal=5, stockDisponibleVenta=3,
        stockDisponibleArriendo=stock_arriendo)


class EventosBase(TestCase):
    def setUp(self):
        self.ahora = timezone.now()
        self.client = APIClient()
        self.staff = User.objects.create_user('vendedor', is_staff=True)
        self.cliente_user = User.objects.create_user('cli@test.cl', 'cli@test.cl', 'Clave123!')
        Cliente.objects.create(usuario=Usuario.objects.create(user=self.cliente_user, nombre='Cli', correo='cli@test.cl'))
        self.guitarra = producto('Guitarra', venta=100000, arriendo=10000)
        self.bajo = producto('Bajo', venta=200000, arriendo=20000)
        self.ampli = producto('Ampli', venta=50000, arriendo=5000)

    def evento(self, tipo, productos=(), inicio=-1, fin=5, **extra):
        e = Evento.objects.create(titulo=f'{tipo} demo', tipo_evento=tipo,
            fecha_inicio=self.ahora + timedelta(days=inicio), fecha_fin=self.ahora + timedelta(days=fin), **extra)
        e.productos_asociados.set(productos)
        return e

    def datos(self, tipo, **extra):
        base = {'titulo': 'Nuevo', 'tipo_evento': tipo,
                'fecha_inicio': timezone.localtime(self.ahora).replace(hour=0, minute=0, second=0, microsecond=0).isoformat(),
                'fecha_fin': (self.ahora + timedelta(days=3)).isoformat()}
        return {**base, **extra}


class GestionEventosTest(EventosBase):
    def test_finalizar_conserva_fechas_retira_promocion_y_libera_cupo(self):
        evento = self.evento('descuento', [self.guitarra], porcentaje_descuento=20)
        for i in range(5):
            self.evento('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        inicio, fin = evento.fecha_inicio, evento.fecha_fin
        self.client.force_authenticate(self.staff)
        url = f'/api/eventos/{evento.pk}/finalizar/'
        r = self.client.post(url)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['estado'], 'finalizado')
        evento.refresh_from_db()
        self.assertEqual((evento.fecha_inicio, evento.fecha_fin), (inicio, fin))
        self.assertFalse(evento.activo)
        self.assertEqual(Evento.objects.visibles().count(), 5)
        self.assertFalse(Evento.objects.vigentes().filter(pk=evento.pk).exists())
        resumen = self.client.get('/api/eventos/resumen/').data
        self.assertEqual((resumen['finalizado'], resumen['desactivado']), (1, 0))
        listado = self.client.get('/api/eventos/', {'admin': 'true', 'estado': 'finalizado'}).data
        self.assertEqual([e['id'] for e in listado], [evento.pk])
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.client.patch(f'/api/eventos/{evento.pk}/', {'activo': True}, format='json').status_code, 400)
        nuevo = self.client.post('/api/eventos/', self.datos('en_vivo', artista_invitado='Otro DJ', lugar_o_link='Sala'), format='json')
        self.assertEqual(nuevo.status_code, 201, nuevo.data)
        self.client.force_authenticate(user=None)
        self.assertNotIn(evento.pk, [e['id'] for e in self.client.get('/api/eventos/').data])
        self.assertIsNone(self.client.get(f'/api/productos/{self.guitarra.pk}/').data['precioVentaPromo'])

    def test_finalizar_exige_personal_comercial(self):
        evento = self.evento('en_vivo', inicio=3, artista_invitado='DJ', lugar_o_link='Sala')
        url = f'/api/eventos/{evento.pk}/finalizar/'
        self.assertIn(self.client.post(url).status_code, (401, 403))
        self.client.force_authenticate(self.cliente_user)
        self.assertEqual(self.client.post(url).status_code, 403)
        from django.contrib.auth.models import Group
        tecnico = User.objects.create_user('tecnico')
        tecnico.groups.add(Group.objects.create(name='Tecnico'))
        self.client.force_authenticate(tecnico)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(url).status_code, 200)

    def test_limite_seis_incluye_programados_pero_no_finalizados(self):
        self.client.force_authenticate(self.staff)
        for i in range(6):
            self.evento('en_vivo', inicio=1 if i % 2 else -1, artista_invitado='DJ', lugar_o_link='Sala')
        self.evento('en_vivo', inicio=-3, fin=-1, artista_invitado='DJ', lugar_o_link='Sala')
        datos = self.datos('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        r = self.client.post('/api/eventos/', datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('activo', r.data)
        self.assertEqual(Evento.objects.visibles().count(), 6)
        datos['activo'] = False
        r = self.client.post('/api/eventos/', datos, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        url = f"/api/eventos/{r.data['id']}/"
        self.assertEqual(self.client.patch(url, {'activo': True}, format='json').status_code, 400)
        publicado = Evento.objects.visibles().first()
        self.assertEqual(self.client.patch(f'/api/eventos/{publicado.pk}/', {'titulo': 'Título editado'}, format='json').status_code, 200)
        self.client.patch(f'/api/eventos/{publicado.pk}/', {'activo': False}, format='json')
        self.assertEqual(self.client.patch(url, {'activo': True}, format='json').status_code, 200)
        self.assertEqual(Evento.objects.visibles().count(), 6)

    def test_publica_el_sexto_y_no_reabre_un_finalizado_sin_cupo(self):
        self.client.force_authenticate(self.staff)
        for i in range(5):
            self.evento('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        r = self.client.post('/api/eventos/', self.datos('en_vivo', artista_invitado='DJ', lugar_o_link='Sala'), format='json')
        self.assertEqual(r.status_code, 201, r.data)
        finalizado = self.evento('en_vivo', inicio=-3, fin=-1, artista_invitado='DJ', lugar_o_link='Sala')
        r = self.client.patch(f'/api/eventos/{finalizado.pk}/', {'fecha_fin': (self.ahora + timedelta(days=1)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('activo', r.data)

    def test_no_crea_con_inicio_pasado_y_si_admite_hoy(self):
        self.client.force_authenticate(self.staff)
        datos = self.datos('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        datos['fecha_inicio'] = (self.ahora - timedelta(days=1)).isoformat()
        r = self.client.post('/api/eventos/', datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_inicio', r.data)
        self.assertFalse(Evento.objects.exists())
        datos['fecha_inicio'] = self.datos('en_vivo')['fecha_inicio']
        self.assertEqual(self.client.post('/api/eventos/', datos, format='json').status_code, 201)

    def test_fin_igual_al_inicio_es_invalido(self):
        self.client.force_authenticate(self.staff)
        datos = self.datos('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        datos['fecha_fin'] = datos['fecha_inicio']
        r = self.client.post('/api/eventos/', datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_fin', r.data)

    def test_precios_y_descuentos_fuera_de_rango(self):
        self.client.force_authenticate(self.staff)
        for precio in ('-1', '0', 'NaN', 'Infinity'):
            r = self.client.post('/api/eventos/', self.datos('pack_arriendo', precio_pack_arriendo=precio,
                productos_asociados=[self.guitarra.pk, self.bajo.pk]), format='json')
            self.assertEqual(r.status_code, 400, precio)
            self.assertIn('precio_pack_arriendo', r.data)
        for porcentaje in ('-1', '91'):
            r = self.client.post('/api/eventos/', self.datos('descuento', porcentaje_descuento=porcentaje,
                productos_asociados=[self.guitarra.pk]), format='json')
            self.assertEqual(r.status_code, 400, porcentaje)
            self.assertIn('porcentaje_descuento', r.data)

    def test_preventa_no_disponible_antes_del_inicio(self):
        self.client.force_authenticate(self.staff)
        datos = self.datos('preventa', fecha_inicio=(self.ahora + timedelta(days=3)).isoformat(),
            fecha_fin=(self.ahora + timedelta(days=5)).isoformat(),
            fecha_disponibilidad=str(timezone.localdate()), productos_asociados=[self.guitarra.pk])
        r = self.client.post('/api/eventos/', datos, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_disponibilidad', r.data)

    def test_editar_evento_iniciado_conserva_fechas_pero_no_admite_retrocederlas(self):
        self.client.force_authenticate(self.staff)
        evento = self.evento('en_vivo', artista_invitado='DJ', lugar_o_link='Sala')
        url = f'/api/eventos/{evento.pk}/'
        r = self.client.patch(url, {'titulo': 'Título nuevo', 'fecha_inicio': evento.fecha_inicio.isoformat(),
            'fecha_fin': evento.fecha_fin.isoformat()}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.patch(url, {'fecha_inicio': (self.ahora - timedelta(days=2)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_inicio', r.data)

    def test_rechaza_titulo_vacio_y_productos_repetidos(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post('/api/eventos/', self.datos('en_vivo', titulo='  ', artista_invitado='DJ', lugar_o_link='Sala'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('titulo', r.data)
        r = self.client.post('/api/eventos/', self.datos('pack_arriendo', precio_pack_arriendo='100',
            productos_asociados=[self.guitarra.pk, self.guitarra.pk]), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('productos_asociados', r.data)

    def test_permisos(self):
        self.assertEqual(self.client.get('/api/eventos/').status_code, 200)  
        self.assertIn(self.client.post('/api/eventos/', self.datos('en_vivo'), format='json').status_code, (401, 403))
        self.client.force_authenticate(self.cliente_user)
        self.assertEqual(self.client.post('/api/eventos/', self.datos('en_vivo'), format='json').status_code, 403)
        self.assertEqual(self.client.get('/api/eventos/resumen/').status_code, 403)

    def test_validaciones_por_tipo(self):
        self.client.force_authenticate(self.staff)
        casos = [
            (self.datos('descuento', productos_asociados=[self.guitarra.id]), 'porcentaje_descuento'),
            (self.datos('descuento', porcentaje_descuento='10'), 'productos_asociados'),
            (self.datos('pack_arriendo', precio_pack_arriendo='9000', productos_asociados=[self.guitarra.id]), 'productos_asociados'),
            (self.datos('pack_arriendo', precio_pack_arriendo='30000', productos_asociados=[self.guitarra.id, self.bajo.id]), 'precio_pack_arriendo'),
            (self.datos('en_vivo', artista_invitado='DJ X'), 'lugar_o_link'),
            (self.datos('preventa', productos_asociados=[self.guitarra.id]), 'fecha_disponibilidad'),
            (self.datos('en_vivo', artista_invitado='A', lugar_o_link='B', fecha_fin=(self.ahora - timedelta(days=2)).isoformat()), 'fecha_fin'),
        ]
        for datos, campo in casos:
            r = self.client.post('/api/eventos/', datos, format='json')
            self.assertEqual(r.status_code, 400, datos)
            self.assertIn(campo, r.data, datos)

    def test_crear_limpia_campos_de_otro_tipo_y_alternar_activo(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post('/api/eventos/', self.datos('en_vivo', artista_invitado='DJ Nova', lugar_o_link='Sala 1',
            porcentaje_descuento='30', productos_asociados=[self.ampli.id]), format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Decimal(r.data['porcentaje_descuento']), 0)  
        self.assertEqual(r.data['estado'], 'activo')
        self.assertEqual([p['nombre'] for p in r.data['productos']], ['Ampli'])
        r = self.client.patch(f"/api/eventos/{r.data['id']}/", {'activo': False}, format='json')
        self.assertEqual((r.status_code, r.data['estado']), (200, 'desactivado'))

    def test_crear_con_imagen_multipart(self):
        self.client.force_authenticate(self.staff)
        archivo = BytesIO()
        Image.new('RGB', (4, 4)).save(archivo, 'PNG')
        with TemporaryDirectory() as carpeta, override_settings(MEDIA_ROOT=carpeta):
            datos = self.datos('descuento', porcentaje_descuento='15', productos_asociados=[self.guitarra.id, self.bajo.id],
                               imagen_banner=SimpleUploadedFile('banner.png', archivo.getvalue(), 'image/png'))
            r = self.client.post('/api/eventos/', datos, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn('/media/eventos/banner', r.data['imagen_banner'])
        self.assertEqual(sorted(r.data['productos_asociados']), sorted([self.guitarra.id, self.bajo.id]))

    def test_listado_publico_y_panel(self):
        self.evento('en_vivo', artista_invitado='A', lugar_o_link='B')                 
        self.evento('en_vivo', inicio=3, fin=4, artista_invitado='A', lugar_o_link='B')  
        self.evento('en_vivo', inicio=-5, fin=-1, artista_invitado='A', lugar_o_link='B')  
        self.evento('en_vivo', activo=False, artista_invitado='A', lugar_o_link='B')    
        self.assertEqual([e['estado'] for e in self.client.get('/api/eventos/').data], ['activo', 'programado'])
        self.client.force_authenticate(self.staff)
        r = self.client.get('/api/eventos/', {'admin': 'true', 'page': 1})
        self.assertEqual(r.data['count'], 4)
        r = self.client.get('/api/eventos/', {'admin': 'true', 'page': 1, 'estado': 'finalizado'})
        self.assertEqual([e['estado'] for e in r.data['results']], ['finalizado'])
        self.assertEqual(self.client.get('/api/eventos/resumen/').data,
                         {'total': 4, 'activo': 1, 'programado': 1, 'finalizado': 1, 'desactivado': 1})


class PreciosPromocionalesTest(EventosBase):
    def comprar(self, items):
        self.client.force_authenticate(self.cliente_user)
        return self.client.post('/api/pedidos/', {
            'cliente': dict(nombre='Ana', apellidos='Perez', rut='12.345.678-5', telefono='912345678', correo='cli@test.cl'),
            'aceptaTerminos': True, 'items': items}, format='json')

    def test_catalogo_muestra_el_mayor_descuento_vigente(self):
        self.evento('descuento', [self.guitarra], porcentaje_descuento=10)
        self.evento('outlet', [self.guitarra], porcentaje_descuento=25)
        self.evento('descuento', [self.bajo], inicio=2, fin=4, porcentaje_descuento=50)  
        datos = {p['nombre']: p for p in self.client.get('/api/productos/').data}
        self.assertEqual(Decimal(datos['Guitarra']['precioVentaPromo']), 75000)
        self.assertEqual(datos['Guitarra']['promocion']['tipo'], 'outlet')
        self.assertIsNone(datos['Bajo']['precioVentaPromo'])

    def test_el_pedido_cobra_el_precio_promocional(self):
        self.evento('descuento', [self.guitarra], porcentaje_descuento=20)
        r = self.comprar([{'id': self.guitarra.id, 'cantidad': 1, 'tipoOperacion': 'venta'}])
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Decimal(r.data['subtotal']), 80000)
        self.assertEqual(Pedido.objects.get().detalles.get().precioUnitario, 80000)

    def items_pack(self, pack, productos, desde=1, dias=3):
        inicio = timezone.localdate() + timedelta(days=desde)
        return [{'id': p.id, 'cantidad': 1, 'tipoOperacion': 'arriendo', 'packId': pack.id,
                 'fechaInicio': str(inicio), 'fechaTermino': str(inicio + timedelta(days=dias))} for p in productos]

    def test_pack_completo_se_cobra_prorrateado(self):
        pack = self.evento('pack_arriendo', [self.guitarra, self.bajo, self.ampli], precio_pack_arriendo=24000)
        r = self.comprar(self.items_pack(pack, [self.guitarra, self.bajo, self.ampli]))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Decimal(r.data['subtotal']), 24000 * 3)  
        precios = dict(Pedido.objects.get().detalles.values_list('producto_id', 'precioUnitario'))
        self.assertEqual(precios, prorratear_pack(24000, [self.guitarra, self.bajo, self.ampli]))

    def test_pack_incompleto_o_con_fechas_distintas_se_cobra_normal(self):
        pack = self.evento('pack_arriendo', [self.guitarra, self.bajo], precio_pack_arriendo=24000)
        r = self.comprar(self.items_pack(pack, [self.guitarra]))
        self.assertEqual(Decimal(r.data['subtotal']), 10000 * 3)
        Pedido.objects.all().delete()
        Producto.objects.update(stockDisponibleArriendo=2)
        items = self.items_pack(pack, [self.guitarra, self.bajo])
        items[1]['fechaTermino'] = items[0]['fechaInicio']
        r = self.comprar(items)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Decimal(r.data['subtotal']), 10000 * 3 + 20000 * 1)

    def test_prorrateo_suma_exacta(self):
        reparto = prorratear_pack(Decimal('33333'), [self.guitarra, self.bajo, self.ampli])
        self.assertEqual(sum(reparto.values()), 33333)
        self.assertTrue(all(v == v.to_integral_value() for v in reparto.values()))
