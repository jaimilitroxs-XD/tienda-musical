from pathlib import Path
from django.db import migrations


def crear_procedimiento(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        ruta = Path(__file__).resolve().parent.parent / 'sql' / 'reporte_tienda.sql'
        schema_editor.execute(ruta.read_text(encoding='utf-8'))


def quitar_procedimiento(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('DROP PROCEDURE IF EXISTS public.reporte_tienda(date, date, jsonb)')


class Migration(migrations.Migration):
    dependencies = [
        ('pedidosApp', '0002_detallepedido_fechainicio_detallepedido_fechatermino_and_more'),
        ('usuariosApp', '0002_alter_usuario_fecharegistro_alter_usuario_telefono_and_more'),
    ]
    operations = [migrations.RunPython(crear_procedimiento, quitar_procedimiento)]
