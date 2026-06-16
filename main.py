import subprocess
import sys
import os

def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_menu():
    limpiar_pantalla()
    print("="*50)
    print("   🏪 ELECTROSTOCK ANALYTICS")
    print("="*50)
    print("")
    print("   📦 GESTIÓN DE DATOS")
    print("   " + "-"*35)
    print("   1. Gestionar PROVEEDORES")
    print("   2. Gestionar TIENDAS")
    print("   3. Gestionar PRODUCTOS")
    print("   4. Registrar VENTAS")
    print("")
    print("   📊 REPORTES")
    print("   " + "-"*35)
    print("   5. Ver estadísticas")
    print("")
    print("   0. Salir")
    print("="*50)

def ejecutar_script(script):
    script_path = os.path.join("scripts", script)
    
    if not os.path.exists(script_path):
        print(f"\n❌ Error: No se encuentra '{script_path}'")
        input("\nPresiona Enter para continuar...")
        return
    
    print(f"\n▶️ Ejecutando {script}...")
    print("-"*40)
    
    subprocess.call([sys.executable, script_path])
    
    print("\n" + "-"*40)
    input("✅ Presiona Enter para volver al menú principal...")

def ver_estadisticas():
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from database.conexion import ejecutar_select
        
        limpiar_pantalla()
        print("\n" + "="*50)
        print("   📊 ESTADÍSTICAS")
        print("="*50)
        
        proveedores = ejecutar_select("SELECT COUNT(*) FROM proveedores")
        tiendas = ejecutar_select("SELECT COUNT(*) FROM tiendas")
        productos = ejecutar_select("SELECT COUNT(*) FROM productos")
        ventas = ejecutar_select("SELECT COUNT(*) FROM ventas")
        
        print(f"\n📋 Registros:")
        print(f"   Proveedores: {proveedores[0][0] if proveedores else 0}")
        print(f"   Tiendas: {tiendas[0][0] if tiendas else 0}")
        print(f"   Productos: {productos[0][0] if productos else 0}")
        print(f"   Ventas: {ventas[0][0] if ventas else 0}")
        
        total_ventas = ejecutar_select("SELECT SUM(ingreso) FROM ventas")
        if total_ventas and total_ventas[0][0]:
            print(f"\n💰 Ventas totales: ${total_ventas[0][0]:,.2f}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\n📌 Presiona Enter para continuar...")

def main():
    if not os.path.exists("scripts"):
        print("❌ ERROR: No se encuentra la carpeta 'scripts'")
        input("\nPresiona Enter para salir...")
        sys.exit(1)
    
    while True:
        mostrar_menu()
        opcion = input("\n👉 Selecciona una opción (0-5): ").strip()
        
        if opcion == 1:
            ejecutar_script("poblar_proveedores.py")
        elif opcion == 2:
            ejecutar_script("poblar_tiendas.py")
        elif opcion == "3":
            ejecutar_script("poblar_productos.py")
        elif opcion == "4":
            ejecutar_script("poblar_ventas.py")
        elif opcion == "5":
            ver_estadisticas()
        elif opcion == "0":
            limpiar_pantalla()
            print("\n👋 ¡Gracias por usar ElectroStock Analytics!\n")
            break
        else:
            print("\n❌ Opción inválida")
            input("Presiona Enter para continuar...")

if __name__ == "__main__":
    main()