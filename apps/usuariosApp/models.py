from django.db import models
from django.contrib.auth.models import User


class Usuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_usuario')
    nombre = models.CharField(max_length=150)
    correo = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, default='')
    activo = models.BooleanField(default=True)
    fechaRegistro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.correo})"

class Cliente(models.Model):
    direccion = models.CharField(max_length=255, blank=True, null=True)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='cliente_rel')

    def __str__(self):
        return f"Cliente: {self.usuario.nombre}"

class Tecnico(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='tecnico_rel')

    def __str__(self):
        return f"Técnico: {self.usuario.nombre}"

class VendedorAdmin(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='vendedor_rel')

    def __str__(self):
        return f"VendedorAdmin: {self.usuario.nombre}"