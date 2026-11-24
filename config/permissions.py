from rest_framework.permissions import BasePermission, SAFE_METHODS


def tecnico(user):
    return user.is_authenticated and user.groups.filter(name='Tecnico').exists()


class SuperAdminPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser


class CatalogoPermission(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or (request.user.is_authenticated and request.user.is_staff)


class TallerPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser or tecnico(request.user) or (request.method in SAFE_METHODS and request.user.is_staff)
