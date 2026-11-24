import re
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status
from .models import Usuario, Cliente, VendedorAdmin, Tecnico
from config.permissions import SuperAdminPermission
from config.paginacion import paginar, ordenar_listado
from django.db.models import Q
from django.shortcuts import get_object_or_404


def validar_clave(password):
    validate_password(password)
    if not re.search(r'\d', password) or not re.search(r'[^\w\s]', password):
        raise ValidationError('La contraseña debe incluir un número y un símbolo.')


def arriendos_activos(user):
    from apps.pedidosApp.models import DetallePedido
    return DetallePedido.objects.filter(pedido__cliente__usuario__user=user,
        tipoOperacion='arriendo', pedido__estado__in=['Pendiente', 'Pagado', 'Completado']).exists()


@api_view(['GET'])
@permission_classes([AllowAny])
def api_csrf(request):
    return Response({'csrfToken': get_token(request)})


@api_view(['GET'])
@permission_classes([SuperAdminPermission])
def api_usuarios(request):
    # Carga perfiles y grupos sin consultas repetidas.
    qs = User.objects.select_related('perfil_usuario').prefetch_related('groups').order_by('-id')
    q = request.query_params.get('q', '').strip()
    if q:
        qs = qs.filter(Q(first_name__icontains=q) | Q(username__icontains=q) | Q(email__icontains=q))
    rol = request.query_params.get('rol', '').strip()
    if rol == 'Superadmin':
        qs = qs.filter(is_superuser=True)
    elif rol == 'Vendedor':
        qs = qs.filter(is_staff=True, is_superuser=False)
    elif rol == 'Tecnico':
        qs = qs.filter(is_staff=False, is_superuser=False, groups__name='Tecnico')
    elif rol == 'Cliente':
        qs = qs.filter(is_staff=False, is_superuser=False).exclude(groups__name='Tecnico')
    estado = request.query_params.get('estado', '').strip()
    if estado in ('activos', 'inactivos'):
        qs = qs.filter(is_active=estado == 'activos')
    qs = ordenar_listado(request, qs, {'nombre': 'first_name', 'email': 'email', 'activo': 'is_active'})
    return paginar(request, qs.distinct(), lambda objs: [datos_usuario(u) for u in objs], por_defecto=10)


def datos_usuario(user):
    rol = _obtener_rol_usuario(user)
    return dict(id=user.pk, nombre=user.first_name or user.username, email=user.email,
        telefono=_obtener_telefono_usuario(user), rol=rol, activo=user.is_active,
        es_admin=user.is_staff, es_superadmin=user.is_superuser,
        es_tecnico=rol == 'Tecnico')


def asignar_rol(user, perfil, rol):
    user.is_superuser = rol == 'Superadmin'
    user.is_staff = rol in ('Superadmin', 'Vendedor')
    grupo, _ = Group.objects.get_or_create(name='Tecnico')
    user.groups.remove(grupo)
    if rol == 'Tecnico':
        user.groups.add(grupo)
        Tecnico.objects.get_or_create(usuario=perfil)
    elif rol == 'Vendedor':
        VendedorAdmin.objects.get_or_create(usuario=perfil)
    elif rol in ('Cliente', 'Superadmin'):
        Cliente.objects.get_or_create(usuario=perfil)
    user.save()


@api_view(['PATCH', 'DELETE'])
@permission_classes([SuperAdminPermission])
@transaction.atomic
def api_estado_usuario(request, pk):
    list(User.objects.select_for_update().filter(is_superuser=True).order_by('pk'))
    user = get_object_or_404(User.objects.select_for_update(), pk=pk)
    data = request.data
    activo = False if request.method == 'DELETE' else data.get('activo', user.is_active)
    rol = data.get('rol', _obtener_rol_usuario(user))
    if not isinstance(activo, bool) or rol not in ('Superadmin', 'Vendedor', 'Tecnico', 'Cliente'):
        return Response({'error': 'Estado o rol inválido.'}, status=400)
    if user == request.user and (not activo or rol != 'Superadmin'):
        return Response({'error': 'No puedes desactivar tu cuenta ni quitarte el rol de superadministrador.'}, status=400)
    if user.is_superuser and (not activo or rol != 'Superadmin') and not User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk).exists():
        return Response({'error': 'Debe quedar al menos un superadministrador activo.'}, status=400)
    if (not activo or rol not in ('Cliente', 'Superadmin')) and arriendos_activos(user):
        return Response({'error': 'La cuenta tiene arriendos pendientes de devolución.'}, status=400)
    if request.method == 'DELETE':
        from apps.pedidosApp.models import Pedido
        if Pedido.objects.filter(cliente__usuario__user=user).exists():
            return Response({'error': 'La cuenta tiene historial de pedidos. Puedes desactivarla para conservar ese historial.'}, status=400)
        user.delete()
        return Response({'exito': True})
    nombre = str(data.get('nombre', user.first_name)).strip()
    email = str(data.get('email', user.email)).strip().lower()
    password = data.get('pass', '')
    try:
        validate_email(email)
        if len(nombre) < 3:
            raise ValidationError('El nombre debe tener al menos 3 caracteres.')
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists() or User.objects.filter(username=email).exclude(pk=user.pk).exists():
            raise ValidationError('El correo ya está registrado.')
        if password:
            validar_clave(password)
    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=400)
    perfil, _ = Usuario.objects.get_or_create(user=user, defaults={'nombre': nombre, 'correo': user.email})
    user.first_name, user.email, user.username, user.is_active = nombre, email, email, activo
    if password:
        user.set_password(password)
    perfil.nombre, perfil.correo, perfil.telefono, perfil.activo = nombre, email, str(data.get('telefono', perfil.telefono)), activo
    perfil.save()
    asignar_rol(user, perfil, rol)
    if user == request.user and password:
        update_session_auth_hash(request._request, user)
    return Response({'exito': True, 'usuario': datos_usuario(user)})



