import importlib.util

from psycopg.conninfo import conninfo_to_dict


def configurar_base(entorno):
    url = entorno.get('DATABASE_URL', '').strip()
    if not url:
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': entorno.get('DB_NAME', 'tienda_musical'),
            'USER': entorno.get('DB_USER', 'tienda'),
            'PASSWORD': entorno.get('DB_PASSWORD', 'tienda_local'),
            'HOST': entorno.get('DB_HOST', '127.0.0.1'),
            'PORT': entorno.get('DB_PORT', '5432'),
        }
    try:
        if not url.startswith(('postgresql://', 'postgres://')):
            raise ValueError()
        parametros = conninfo_to_dict(url)
    except Exception:
        raise ValueError('DATABASE_URL debe contener una URL de conexión PostgreSQL válida.') from None
    if not parametros.get('host') or not parametros.get('dbname'):
        raise ValueError('DATABASE_URL necesita el servidor y el nombre de la base.')
    config = {'ENGINE': 'django.db.backends.postgresql'}
    for origen, destino in [('dbname', 'NAME'), ('user', 'USER'), ('password', 'PASSWORD'), ('host', 'HOST'), ('port', 'PORT')]:
        config[destino] = parametros.pop(origen, '')
    if config['HOST'] not in ('localhost', '127.0.0.1', '::1'):
        parametros.setdefault('sslmode', 'require')
        if parametros['sslmode'] not in ('require', 'verify-ca', 'verify-full'):
            raise ValueError('La conexión en la nube necesita sslmode=require o verificación de certificado.')
    parametros.setdefault('connect_timeout', '15')
    # Reutiliza conexiones con Aiven para reducir la espera.
    
    # DB_POOL=false desactiva el pool.
    
    if entorno.get('DB_POOL', 'true').lower() != 'false' and importlib.util.find_spec('psycopg_pool'):
        parametros['pool'] = {
            'min_size': 1,
            'max_size': int(entorno.get('DB_POOL_MAX', '4')),  
            'timeout': 15,
        }
    config.update(OPTIONS=parametros, CONN_MAX_AGE=0, CONN_HEALTH_CHECKS=True, DISABLE_SERVER_SIDE_CURSORS=True)
    return config
