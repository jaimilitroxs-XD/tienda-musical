from django.test import SimpleTestCase
from .database import configurar_base


class ConfiguracionBaseTest(SimpleTestCase):
    def test_configuracion_local_se_conserva(self):
        config = configurar_base({'DB_NAME': 'tienda', 'DB_USER': 'postgres', 'DB_PASSWORD': 'local'})
        self.assertEqual(config['HOST'], '127.0.0.1')
        self.assertEqual(config['NAME'], 'tienda')

    def test_url_nube_con_clave_codificada_y_ssl(self):
        config = configurar_base({'DATABASE_URL': 'postgresql://usuario:p%40ss%23word@servidor.example:5432/base?sslmode=require&channel_binding=require'})
        self.assertEqual(config['PASSWORD'], 'p@ss#word')
        self.assertEqual(config['NAME'], 'base')
        self.assertEqual(config['OPTIONS']['sslmode'], 'require')
        self.assertEqual(config['OPTIONS']['channel_binding'], 'require')
        self.assertTrue(config['DISABLE_SERVER_SIDE_CURSORS'])

    def test_url_nube_sin_ssl_lo_activa(self):
        self.assertEqual(configurar_base({'DATABASE_URL': 'postgresql://usuario:clave@servidor.example/base'})['OPTIONS']['sslmode'], 'require')

    def test_url_invalida_no_expone_credenciales(self):
        for url in ['https://usuario:secreto@servidor/base', 'postgresql://usuario:secreto@servidor', 'postgresql://usuario:secreto@servidor/base?sslmode=disable']:
            with self.assertRaises(ValueError) as error:
                configurar_base({'DATABASE_URL': url})
            self.assertNotIn('secreto', str(error.exception))
