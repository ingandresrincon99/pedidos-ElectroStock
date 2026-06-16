# backend/routers/tiendas.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.database.conexion import ejecutar_select, ejecutar_insert, ejecutar_update_delete

router = APIRouter()

class Tienda(BaseModel):
    nombre: str
    ciudad: str
    direccion: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    gerente: Optional[str] = None

# ==================== LISTAR ====================
@router.get("/")
async def get_tiendas():
    sql = "SELECT id, nombre, ciudad, direccion, latitud, longitud, gerente FROM tiendas ORDER BY nombre"
    return ejecutar_select(sql)

# ==================== OBTENER UNA ====================
@router.get("/{tienda_id}")
async def get_tienda(tienda_id: int):
    sql = f"SELECT id, nombre, ciudad, direccion, latitud, longitud, gerente FROM tiendas WHERE id = {tienda_id}"
    resultados = ejecutar_select(sql)
    if not resultados:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return resultados[0]

# ==================== CREAR ====================
@router.post("/")
async def create_tienda(tienda: Tienda):
    sql = """
        INSERT INTO tiendas (nombre, ciudad, direccion, latitud, longitud, gerente)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (tienda.nombre, tienda.ciudad, tienda.direccion, tienda.latitud, tienda.longitud, tienda.gerente)
    nuevo_id = ejecutar_insert(sql, params)
    
    if nuevo_id:
        return {"id": nuevo_id, "message": "Tienda creada exitosamente"}
    raise HTTPException(status_code=500, detail="Error al crear tienda")

# ==================== ACTUALIZAR ====================
@router.put("/{tienda_id}")
async def update_tienda(tienda_id: int, tienda: Tienda):
    sql = """
        UPDATE tiendas 
        SET nombre = %s, ciudad = %s, direccion = %s, latitud = %s, longitud = %s, gerente = %s
        WHERE id = %s
    """
    params = (tienda.nombre, tienda.ciudad, tienda.direccion, tienda.latitud, tienda.longitud, tienda.gerente, tienda_id)
    
    if ejecutar_update_delete(sql, params):
        return {"message": "Tienda actualizada exitosamente"}
    raise HTTPException(status_code=500, detail="Error al actualizar tienda")

# ==================== ELIMINAR ====================
@router.delete("/{tienda_id}")
async def delete_tienda(tienda_id: int):
    # 1. Verificar si existe
    check_sql = f"SELECT id, nombre FROM tiendas WHERE id = {tienda_id}"
    tienda = ejecutar_select(check_sql)
    
    if not tienda:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # 2. Contar productos y ventas afectados (solo para informar)
    productos_sql = f"SELECT COUNT(*) as total FROM productos WHERE tienda_id = {tienda_id}"
    productos = ejecutar_select(productos_sql)
    
    ventas_sql = f"SELECT COUNT(*) as total FROM ventas WHERE tienda_id = {tienda_id}"
    ventas = ejecutar_select(ventas_sql)
    
    productos_count = productos[0]['total'] if productos else 0
    ventas_count = ventas[0]['total'] if ventas else 0
    
    # 3. Eliminar (los productos y ventas se eliminarán en CASCADA por la BD)
    delete_sql = f"DELETE FROM tiendas WHERE id = {tienda_id}"
    if ejecutar_update_delete(delete_sql):
        return {
            "message": f"Tienda '{tienda[0]['nombre']}' eliminada exitosamente",
            "id": tienda_id,
            "productos_eliminados": productos_count,
            "ventas_eliminadas": ventas_count
        }
    raise HTTPException(status_code=500, detail="Error al eliminar tienda")

# ==================== RENDIMIENTO PARA MAPA ====================
@router.get("/rendimiento/mapa")
async def get_rendimiento_mapa():
    sql = """
        SELECT 
            t.id, t.nombre, t.ciudad, t.latitud, t.longitud,
            COALESCE(SUM(v.ingreso), 0) as ventas_totales,
            COALESCE(SUM(v.ganancia), 0) as ganancia_total,
            CASE 
                WHEN COALESCE(SUM(v.ingreso), 0) > 1000 THEN 'alto'
                WHEN COALESCE(SUM(v.ingreso), 0) > 500 THEN 'medio'
                ELSE 'bajo'
            END as rendimiento
        FROM tiendas t
        LEFT JOIN ventas v ON t.id = v.tienda_id
        GROUP BY t.id, t.nombre, t.ciudad, t.latitud, t.longitud
        ORDER BY ventas_totales DESC
    """
    return ejecutar_select(sql)