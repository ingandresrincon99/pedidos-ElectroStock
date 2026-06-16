import sys
import os

# Agregar el directorio padre al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.conexion import conectar

def crear_tablas():
    """Crear todas las tablas necesarias"""
    
    print("📋 Creando tablas en electrostock_db...")
    print("="*50)
    
    conn = conectar()
    if not conn:
        print("❌ No se pudo conectar a la base de datos")
        return False
    
    cursor = conn.cursor()
    
    # SQL para crear tablas (en orden correcto)
    tablas_sql = [
        # Tabla proveedores
        """
        CREATE TABLE IF NOT EXISTS proveedores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            contacto VARCHAR(100),
            telefono VARCHAR(20),
            email VARCHAR(100)
        )
        """,
        
        # Tabla tiendas
        """
        CREATE TABLE IF NOT EXISTS tiendas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            ciudad VARCHAR(100) NOT NULL,
            direccion VARCHAR(255),
            latitud DECIMAL(10, 8),
            longitud DECIMAL(11, 8),
            gerente VARCHAR(100),
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        
        # Tabla productos
        """
        CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            categoria ENUM('Arduino', 'ESP32', 'Sensores', 'LEDs', 'Resistencias', 'Modulos', 'Herramientas') NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            precio_compra DECIMAL(10, 2) NOT NULL,
            precio_venta DECIMAL(10, 2) NOT NULL,
            proveedor_id INT,
            tienda_id INT NOT NULL,
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
            FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
        )
        """,
        
        # Tabla ventas
        """
        CREATE TABLE IF NOT EXISTS ventas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            producto_id INT NOT NULL,
            tienda_id INT NOT NULL,
            fecha DATE NOT NULL,
            cantidad INT NOT NULL,
            ingreso DECIMAL(10, 2) NOT NULL,
            ganancia DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
            FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE
        )
        """
    ]
    
    try:
        for sql in tablas_sql:
            cursor.execute(sql)
            print("✅ Tabla creada/verificada")
        
        conn.commit()
        print("\n🎉 Todas las tablas creadas exitosamente!")
        return True
        
    except Exception as e:
        print(f"❌ Error creando tablas: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def verificar_tablas():
    """Verificar que las tablas existen"""
    conn = conectar()
    if not conn:
        return
    
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    tablas = cursor.fetchall()
    
    print("\n📋 Tablas en la base de datos:")
    if tablas:
        for tabla in tablas:
            print(f"   ✅ {tabla[0]}")
    else:
        print("   ❌ No hay tablas")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    print("="*50)
    print("   CREAR TABLAS - ELECTROSTOCK")
    print("="*50)
    
    if crear_tablas():
        verificar_tablas()