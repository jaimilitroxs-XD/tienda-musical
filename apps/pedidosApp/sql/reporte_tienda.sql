CREATE OR REPLACE PROCEDURE public.reporte_tienda(
    IN fecha_desde date,
    IN fecha_hasta date,
    INOUT resultado jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF fecha_desde IS NOT NULL AND fecha_hasta IS NOT NULL AND fecha_desde > fecha_hasta THEN
        RAISE EXCEPTION 'La fecha inicial no puede superar la fecha final';
    END IF;

    WITH datos AS (
        SELECT d.producto_id, pr.nombre AS producto, d."tipoOperacion" AS tipo,
               d.cantidad, d."subTotal" AS monto, p.id AS pedido_id,
               p.cliente_id, u.nombre AS cliente, u.correo
        FROM public."pedidosApp_detallepedido" d
        JOIN public."pedidosApp_pedido" p ON p.id = d.pedido_id
        JOIN public."catalogoApp_producto" pr ON pr.id = d.producto_id
        JOIN public."usuariosApp_cliente" c ON c.id = p.cliente_id
        JOIN public."usuariosApp_usuario" u ON u.id = c.usuario_id
        WHERE p.estado IN ('Pagado', 'Completado', 'Devuelto')
          AND (fecha_desde IS NULL OR (p."fechaPedido" AT TIME ZONE 'America/Santiago')::date >= fecha_desde)
          AND (fecha_hasta IS NULL OR (p."fechaPedido" AT TIME ZONE 'America/Santiago')::date <= fecha_hasta)
    ), productos AS (
        SELECT producto_id AS id, producto AS nombre, tipo,
               SUM(cantidad) AS cantidad, SUM(monto) AS "totalGenerado"
        FROM datos
        GROUP BY producto_id, producto, tipo
        ORDER BY SUM(cantidad) DESC, producto_id, tipo
        LIMIT 10
    ), clientes AS (
        SELECT cliente_id AS id, cliente AS nombre, correo AS email,
               COUNT(DISTINCT pedido_id) AS "cantidadPedidos", SUM(monto) AS "totalGastado"
        FROM datos
        GROUP BY cliente_id, cliente, correo
        ORDER BY COUNT(DISTINCT pedido_id) DESC, cliente_id
        LIMIT 10
    )
    SELECT jsonb_build_object(
        'ingresosVentas', COALESCE(SUM(monto) FILTER (WHERE tipo = 'venta'), 0),
        'ingresosArriendos', COALESCE(SUM(monto) FILTER (WHERE tipo = 'arriendo'), 0),
        'pedidosVentasCount', COUNT(DISTINCT pedido_id) FILTER (WHERE tipo = 'venta'),
        'pedidosArriendosCount', COUNT(DISTINCT pedido_id) FILTER (WHERE tipo = 'arriendo'),
        'topProductos', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.cantidad DESC, r.id, r.tipo) FROM productos r), '[]'::jsonb),
        'topClientes', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r."cantidadPedidos" DESC, r.id) FROM clientes r), '[]'::jsonb)
    ) INTO resultado
    FROM datos;
END;
$$;
