# backend/routers/ventas.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import date
from backend.database.conexion import ejecutar_select, ejecutar_insert, ejecutar_update_delete

router = APIRouter()

class Venta(BaseModel):
    producto_id: int
    tienda_id: int
    fecha: date
    cantidad: int

# ==================== REGISTRAR VENTA ====================
@router.post("/")
async def registrar_venta(venta: Venta):
    # 1. Obtener precios y stock del producto
    sql_producto = f"SELECT precio_venta, precio_compra, stock, nombre FROM productos WHERE id = {venta.producto_id}"
    resultado = ejecutar_select(sql_producto)
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto = resultado[0]
    precio_venta = producto['precio_venta']
    precio_compra = producto['precio_compra']
    stock_actual = producto['stock']
    nombre_producto = producto['nombre']
    
    # 2. Verificar stock
    if venta.cantidad > stock_actual:
        raise HTTPException(
            status_code=400, 
            detail=f"Stock insuficiente. Stock actual: {stock_actual} unidades de '{nombre_producto}'"
        )
    
    # 3. Calcular totales
    ingreso = venta.cantidad * precio_venta
    ganancia = venta.cantidad * (precio_venta - precio_compra)
    
    # 4. Insertar venta
    sql_venta = """
        INSERT INTO ventas (producto_id, tienda_id, fecha, cantidad, ingreso, ganancia)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params_venta = (venta.producto_id, venta.tienda_id, venta.fecha, venta.cantidad, ingreso, ganancia)
    nuevo_id = ejecutar_insert(sql_venta, params_venta)
    
    if not nuevo_id:
        raise HTTPException(status_code=500, detail="Error al registrar venta")
    
    # 5. Actualizar stock
    sql_update = f"UPDATE productos SET stock = stock - {venta.cantidad} WHERE id = {venta.producto_id}"
    ejecutar_update_delete(sql_update)
    
    return {
        "id": nuevo_id,
        "message": f"Venta de {venta.cantidad} x '{nombre_producto}' registrada exitosamente",
        "ingreso": ingreso,
        "ganancia": ganancia,
        "nuevo_stock": stock_actual - venta.cantidad
    }

# ==================== LISTAR VENTAS ====================
@router.get("/")
async def get_ventas(limit: int = 50):
    sql = f"""
        SELECT v.id, v.fecha, v.cantidad, v.ingreso, v.ganancia,
               p.nombre as producto, t.nombre as tienda
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        JOIN tiendas t ON v.tienda_id = t.id
        ORDER BY v.fecha DESC
        LIMIT {limit}
    """
    return ejecutar_select(sql)

# ==================== VENTAS POR TIENDA ====================
@router.get("/tienda/{tienda_id}")
async def get_ventas_por_tienda(tienda_id: int):
    sql = f"""
        SELECT v.id, v.fecha, v.cantidad, v.ingreso, p.nombre as producto
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        WHERE v.tienda_id = {tienda_id}
        ORDER BY v.fecha DESC
        LIMIT 50
    """
    return ejecutar_select(sql)

# ==================== VENTAS POR FECHA ====================
@router.get("/fecha/{fecha}")
async def get_ventas_por_fecha(fecha: date):
    sql = f"""
        SELECT v.id, v.cantidad, v.ingreso, p.nombre as producto, t.nombre as tienda
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        JOIN tiendas t ON v.tienda_id = t.id
        WHERE v.fecha = '{fecha}'
        ORDER BY v.id DESC
    """
    return ejecutar_select(sql)

# ==================== ELIMINAR VENTA ====================
@router.delete("/{venta_id}")
async def delete_venta(venta_id: int):
    # 1. Obtener detalles de la venta
    sql_venta = f"""
        SELECT v.id, v.producto_id, v.cantidad, p.nombre as producto_nombre
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        WHERE v.id = {venta_id}
    """
    venta = ejecutar_select(sql_venta)
    
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    venta_info = venta[0]
    producto_id = venta_info['producto_id']
    cantidad = venta_info['cantidad']
    producto_nombre = venta_info['producto_nombre']
    
    # 2. Eliminar venta
    sql_delete = f"DELETE FROM ventas WHERE id = {venta_id}"
    if not ejecutar_update_delete(sql_delete):
        raise HTTPException(status_code=500, detail="Error al eliminar venta")
    
    # 3. Devolver stock al producto
    sql_update = f"UPDATE productos SET stock = stock + {cantidad} WHERE id = {producto_id}"
    ejecutar_update_delete(sql_update)
    
    # 4. Obtener stock actualizado
    nuevo_stock = ejecutar_select(f"SELECT stock FROM productos WHERE id = {producto_id}")
    stock_actual = nuevo_stock[0]['stock'] if nuevo_stock else 0
    
    return {
        "message": f"Venta #{venta_id} eliminada exitosamente",
        "producto": producto_nombre,
        "cantidad_devuelta": cantidad,
        "nuevo_stock": stock_actual
    }