from pathlib import Path
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify
from PIL import Image
from apps.catalogoApp.models import Producto



CATALOGO = [
    ('Acordeon', 'Acordeón 32 bajos 1306BK', 'Smussato', 'Vientos y orquesta', 299990, 15000, None),
    ('All6435l', 'Saxofón tenor ALL6435L', 'Allegro', 'Vientos y orquesta', 499990, 20000, None),
    ('Audifonos Beyerdynamic', 'Audífonos DT 990 Pro 80', 'Beyerdynamic', 'Audífonos', 179990, 8000, None),
    ('Audífonos de Monitoreo', 'Audífonos de monitoreo HPS3000', 'Behringer', 'Audífonos', 29990, 3000, None),
    ('Bajo electrico TRBX', 'Bajo eléctrico TRBX174', 'Yamaha', 'Guitarras y bajos', 289990, 12000, 'Bajo eléctrico GSR200'),
    ('Bajo Eléctrico Xgtr', 'Bajo eléctrico Jazz Bass', 'XGTR', 'Guitarras y bajos', 189990, 9000, None),
    ('Batería acústica', 'Batería acústica RMX RM-802 BK', 'RMX', 'Baterías y percusión', 399990, 25000, 'Batería Export'),
    ('Bilbao', 'Guitarra acústica BIL-38C-BK con funda', 'Bilbao', 'Guitarras y bajos', 59990, 5000, 'Guitarra acústica F310'),
    ('Caja activa', 'Caja activa Compact 8', 'ARX', 'Audio profesional', 199990, 12000, None),
    ('Electro-Harmonix', 'Pedal Nano Clone Analog Chorus', 'Electro-Harmonix', 'Pedales y efectos', 69990, 4000, None),
    ('Estuche', 'Estuche para guitarra acústica SC30', 'SKB', 'Accesorios', 99990, 5000, None),
    ('Guitarra Eléctrica Stratocaster', 'Guitarra eléctrica Stratocaster', 'XGTR', 'Guitarra electrica', 159990, 10000, 'Guitarra Stratocaster'),
    ('Guitarra Eléctrica Telecaster', 'Guitarra eléctrica Telecaster TL100-WH', 'XGTR', 'Guitarra electrica', 169990, 10000, None),
    ('Guitarra Electroacústica', 'Guitarra electroacústica SDG-2CEBK', 'Suzuki', 'Guitarras y bajos', 129990, 8000, None),
    ('Kit batería', 'Kit de batería acústica de 5 piezas', 'GCR', 'Baterías y percusión', 349990, 20000, None),
    ('Micrófono AKG', 'Micrófono dinámico P3 S', 'AKG', 'Micrófonos', 59990, 5000, 'Micrófono SM58'),
    ('Microfono Vocal', 'Micrófono vocal SL85S', 'Behringer', 'Micrófonos', 24990, 3000, None),
    ('Movall', 'Pedal de boost MP-110', 'Movall', 'Pedales y efectos', 39990, 3000, None),
    ('Pedestal', 'Pedestal de pared para instrumento', 'Genérica', 'Accesorios', 9990, 1000, None),
    ('Piano Yamaha', 'Piano digital P-145BT', 'Yamaha', 'Pianos', 599990, 25000, None),
    ('RCF', 'Sistema de audio EVOX J8', 'RCF', 'Audio profesional', 1299990, 50000, None),
    ('Roy', 'Fliscorno FH-302G', 'Roy Benson', 'Vientos y orquesta', 499990, 20000, None),
    ('Sintetizador Análogo', 'Sintetizador análogo MODEL D', 'Behringer', 'Teclados y sintetizadores', 299990, 15000, None),
    ('Teclado 61', 'Teclado de 61 teclas TON-230', 'Tonic', 'Teclados y sintetizadores', 89990, 7000, 'Teclado PSR E383'),
    ('Teclado Sintetizador', 'Sintetizador MicroFreak Hybrid', 'Arturia', 'Teclados y sintetizadores', 349990, 18000, None),
    ('Ukelele Soprano', 'Ukelele soprano de 21 pulgadas con funda', 'Sonun', 'Ukeleles', 29990, 3000, None),
    ('Ukulele Soprano', 'Ukelele soprano MUK06', 'Mercury', 'Ukeleles', 34990, 3000, None),
]


class Command(BaseCommand):
    help = 'Importa las fotos de ../img y prepara el catálogo para la presentación.'

    def add_arguments(self, parser):
        parser.add_argument('--carpeta', default=str(settings.BASE_DIR.parent / 'img'))

    def handle(self, *args, **options):
        carpeta = Path(options['carpeta'])
        if not carpeta.is_dir():
            raise CommandError(f'No existe la carpeta: {carpeta}')
        archivos = list(carpeta.iterdir())
        preparados = []
        for prefijo, *datos in CATALOGO:
            coincidencias = [p for p in archivos if p.is_file() and p.name.startswith(prefijo)]
            if len(coincidencias) != 1:
                raise CommandError(f'No se encontró una única foto para {prefijo}.')
            foto = coincidencias[0]
            with Image.open(foto) as imagen:
                imagen.verify()
            preparados.append((foto, datos))

        with transaction.atomic():
            for foto, (nombre, marca, categoria, precio, arriendo, antiguo) in preparados:
                producto = Producto.objects.filter(nombre=nombre, marca=marca).first()
                if producto is None and antiguo:
                    
                    producto = Producto.objects.filter(nombre=antiguo, foto='').first()
                    if producto and producto.detallepedido_set.exists():
                        producto = None
                if producto is None:
                    producto = Producto(nombre=nombre, marca=marca, precioVenta=precio,
                        precioArriendoDia=arriendo, stockTotal=5,
                        stockDisponibleVenta=3, stockDisponibleArriendo=2)
                producto.nombre, producto.marca, producto.categoria = nombre, marca, categoria
                if not producto.descripcion:
                    producto.descripcion = f'{nombre} {marca}. Disponible para venta y arriendo con retiro en tienda. Catálogo de demostración académica.'
                destino = f'productos/{slugify(marca + "-" + nombre)[:75]}{foto.suffix.lower()}'
                almacen = producto.foto.storage
                if not almacen.exists(destino):
                    with foto.open('rb') as archivo:
                        destino = almacen.save(destino, File(archivo))
                producto.foto = destino
                producto.save()
        self.stdout.write(self.style.SUCCESS(f'{len(preparados)} productos asociados a sus fotografías.'))
