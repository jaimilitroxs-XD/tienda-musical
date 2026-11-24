
# Conserva las subcategorías asignadas a mano.

from django.db import migrations


REGLAS = {
    'Guitarras y bajos': ([(('bajo',), 'Bajos')], 'Guitarras acústicas'),
    'Teclados y sintetizadores': ([(('sintetizador',), 'Sintetizadores')], 'Teclados'),
    'Pedales y efectos': ([(('pedal',), 'Pedales')], 'Efectos'),
    'Baterías y percusión': ([(('batería', 'bateria'), 'Baterías')], 'Percusión'),
    'Vientos y orquesta': ([(('violín', 'violin', 'viola', 'chelo', 'cello', 'contrabajo'), 'Orquesta')], 'Vientos'),
}


def asignar(apps, schema_editor):
    Producto = apps.get_model('catalogoApp', 'Producto')
    for categoria, (reglas, por_defecto) in REGLAS.items():
        for producto in Producto.objects.filter(categoria__iexact=categoria, subcategoria=''):
            nombre = producto.nombre.lower()
            sub = next((s for palabras, s in reglas if any(p in nombre for p in palabras)), por_defecto)
            
            Producto.objects.filter(pk=producto.pk).update(subcategoria=sub)


class Migration(migrations.Migration):

    dependencies = [
        ('catalogoApp', '0005_producto_subcategoria'),
    ]

    operations = [
        migrations.RunPython(asignar, migrations.RunPython.noop),
    ]
