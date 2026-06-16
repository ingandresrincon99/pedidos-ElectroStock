import sys
import os

# Agregar el directorio PADRE al path para poder importar database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.conexion import ejecutar_insert, ejecutar_select

def listar_proveedores():
    """Mostrar proveedores existentes"""
    resultados = ejecutar_select("SELECT id, nombre, contacto, telefono FROM proveedores")
    
    if resultados:
        print("\n PROVEEDORES REGISTRADOS:")
        print("-" * 60)
        for p in resultados:
            print(f"ID: {p[0]} | {p[1]} | Contacto: {p[2] or '-'} | Tel: {p[3] or '-'}")
        print("-" * 60)
    else:
        print("\n No hay proveedores registrados")

def agregar_proveedor():
    """Agregar un nuevo proveedor"""
    print("\n" + "="*50)
    print("   AGREGAR NUEVO PROVEEDOR")
    print("="*50)
    
    nombre = input("Nombre del proveedor: ").strip()
    if not nombre:
        print(" El nombre es obligatorio")
        return
    
    contacto = input("Persona de contacto: ").strip()
    telefono = input("Teléfono: ").strip()
    email = input("Email: ").strip()
    
    print("\n--- Datos a guardar ---")
    print(f"Nombre: {nombre}")
    print(f"Contacto: {contacto}")
    print(f"Teléfono: {telefono}")
    print(f"Email: {email}")
    
    confirmar = input("\n¿Guardar proveedor? (s/n): ").lower()
    
    if confirmar == 's':
        sql = """
        INSERT INTO proveedores (nombre, contacto, telefono, email)
        VALUES (%s, %s, %s, %s)
        """
        params = (nombre, contacto, telefono, email)
        
        if ejecutar_insert(sql, params):
            print(f"\n Proveedor '{nombre}' agregado exitosamente!")
        else:
            print("\n Error al guardar el proveedor")

def menu_proveedores():
    while True:
        print("\n" + "="*50)
        print("   GESTIÓN DE PROVEEDORES")
        print("="*50)
        print("1. Agregar nuevo proveedor")
        print("2. Listar proveedores")
        print("3. Volver al menú principal")
        
        opcion = input("\nSelecciona una opción: ")
        
        if opcion == "1":
            agregar_proveedor()
        elif opcion == "2":
            listar_proveedores()
        elif opcion == "3":
            print("\n Volviendo al menú principal...")
            break
        else:
            print(" Opción inválida")

if __name__ == "__main__":
    menu_proveedores()