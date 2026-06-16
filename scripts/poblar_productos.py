import sys
import os

# Agregar el directorio PADRE al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.conexion import ejecutar_insert, ejecutar_select

def obtener_tiendas():
    return ejecutar_select("SELECT id, nombre, ciudad FROM tiendas")

def obtener_proveedores():
    return ejecutar_select("SELECT id, nombre FROM proveedores")

def listar_productos():
    sql = """
    SELECT p.id, p.nombre, p.categoria, p.stock, p.precio_venta, t.nombre as tienda
    FROM productos p
    JOIN tiendas t ON p.tienda_id = t.id
    """
    resultados = ejecutar_select(sql)
    
    if resultados:
        print("\n PRODUCTOS REGISTRADOS:")
        print("-" * 80)
        for p in resultados:
            print(f"ID: {p[0]} | {p[1]} | {p[2]} | Stock: {p[3]} | ${p[4]} | Tienda: {p[5]}")
        print("-" * 80)
    else:
        print("\n No hay productos registrados")

def agregar_producto():
    print("\n" + "="*50)
    print("   AGREGAR NUEVO PRODUCTO")
    print("="*50)
    
    # Verificar que hay tiendas
    tiendas = obtener_tiendas()
    if not tiendas:
        print("\n Primero debes agregar una tienda")
        return
    
    # Verificar que hay proveedores
    proveedores = obtener_proveedores()
    if not proveedores:
        print("\n Primero debes agregar un proveedor")
        return
    
    nombre = input("Nombre del producto: ").strip()
    if not nombre:
        print(" El nombre es obligatorio")
        return
    
    categorias = ["Arduino", "ESP32", "Sensores", "LEDs", "Resistencias", "Modulos", "Herramientas"]
    print("\n Categorías:")
    for i, cat in enumerate(categorias, 1):
        print(f"   {i}. {cat}")
    
    try:
        opcion = int(input("Selecciona categoría (1-7): "))
        categoria = categorias[opcion - 1]
    except:
        print(" Opción inválida")
        return
    
    try:
        precio_compra = float(input("Precio de compra: "))
        precio_venta = float(input("Precio de venta: "))
    except:
        print(" Precio inválido")
        return
    
    try:
        stock = int(input("Stock inicial: "))
    except:
        stock = 0
    
    print("\n Tiendas disponibles:")
    for t in tiendas:
        print(f"   {t[0]}. {t[1]} - {t[2]}")
    
    try:
        tienda_id = int(input("ID de la tienda: "))
    except:
        print(" ID inválido")
        return
    
    print("\n Proveedores:")
    for prov in proveedores:
        print(f"   {prov[0]}. {prov[1]}")
    
    try:
        proveedor_id = int(input("ID del proveedor: "))
    except:
        print(" ID inválido")
        return
    
    confirmar = input("\n¿Guardar producto? (s/n): ").lower()
    
    if confirmar == 's':
        sql = """
        INSERT INTO productos (nombre, categoria, stock, precio_compra, precio_venta, tienda_id, proveedor_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (nombre, categoria, stock, precio_compra, precio_venta, tienda_id, proveedor_id)
        
        if ejecutar_insert(sql, params):
            print(f"\n Producto '{nombre}' agregado exitosamente!")
        else:
            print("\n Error al guardar el producto")

def menu_productos():
    while True:
        print("\n" + "="*50)
        print("   GESTIÓN DE PRODUCTOS")
        print("="*50)
        print("1. Agregar nuevo producto")
        print("2. Listar productos")
        print("3. Volver al menú principal")
        
        opcion = input("\nSelecciona una opción: ")
        
        if opcion == "1":
            agregar_producto()
        elif opcion == "2":
            listar_productos()
        elif opcion == "3":
            print("\n Volviendo al menú principal...")
            break
        else:
            print(" Opción inválida")

if __name__ == "__main__":
    menu_productos()