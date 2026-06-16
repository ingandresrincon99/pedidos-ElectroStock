# backend/routers/proveedores.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.database.conexion import ejecutar_select, ejecutar_insert, ejecutar_update_delete

router = APIRouter()

class Proveedor(BaseModel):
    nombre: str
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None

# ==================== LISTAR ====================
@router.get("/")
async def get_proveedores():
    sql = "SELECT id, nombre, contacto, telefono, email FROM proveedores ORDER BY nombre"
    return ejecutar_select(sql)

# ==================== OBTENER UNO ====================
@router.get("/{proveedor_id}")
async def get_proveedor(proveedor_id: int):
    sql = f"SELECT id, nombre, contacto, telefono, email FROM proveedores WHERE id = {proveedor_id}"
    resultados = ejecutar_select(sql)
    if not resultados:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return resultados[0]

# ==================== CREAR ====================
@router.post("/")
async def create_proveedor(proveedor: Proveedor):
    sql = """
        INSERT INTO proveedores (nombre, contacto, telefono, email)
        VALUES (%s, %s, %s, %s)
    """
    params = (proveedor.nombre, proveedor.contacto, proveedor.telefono, proveedor.email)
    nuevo_id = ejecutar_insert(sql, params)
    
    if nuevo_id:
        return {"id": nuevo_id, "message": "Proveedor creado exitosamente"}
    raise HTTPException(status_code=500, detail="Error al crear proveedor")

# ==================== ACTUALIZAR ====================
@router.put("/{proveedor_id}")
async def update_proveedor(proveedor_id: int, proveedor: Proveedor):
    sql = """
        UPDATE proveedores 
        SET nombre = %s, contacto = %s, telefono = %s, email = %s
        WHERE id = %s
    """
    params = (proveedor.nombre, proveedor.contacto, proveedor.telefono, proveedor.email, proveedor_id)
    
    if ejecutar_update_delete(sql, params):
        return {"message": "Proveedor actualizado exitosamente"}
    raise HTTPException(status_code=500, detail="Error al actualizar proveedor")

# ==================== ELIMINAR ====================
@router.delete("/{proveedor_id}")
async def delete_proveedor(proveedor_id: int):
    # 1. Verificar si existe
    check_sql = f"SELECT id, nombre FROM proveedores WHERE id = {proveedor_id}"
    proveedor = ejecutar_select(check_sql)
    
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # 2. Verificar si tiene productos asociados
    productos_sql = f"SELECT COUNT(*) as total FROM productos WHERE proveedor_id = {proveedor_id}"
    productos = ejecutar_select(productos_sql)
    
    if productos and productos[0]['total'] > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar: tiene {productos[0]['total']} producto(s) asociado(s). Primero elimina esos productos."
        )
    
    # 3. Eliminar
    delete_sql = f"DELETE FROM proveedores WHERE id = {proveedor_id}"
    if ejecutar_update_delete(delete_sql):
        return {
            "message": f"Proveedor '{proveedor[0]['nombre']}' eliminado exitosamente",
            "id": proveedor_id
        }
    raise HTTPException(status_code=500, detail="Error al eliminar proveedor")