from django.core.management.base import BaseCommand
from apps.catalogoApp.models import Producto


class Command(BaseCommand):
    help = 'Crea instrumentos de ejemplo sin duplicarlos ni modificar productos existentes.'

    def handle(self, *args, **options):
        for nombre, categoria, marca, precio, arriendo in [
            ('Guitarra acústica F310', 'Guitarras', 'Yamaha', 159990, 8000),
            ('Bajo eléctrico GSR200', 'Bajos', 'Ibanez', 289990, 12000),
            ('Teclado PSR E383', 'Teclados', 'Yamaha', 249990, 15000),
            ('Batería Export', 'Baterías', 'Pearl', 799990, 25000),
            ('Micrófono SM58', 'Audio', 'Shure', 119990, 6000),
            ('Guitarra Stratocaster', 'Guitarras', 'Squier', 229990, 10000),
        ]:
            Producto.objects.get_or_create(nombre=nombre, marca=marca, defaults=dict(categoria=categoria,
                descripcion='Instrumento disponible para compra o arriendo con retiro en tienda.',
                precioVenta=precio, precioArriendoDia=arriendo, stockTotal=5,
                stockDisponibleVenta=3, stockDisponibleArriendo=2))
        self.stdout.write(self.style.SUCCESS('Catálogo de ejemplo creado.'))
