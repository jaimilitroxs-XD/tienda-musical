"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path

from apps.catalogoApp import views as catalogo_views
from apps.catalogoApp import resenas as resenas_views
from apps.pedidosApp import views as pedidos_views
from apps.usuariosApp import views as usuarios_views
from apps.eventosApp import views as eventos_views

urlpatterns = [
    path('api/csrf/', usuarios_views.api_csrf),
    path('api/usuarios/', usuarios_views.api_usuarios),
    path('api/usuarios/<int:pk>/', usuarios_views.api_estado_usuario),
    path('api/pedidos/', pedidos_views.api_pedidos),
    path('api/pedidos/<int:pk>/', pedidos_views.api_estado_pedido),
    path('api/reportes/', pedidos_views.api_reportes),
    path('admin/', admin.site.urls),

    
    path('api/productos/', catalogo_views.api_lista_productos, name='api_lista_productos'),
    path('api/productos/categorias/', catalogo_views.api_categorias_productos, name='api_categorias_productos'),
    path('api/productos/reportar-falla/', catalogo_views.api_reportar_falla, name='api_reportar_falla'),
    path('api/mantenciones/', catalogo_views.api_lista_mantenciones, name='api_lista_mantenciones'),
    path('api/mantenciones/<int:pk>/marcar-reparado/', catalogo_views.api_marcar_reparado, name='api_marcar_reparado'),
    path('api/productos/<int:pk>/historial-mantenciones/', catalogo_views.api_historial_mantenciones_producto, name='api_historial_mantenciones_producto'),
    path('api/productos/<int:pk>/', catalogo_views.api_detalle_producto, name='api_detalle_producto'),
    path('api/productos/<int:pk>/resenas/', resenas_views.api_resenas_producto, name='api_resenas_producto'),
    path('api/resenas/<int:pk>/', resenas_views.api_detalle_resena, name='api_detalle_resena'),

    
    path('api/usuarios/registro/', usuarios_views.api_registro, name='api_registro'),
    path('api/usuarios/login/', usuarios_views.api_login, name='api_login'),
    path('api/usuarios/logout/', usuarios_views.api_logout, name='api_logout'),
    path('api/usuarios/me/', usuarios_views.api_perfil, name='api_perfil'),
    path('api/usuarios/cambiar-password/', usuarios_views.api_cambiar_password, name='api_cambiar_password'),
    path('api/usuarios/crear/', usuarios_views.api_crear_usuario, name='api_crear_usuario'),

    
    path('api/eventos/', eventos_views.api_eventos, name='api_eventos'),
    path('api/eventos/resumen/', eventos_views.api_resumen_eventos, name='api_resumen_eventos'),
    path('api/eventos/<int:pk>/finalizar/', eventos_views.api_finalizar_evento, name='api_finalizar_evento'),
    path('api/eventos/<int:pk>/', eventos_views.api_detalle_evento, name='api_detalle_evento'),

    path('carrito/', pedidos_views.ver_carrito, name='carrito'),
]

from django.conf import settings
from django.conf.urls.static import static
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
