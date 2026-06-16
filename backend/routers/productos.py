# backend/routers/productos.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.database.conexion import ejecutar_select, ejecutar_insert, ejecutar_update_delete

router = APIRouter()

class Producto(BaseModel):
    nombre: str
    categoria: str
    stock: int
    precio_compra: float
    precio_venta: float
    proveedor_id: int
    tienda_id: int

# ==================== LISTAR ====================
@router.get("/")
async def get_productos(tienda_id: Optional[int] = None, categoria: Optional[str] = None):
    sql = """
        SELECT p.id, p.nombre, p.categoria, p.stock, p.precio_compra, p.precio_venta,
               p.proveedor_id, p.tienda_id, t.nombre as tienda, pr.nombre as proveedor
        FROM productos p
        JOIN tiendas t ON p.tienda_id = t.id
        JOIN proveedores pr ON p.proveedor_id = pr.id
        WHERE 1=1
    """
    
    if tienda_id:
        sql += f" AND p.tienda_id = {tienda_id}"
    if categoria:
        sql += f" AND p.categoria = '{categoria}'"
    
    sql += " ORDER BY p.nombre"
    
    return ejecutar_select(sql)

# ==================== OBTENER UNO ====================
@router.get("/{producto_id}")
async def get_producto(producto_id: int):
    sql = f"""
        SELECT p.id, p.nombre, p.categoria, p.stock, p.precio_compra, p.precio_venta,
               p.proveedor_id, p.tienda_id, t.nombre as tienda
        FROM productos p
        JOIN tiendas t ON p.tienda_id = t.id
        WHERE p.id = {producto_id}
    """
    resultados = ejecutar_select(sql)
    if not resultados:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return resultados[0]

# ==================== CREAR ====================
@router.post("/")
async def create_producto(producto: Producto):
    # Verificar que la tienda existe
    tienda_check = ejecutar_select(f"SELECT id FROM tiendas WHERE id = {producto.tienda_id}")
    if not tienda_check:
        raise HTTPException(status_code=400, detail="La tienda especificada no existe")
    
    # Verificar que el proveedor existe
    proveedor_check = ejecutar_select(f"SELECT id FROM proveedores WHERE id = {producto.proveedor_id}")
    if not proveedor_check:
        raise HTTPException(status_code=400, detail="El proveedor especificado no existe")
    
    sql = """
        INSERT INTO productos (nombre, categoria, stock, precio_compra, precio_venta, proveedor_id, tienda_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    params = (producto.nombre, producto.categoria, producto.stock, producto.precio_compra, 
              producto.precio_venta, producto.proveedor_id, producto.tienda_id)
    nuevo_id = ejecutar_insert(sql, params)
    
    if nuevo_id:
        return {"id": nuevo_id, "message": "Producto creado exitosamente"}
    raise HTTPException(status_code=500, detail="Error al crear producto")

# ==================== ACTUALIZAR STOCK ====================
@router.patch("/{producto_id}/stock")
async def update_stock(producto_id: int, stock: int):
    # Verificar si existe
    check_sql = f"SELECT id FROM productos WHERE id = {producto_id}"
    if not ejecutar_select(check_sql):
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    sql = f"UPDATE productos SET stock = {stock} WHERE id = {producto_id}"
    if ejecutar_update_delete(sql):
        return {"message": "Stock actualizado exitosamente", "nuevo_stock": stock}
    raise HTTPException(status_code=500, detail="Error al actualizar stock")

# ==================== ELIMINAR ====================
@router.delete("/{producto_id}")
async def delete_producto(producto_id: int):
    # 1. Verificar si existe
    check_sql = f"SELECT id, nombre FROM productos WHERE id = {producto_id}"
    producto = ejecutar_select(check_sql)
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # 2. Contar ventas asociadas (para informar)
    ventas_sql = f"SELECT COUNT(*) as total FROM ventas WHERE producto_id = {producto_id}"
    ventas = ejecutar_select(ventas_sql)
    ventas_count = ventas[0]['total'] if ventas else 0
    
    # 3. Eliminar (las ventas se eliminarán en CASCADA por la BD)
    delete_sql = f"DELETE FROM productos WHERE id = {producto_id}"
    if ejecutar_update_delete(delete_sql):
        return {
            "message": f"Producto '{producto[0]['nombre']}' eliminado exitosamente",
            "id": producto_id,
            "ventas_eliminadas": ventas_count
        }
    raise HTTPException(status_code=500, detail="Error al eliminar producto")

# ==================== STOCK CRÍTICO ====================
@router.get("/stock/critico")
async def get_stock_critico(limite: int = 10):
    sql = f"""
        SELECT p.id, p.nombre, p.categoria, p.stock, p.precio_venta, t.nombre as tienda
        FROM productos p
        JOIN tiendas t ON p.tienda_id = t.id
        WHERE p.stock < {limite}
        ORDER BY p.stock ASC
    """
    return ejecutar_select(sql)