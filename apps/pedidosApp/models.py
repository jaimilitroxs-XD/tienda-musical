from django.db import models
from django.db import models
from apps.usuariosApp.models import Cliente
from apps.catalogoApp.models import Producto

class Pedido(models.Model):
    """Pedido de compra o arriendo."""
    fechaPedido = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=50, default='Pendiente')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='pedidos')
    datosCliente = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Pedido #{self.id} - {self.estado} ($ {self.total})"


class Venta(models.Model):
    """Compra de productos."""
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, parent_link=True, primary_key=True)

    def __str__(self):
        return f"Venta ID: {self.pedido.id}"


class Arriendo(models.Model):
    """Arriendo y devolución de productos."""
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, parent_link=True, primary_key=True)
    fechaInicio = models.DateField()
    fechaTermino = models.DateField()
    fechaDevolucionReal = models.DateField(blank=True, null=True)
    recargoAtraso = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Arriendo ID: {self.pedido.id} (Del {self.fechaInicio} al {self.fechaTermino})"


class DetallePedido(models.Model):
    """Productos y cantidades del pedido."""
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)
    precioUnitario = models.DecimalField(max_digits=10, decimal_places=2)
    subTotal = models.DecimalField(max_digits=10, decimal_places=2)
    tipoOperacion = models.CharField(max_length=10, default='venta')
    fechaInicio = models.DateField(null=True, blank=True)
    fechaTermino = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} en Pedido #{self.pedido.id}"


class Pago(models.Model):
    """Pago asociado a un pedido."""
    pedido = models.OneToOneField(Pedido, on_delete=models.CASCADE, related_name='pago')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fechaPago = models.DateTimeField(auto_now_add=True)
    metodo = models.CharField(max_length=50) 
    estado = models.CharField(max_length=50, default='Completado')

    def __str__(self):
        return f"Pago de $ {self.monto} ({self.metodo}) - Pedido #{self.pedido.id}"
