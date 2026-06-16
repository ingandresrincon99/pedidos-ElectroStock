# backend/routers/analisis.py
from fastapi import APIRouter
from backend.database.conexion import ejecutar_select

router = APIRouter()

# KPIs generales
@router.get("/kpis")
async def get_kpis():
    sql = """
        SELECT 
            (SELECT COUNT(*) FROM tiendas) as total_tiendas,
            (SELECT COUNT(*) FROM productos) as total_productos,
            (SELECT COUNT(*) FROM proveedores) as total_proveedores,
            (SELECT COUNT(*) FROM ventas) as total_ventas,
            COALESCE((SELECT SUM(ingreso) FROM ventas), 0) as ingresos_totales,
            COALESCE((SELECT SUM(ganancia) FROM ventas), 0) as ganancias_totales,
            COALESCE((SELECT COUNT(*) FROM productos WHERE stock < 10), 0) as stock_critico
    """
    resultados = ejecutar_select(sql)
    return resultados[0] if resultados else {}

# Ventas por tienda
@router.get("/ventas-por-tienda")
async def ventas_por_tienda():
    sql = """
        SELECT t.id, t.nombre as tienda, t.ciudad,
               COALESCE(SUM(v.ingreso), 0) as ventas_totales,
               COALESCE(SUM(v.ganancia), 0) as ganancias_totales,
               COUNT(v.id) as num_ventas
        FROM tiendas t
        LEFT JOIN ventas v ON t.id = v.tienda_id
        GROUP BY t.id, t.nombre, t.ciudad
        ORDER BY ventas_totales DESC
    """
    return ejecutar_select(sql)

# Productos más vendidos
@router.get("/top-productos")
async def top_productos(limit: int = 10):
    sql = f"""
        SELECT p.id, p.nombre, p.categoria,
               SUM(v.cantidad) as unidades_vendidas,
               SUM(v.ingreso) as ingreso_total,
               SUM(v.ganancia) as ganancia_total
        FROM productos p
        JOIN ventas v ON p.id = v.producto_id
        GROUP BY p.id, p.nombre, p.categoria
        ORDER BY unidades_vendidas DESC
        LIMIT {limit}
    """
    return ejecutar_select(sql)

# Ganancias por categoría
@router.get("/ganancias-por-categoria")
async def ganancias_por_categoria():
    sql = """
        SELECT p.categoria,
               SUM(v.ganancia) as ganancia_total,
               SUM(v.cantidad) as unidades_vendidas
        FROM productos p
        JOIN ventas v ON p.id = v.producto_id
        GROUP BY p.categoria
        ORDER BY ganancia_total DESC
    """
    return ejecutar_select(sql)

# Tendencia mensual
@router.get("/tendencia-mensual")
async def tendencia_mensual():
    sql = """
        SELECT 
            DATE_FORMAT(v.fecha, '%Y-%m') as mes,
            SUM(v.ingreso) as ingreso_total,
            SUM(v.ganancia) as ganancia_total,
            COUNT(v.id) as num_ventas,
            SUM(v.cantidad) as unidades_vendidas
        FROM ventas v
        GROUP BY DATE_FORMAT(v.fecha, '%Y-%m')
        ORDER BY mes ASC
    """
    return ejecutar_select(sql)

# Ventas por ciudad
@router.get("/ventas-por-ciudad")
async def ventas_por_ciudad():
    sql = """
        SELECT t.ciudad,
               COUNT(DISTINCT t.id) as num_tiendas,
               COALESCE(SUM(v.ingreso), 0) as ventas_totales,
               COALESCE(SUM(v.ganancia), 0) as ganancias_totales,
               COALESCE(COUNT(v.id), 0) as num_ventas
        FROM tiendas t
        LEFT JOIN ventas v ON t.id = v.tienda_id
        GROUP BY t.ciudad
        ORDER BY ventas_totales DESC
    """
    return ejecutar_select(sql)
@router.get("/analisis-pandas")
async def analisis_con_pandas():
    import pandas as pd
    from database.conexion import query_to_df
    
    # Cargar datos con Pandas
    df_ventas = query_to_df("SELECT * FROM ventas")
    df_productos = query_to_df("SELECT * FROM productos")
    df_tiendas = query_to_df("SELECT * FROM tiendas")
    
    # Análisis con Pandas
    ventas_por_tienda = df_ventas.groupby('tienda_id')['ingreso'].sum()
    top_productos = df_ventas.groupby('producto_id')['cantidad'].sum().sort_values(ascending=False).head(5)
    
    return {
        "ventas_por_tienda": ventas_por_tienda.to_dict(),
        "top_productos": top_productos.to_dict()
    }