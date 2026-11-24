from io import BytesIO
from tempfile import TemporaryDirectory
from PIL import Image
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import Producto


class FotosProductoTest(TestCase):
    def setUp(self):
        self.temporal = TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.ajustes = override_settings(MEDIA_ROOT=self.temporal.name)
        self.ajustes.enable()
        self.addCleanup(self.ajustes.disable)
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user('vendedor', is_staff=True))
        self.producto = Producto.objects.create(nombre='Guitarra', marca='Prueba', categoria='Guitarras',
            foto='productos/existente.webp', precioVenta=1000, precioArriendoDia=100,
            stockTotal=5, stockDisponibleVenta=3, stockDisponibleArriendo=2)
        self.url = f'/api/productos/{self.producto.pk}/'

    def test_actualizar_stock_y_estado_conserva_foto(self):
        r = self.client.put(self.url, {'stockTotal': 4, 'stockDisponibleVenta': 2, 'stockDisponibleArriendo': 2}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.foto.name, 'productos/existente.webp')
        self.assertEqual(self.client.put(self.url, {'estado': False}, format='json').status_code, 200)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.foto.name, 'productos/existente.webp')

    def test_reemplazar_foto_con_archivo_real(self):
        buffer = BytesIO()
        Image.new('RGB', (5, 5)).save(buffer, format='WEBP')
        archivo = SimpleUploadedFile('nueva.webp', buffer.getvalue(), content_type='image/webp')
        r = self.client.put(self.url, {'foto': archivo, 'nombre': 'Guitarra editada'}, format='multipart')
        self.assertEqual(r.status_code, 200, r.data)
        self.producto.refresh_from_db()
        self.assertTrue(self.producto.foto.storage.exists(self.producto.foto.name))
        self.assertEqual(self.producto.nombre, 'Guitarra editada')