def _obtener_wsgi_request(request):
    return getattr(request, '_request', request)



def _obtener_usuario_autenticado(request):
    req_wsgi = _obtener_wsgi_request(request)
    usuario = getattr(req_wsgi, 'user', None)
    if usuario and usuario.is_authenticated:
        return usuario, req_wsgi
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user, req_wsgi
    return None, req_wsgi



def _obtener_rol_usuario(user):
    if user.is_superuser:
        return 'Superadmin'
    if user.is_staff:
        return 'Vendedor'
    
    if any(g.name == 'Tecnico' for g in user.groups.all()):
        return 'Tecnico'
    return 'Cliente'



def _obtener_telefono_usuario(user):
    if hasattr(user, 'perfil_usuario') and user.perfil_usuario.telefono:
        return user.perfil_usuario.telefono
    return getattr(user, 'last_name', '')



@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
@transaction.atomic
def api_registro(request):
    data = request.data
    nombre = data.get('nombre', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('pass', '')

    
    if not email or not password:
        return Response({'error': 'El correo y la contraseña son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

    
    if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
        return Response({'error': 'El correo electrónico ya está registrado.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(email)
        validar_clave(password)
        if len(nombre) < 3:
            raise ValidationError('Ingresa tu nombre completo.')
    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=400)

    
    usuario = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=nombre
    )
    usuario.save()

    
    perfil = Usuario.objects.create(user=usuario, nombre=nombre, correo=email)
    Cliente.objects.create(usuario=perfil)

    
    req_wsgi = _obtener_wsgi_request(request)
    login(req_wsgi, usuario)
    req_wsgi.session.save()

    return Response({
        'exito': True,
        'mensaje': 'Usuario registrado exitosamente',
        'usuario': {
            'id': usuario.id,
            'nombre': usuario.first_name or usuario.username,
            'email': usuario.email,
            'telefono': '',
            'rol': 'Cliente',
            'es_admin': False,
            'es_tecnico': False
        }
    }, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_protect
def api_login(request):
    data = request.data
    email = data.get('email', '').strip().lower()
    password = data.get('pass', '')
    key = 'login-intentos:' + email
    intentos = cache.get(key, 0)
    if intentos >= 4:
        return Response({'error': 'Demasiados intentos. Espera 5 minutos.'}, status=429)

    req_wsgi = _obtener_wsgi_request(request)
    usuario = authenticate(req_wsgi, username=email, password=password)

    if usuario is not None:
        cache.delete(key)
        
        if not usuario.is_active:
            return Response({'error': 'Esta cuenta se encuentra desactivada.'}, status=status.HTTP_400_BAD_REQUEST)
        
        
        login(req_wsgi, usuario)
        req_wsgi.session.cycle_key()
        req_wsgi.session.save()

        telefono = _obtener_telefono_usuario(usuario)
        rol = _obtener_rol_usuario(usuario)

        return Response({
            'exito': True,
            'mensaje': 'Inicio de sesión exitoso',
            'usuario': {
                'id': usuario.id,
                'nombre': usuario.first_name or usuario.username,
                'email': usuario.email,
                'telefono': telefono,
                'rol': rol,
                'es_admin': usuario.is_staff,
                'es_superadmin': usuario.is_superuser,
                'es_tecnico': (rol == 'Tecnico')
            }
        })
    else:
        cache.set(key, intentos + 1, timeout=300)
        return Response({'error': 'Credenciales inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)



@api_view(['POST'])
@permission_classes([AllowAny])
def api_logout(request):
    req_wsgi = _obtener_wsgi_request(request)
    logout(req_wsgi)
    return Response({'exito': True, 'mensaje': 'Sesión cerrada correctamente.'})



@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_perfil(request):
    data = request.data if request.method in ['PUT', 'DELETE'] else request.query_params
    user_id = data.get('user_id') or request.query_params.get('user_id')

    usuario, _ = _obtener_usuario_autenticado(request)

    if not usuario:
        return Response({'error': 'Debes iniciar sesión para realizar esta acción.'}, status=status.HTTP_401_UNAUTHORIZED)

    rol = _obtener_rol_usuario(usuario)

    
    if request.method == 'GET':
        return Response({
            'id': usuario.id,
            'nombre': usuario.first_name or usuario.username,
            'email': usuario.email,
            'telefono': _obtener_telefono_usuario(usuario),
            'rol': rol,
            'es_admin': usuario.is_staff,
                'es_superadmin': usuario.is_superuser,
            'es_tecnico': (rol == 'Tecnico')
        })

    
    elif request.method == 'PUT':
        nombre = data.get('nombre', '').strip()
        email = data.get('email', '').strip().lower()
        telefono_raw = str(data.get('telefono', '')).strip()

        if not nombre:
            return Response({'error': 'El campo "Nombre Completo" es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(nombre) < 3:
            return Response({'error': 'El campo "Nombre Completo" debe tener al menos 3 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        usuario.first_name = nombre

        if email and email != usuario.email:
            if User.objects.filter(email=email).exclude(id=usuario.id).exists():
                return Response({'error': 'El campo "Correo Electrónico" ya pertenece a otro usuario.'}, status=status.HTTP_400_BAD_REQUEST)
            usuario.email = email
            usuario.username = email

        try:
            usuario.save()
            
            
            if hasattr(usuario, 'perfil_usuario'):
                usuario.perfil_usuario.nombre = nombre
                usuario.perfil_usuario.correo = usuario.email
                usuario.perfil_usuario.telefono = telefono_raw
                usuario.perfil_usuario.save()

            return Response({
                'exito': True,
                'mensaje': 'Perfil actualizado correctamente.',
                'usuario': {
                    'id': usuario.id,
                    'nombre': usuario.first_name or usuario.username,
                    'email': usuario.email,
                    'telefono': telefono_raw,
                    'rol': rol,
                    'es_admin': usuario.is_staff,
                'es_superadmin': usuario.is_superuser,
                    'es_tecnico': (rol == 'Tecnico')
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Error al guardar en base de datos: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    
    elif request.method == 'DELETE':
        if usuario.is_superuser:
            return Response({'error': 'El superadministrador no puede desactivar su propia cuenta.'}, status=400)
        if arriendos_activos(usuario):
            return Response({'error': 'Debes devolver tus arriendos antes de desactivar la cuenta.'}, status=400)
        usuario.is_active = False
        usuario.save()
        logout(_obtener_wsgi_request(request))
        return Response({'exito': True, 'mensaje': 'Cuenta desactivada exitosamente.'})



@api_view(['POST'])
@permission_classes([AllowAny])
def api_cambiar_password(request):
    data = request.data
    user_id = data.get('user_id')
    pass_actual = data.get('pass_actual', '')
    nueva_password = data.get('nueva_password', '')

    if not request.user.is_authenticated:
        return Response({'error': 'Debes iniciar sesión para realizar esta acción.'}, status=status.HTTP_401_UNAUTHORIZED)

    usuario = request.user

    if not pass_actual or not nueva_password:
        return Response({'error': 'Todos los campos son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

    if not usuario.check_password(pass_actual):
        return Response({'error': 'El campo "Contraseña Actual" ingresada es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validar_clave(nueva_password)
    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=400)
    usuario.set_password(nueva_password)
    usuario.save()
    update_session_auth_hash(_obtener_wsgi_request(request), usuario)

    return Response({'exito': True, 'mensaje': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([SuperAdminPermission])
@transaction.atomic
def api_crear_usuario(request):
    data = request.data
    nombre = str(data.get('nombre', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = data.get('pass', '')
    rol = data.get('rol', 'Cliente')
    try:
        validate_email(email)
        validar_clave(password)
        if rol not in ('Superadmin', 'Vendedor', 'Tecnico', 'Cliente') or len(nombre) < 3:
            raise ValidationError('Nombre o rol inválido.')
        if User.objects.filter(username=email).exists() or User.objects.filter(email__iexact=email).exists():
            raise ValidationError('El correo ya está registrado.')
    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=400)
    user = User.objects.create_user(username=email, email=email, password=password, first_name=nombre)
    perfil = Usuario.objects.create(user=user, nombre=nombre, correo=email, telefono=data.get('telefono', ''))
    asignar_rol(user, perfil, rol)
    return Response({'exito': True, 'usuario': datos_usuario(user)}, status=201)
