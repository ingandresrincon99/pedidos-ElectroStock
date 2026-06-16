import sys
import os
from datetime import datetime

# Agregar el directorio PADRE al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.conexion import ejecutar_insert, ejecutar_select

def obtener_tiendas():
    return ejecutar_select("SELECT id, nombre FROM tiendas")

def obtener_productos_por_tienda(tienda_id):
    sql = f"""
    SELECT id, nombre, precio_venta, stock 
    FROM productos 
    WHERE tienda_id = {tienda_id} AND stock > 0
    """
    return ejecutar_select(sql)

def listar_ventas():
    sql = """
    SELECT v.id, v.fecha, p.nombre, t.nombre, v.cantidad, v.ingreso
    FROM ventas v
    JOIN productos p ON v.producto_id = p.id
    JOIN tiendas t ON v.tienda_id = t.id
    ORDER BY v.fecha DESC
    LIMIT 20
    """
    resultados = ejecutar_select(sql)
    
    if resultados:
        print("\n ÚLTIMAS VENTAS:")
        print("-" * 80)
        for v in resultados:
            print(f"ID: {v[0]} | {v[1]} | {v[2]} | {v[3]} | {v[4]} und | ${v[5]:.2f}")
    else:
        print("\n No hay ventas registradas")

def registrar_venta():
    print("\n" + "="*50)
    print("   REGISTRAR VENTA")
    print("="*50)
    
    tiendas = obtener_tiendas()
    if not tiendas:
        print("\n No hay tiendas registradas")
        return
    
    print("\n🏪 Tiendas disponibles:")
    for t in tiendas:
        print(f"   {t[0]}. {t[1]}")
    
    try:
        tienda_id = int(input("ID de la tienda: "))
    except:
        print(" ID inválido")
        return
    
    productos = obtener_productos_por_tienda(tienda_id)
    if not productos:
        print(f"\n No hay productos con stock en esta tienda")
        return
    
    print("\n📦 Productos disponibles:")
    for p in productos:
        print(f"   {p[0]}. {p[1]} | ${p[2]:.2f} | Stock: {p[3]}")
    
    try:
        producto_id = int(input("ID del producto: "))
    except:
        print(" ID inválido")
        return
    
    producto = None
    for p in productos:
        if p[0] == producto_id:
            producto = p
            break
    
    if not producto:
        print(" Producto no encontrado")
        return
    
    nombre_producto = producto[1]
    precio = producto[2]
    stock_max = producto[3]
    
    print(f"\n Producto: {nombre_producto}")
    print(f" Precio: ${precio:.2f}")
    print(f" Stock: {stock_max}")
    
    try:
        cantidad = int(input("Cantidad: "))
        if cantidad > stock_max:
            print(f" Stock insuficiente. Solo hay {stock_max}")
            return
    except:
        print(" Cantidad inválida")
        return
    
    fecha_str = input("Fecha (YYYY-MM-DD) o Enter para hoy: ").strip()
    if fecha_str:
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except:
            print(" Fecha inválida")
            return
    else:
        fecha = datetime.now().date()
    
    ingreso = cantidad * precio
    
    # Obtener precio de compra
    sql_compra = f"SELECT precio_compra FROM productos WHERE id = {producto_id}"
    resultado = ejecutar_select(sql_compra)
    ganancia = cantidad * (precio - resultado[0][0]) if resultado else 0
    
    print(f"\n--- Resumen ---")
    print(f"Total: ${ingreso:.2f}")
    print(f"Ganancia: ${ganancia:.2f}")
    
    confirmar = input("\n¿Registrar venta? (s/n): ").lower()
    
    if confirmar == 's':
        sql_venta = """
        INSERT INTO ventas (producto_id, tienda_id, fecha, cantidad, ingreso, ganancia)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (producto_id, tienda_id, fecha, cantidad, ingreso, ganancia)
        
        if ejecutar_insert(sql_venta, params):
            sql_update = f"UPDATE productos SET stock = stock - {cantidad} WHERE id = {producto_id}"
            ejecutar_insert(sql_update)
            print(f"\n Venta registrada! Total: ${ingreso:.2f}")
        else:
            print("\n Error al registrar venta")

def menu_ventas():
    while True:
        print("\n" + "="*50)
        print("   GESTIÓN DE VENTAS")
        print("="*50)
        print("1. Registrar nueva venta")
        print("2. Ver últimas ventas")
        print("3. Volver al menú principal")
        
        opcion = input("\nSelecciona una opción: ")
        
        if opcion == "1":
            registrar_venta()
        elif opcion == "2":
            listar_ventas()
        elif opcion == "3":
            print("\n Volviendo al menú principal...")
            break
        else:
            print(" Opción inválida")

if __name__ == "__main__":
    menu_ventas()