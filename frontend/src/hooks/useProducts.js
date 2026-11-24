import { useState } from 'react';
import { peticionProducto } from '../productPayload';

const API_URL = '/api/productos/';

export function useProducts() {
  const [modalOpen, setModalOpen] = useState(false);
  const [stockError, setStockError] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    nombre: '',
    categoria: '',
    subcategoria: '',
    marca: '',
    descripcion: '',
    imagen: '',
    precioVenta: '',
    precioArriendoDia: '',
    stockTotal: 0,
    stockDisponibleVenta: 0,
    stockDisponibleArriendo: 0,
    estado: true,
    stockComprometidoVenta: 0,
    stockComprometidoArriendo: 0,
  });

  const openModal = (product = null) => {
    setStockError('');
    if (product) {
      setFormData({
        ...product,
        fotoArchivo: null,
        stockComprometidoVenta: product.stockComprometidoVenta || 0,
        stockComprometidoArriendo: product.stockComprometidoArriendo || 0,
      });
    } else {
      setFormData({
        id: null,
        nombre: '',
        categoria: '',
        subcategoria: '',
        marca: '',
        descripcion: '',
        imagen: '',
        precioVenta: '',
        precioArriendoDia: '',
        stockTotal: 0,
        stockDisponibleVenta: 0,
        stockDisponibleArriendo: 0,
        estado: true,
        stockComprometidoVenta: 0,
        stockComprometidoArriendo: 0,
      });
    }
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? e.target.files?.[0] || null : type === 'checkbox' ? checked : value,
    }));
  };

  const toggleProductStatus = async (product) => {
    const nextState = !product.estado;

    if (!nextState) {
      const compVenta = product.stockComprometidoVenta || 0;
      const compArriendo = product.stockComprometidoArriendo || 0;

      if (compVenta > 0 || compArriendo > 0) {
        alert(
          `No se puede dar de baja el producto "${product.nombre}". Tiene pedidos activos pendientes de entrega o devolución.`
        );
        return;
      }
    }

    const confirmMessage = nextState
      ? `¿Deseas volver a habilitar "${product.nombre}" en el catálogo público?`
      : `¿Estás seguro de dar de baja "${product.nombre}"? Dejará de ser visible para los clientes.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}${product.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextState }),
      });

      if (res.ok) {
        window.dispatchEvent(new Event('catalogo-actualizado'));
      } else {
        alert('Error al actualizar el estado del producto.');
      }
    } catch (err) {
      console.error('Error al cambiar estado del producto:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStockError('');

    const sTotal = parseInt(formData.stockTotal || 0);
    const sVenta = parseInt(formData.stockDisponibleVenta || 0);
    const sArriendo = parseInt(formData.stockDisponibleArriendo || 0);
    const compVenta = parseInt(formData.stockComprometidoVenta || 0);
    const compArriendo = parseInt(formData.stockComprometidoArriendo || 0);

    if (sVenta + sArriendo > sTotal) {
      setStockError(
        `La suma del stock de venta (${sVenta}) y arriendo (${sArriendo}) no puede superar el stock total (${sTotal}).`
      );
      return;
    }

    if (sTotal < 0 || sVenta < 0 || sArriendo < 0) {
      setStockError('Los valores de stock no pueden ser negativos.');
      return;
    }

    if (formData.estado === false && (compVenta > 0 || compArriendo > 0)) {
      setStockError(
        'No se puede deshabilitar el producto mientras existan pedidos activos pendientes de entrega o devolución.'
      );
      return;
    }

    const isEdit = Boolean(formData.id);
    const url = isEdit ? `${API_URL}${formData.id}/` : API_URL;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        ...peticionProducto(formData),
      });

      if (res.ok) {
        setModalOpen(false);
        window.dispatchEvent(new Event('catalogo-actualizado'));
      } else {
        const errData = await res.json();
        setStockError(Object.entries(errData).map(([campo, mensajes]) =>
          `${campo === 'non_field_errors' ? 'Producto' : campo}: ${Array.isArray(mensajes) ? mensajes.join(' ') : mensajes}`
        ).join(' '));
      }
    } catch (err) {
      setStockError('Error al conectar con el servidor backend.');
    }
  };

  
  const reportarFalla = async (productoId, descripcion, userId, tipoStock = 'venta') => {
    try {
      const res = await fetch(`${API_URL}reportar-falla/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          descripcion: descripcion,
          user_id: userId,
          tipoStock,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        window.dispatchEvent(new Event('catalogo-actualizado'));
        return { exito: true, mensaje: data.mensaje };
      } else {
        return { exito: false, error: data.error || 'Error al reportar la falla.' };
      }
    } catch (err) {
      return { exito: false, error: 'Error de conexión con el servidor backend.' };
    }
  };

  return {
    modalOpen,
    setModalOpen,
    formData,
    stockError,
    openModal,
    toggleProductStatus,
    handleChange,
    handleSubmit,
    reportarFalla,
  };
}
