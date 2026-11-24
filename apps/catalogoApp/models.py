from django.core.exceptions import ValidationError
from django.db import models

class Producto(models.Model):
    nombre = models.CharField(max_length=150)
    categoria = models.CharField(max_length=100)
    
    subcategoria = models.CharField(max_length=100, blank=True, default='')
    marca = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='productos/', blank=True, null=True)
    precioVenta = models.DecimalField(max_digits=10, decimal_places=2)
    precioArriendoDia = models.DecimalField(max_digits=10, decimal_places=2)
    stockTotal = models.IntegerField(default=0)
    stockDisponibleVenta = models.IntegerField(default=0)
    stockDisponibleArriendo = models.IntegerField(default=0)
    estado = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if min(self.stockTotal, self.stockDisponibleVenta, self.stockDisponibleArriendo, self.precioVenta, self.precioArriendoDia) < 0:
            raise ValidationError('Los precios y stocks no pueden ser negativos.')
      
        if self.stockDisponibleVenta > self.stockTotal:
            raise ValidationError({'stockDisponibleVenta': 'El stock de venta no puede ser mayor al stock total.'})
        if self.stockDisponibleArriendo > self.stockTotal:
            raise ValidationError({'stockDisponibleArriendo': 'El stock de arriendo no puede ser mayor al stock total.'})
       
        if (self.stockDisponibleVenta + self.stockDisponibleArriendo) > self.stockTotal:
            raise ValidationError('La suma de stocks supera el stock total disponible.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.marca} {self.nombre}"


class Resena(models.Model):
    """Opinión de un cliente sobre un producto (una por cliente y producto)."""
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='resenas')
    usuario = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='resenas')
    calificacion = models.PositiveSmallIntegerField()
    titulo = models.CharField(max_length=100, blank=True, default='')
    comentario = models.TextField(blank=True, default='')
    
    visible = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado', '-id']
        constraints = [
            models.UniqueConstraint(fields=['producto', 'usuario'], name='una_resena_por_cliente_y_producto'),
            models.CheckConstraint(condition=models.Q(calificacion__gte=1, calificacion__lte=5), name='calificacion_entre_1_y_5'),
        ]

    def __str__(self):
        return f'{self.calificacion}★ {self.producto.nombre} ({self.usuario_id})'


class ReporteMantencion(models.Model):
   
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='mantenciones')
    fechaReporte = models.DateField(auto_now_add=True)
    fallaReportada = models.TextField()
    descripcionReparacion = models.TextField(blank=True, null=True)
    fechaReparacion = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=50, default='pendiente')
    tipoStock = models.CharField(max_length=10, default='venta')

    def __str__(self):
        return f"Mantención #{self.id} - Producto: {self.producto.nombre} ({self.estado})"
