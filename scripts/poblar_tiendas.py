import sys
import os

# Agregar el directorio PADRE al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.conexion import ejecutar_insert, ejecutar_select

def listar_tiendas():
    resultados = ejecutar_select("SELECT id, nombre, ciudad, gerente FROM tiendas")
    
    if resultados:
        print("\n TIENDAS REGISTRADAS:")
        print("-" * 60)
        for t in resultados:
            print(f"ID: {t[0]} | {t[1]} | {t[2]} | Gerente: {t[3] or '-'}")
        print("-" * 60)
    else:
        print("\n No hay tiendas registradas")

def agregar_tienda():
    print("\n" + "="*50)
    print("   AGREGAR NUEVA TIENDA")
    print("="*50)
    
    nombre = input("Nombre de la tienda: ").strip()
    if not nombre:
        print(" El nombre es obligatorio")
        return
    
    ciudad = input("Ciudad: ").strip()
    if not ciudad:
        print(" La ciudad es obligatoria")
        return
    
    direccion = input("Dirección: ").strip()
    gerente = input("Nombre del gerente: ").strip()
    
    print("\n Coordenadas geográficas (opcional)")
    try:
        latitud = input("Latitud (ej: 4.7110): ").strip()
        latitud = float(latitud) if latitud else None
        longitud = input("Longitud (ej: -74.0721): ").strip()
        longitud = float(longitud) if longitud else None
    except:
        latitud = None
        longitud = None
    
    print("\n--- Datos a guardar ---")
    print(f"Nombre: {nombre}")
    print(f"Ciudad: {ciudad}")
    print(f"Dirección: {direccion or '(vacío)'}")
    print(f"Gerente: {gerente or '(vacío)'}")
    
    confirmar = input("\n¿Guardar tienda? (s/n): ").lower()
    
    if confirmar == 's':
        sql = """
        INSERT INTO tiendas (nombre, ciudad, direccion, latitud, longitud, gerente)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (nombre, ciudad, direccion, latitud, longitud, gerente)
        
        if ejecutar_insert(sql, params):
            print(f"\n Tienda '{nombre}' agregada exitosamente!")
        else:
            print("\n Error al guardar la tienda")

def menu_tiendas():
    while True:
        print("\n" + "="*50)
        print("   GESTIÓN DE TIENDAS")
        print("="*50)
        print("1. Agregar nueva tienda")
        print("2. Listar tiendas")
        print("3. Volver al menú principal")
        
        opcion = input("\nSelecciona una opción: ")
        
        if opcion == "1":
            agregar_tienda()
        elif opcion == "2":
            listar_tiendas()
        elif opcion == "3":
            print("\n Volviendo al menú principal...")
            break
        else:
            print(" Opción inválida")

if __name__ == "__main__":
    menu_tiendas()