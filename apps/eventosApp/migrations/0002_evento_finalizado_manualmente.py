from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('eventosApp', '0001_initial')]

    operations = [
        migrations.AddField(
            model_name='evento',
            name='finalizado_manualmente',
            field=models.BooleanField(default=False),
        ),
    ]
