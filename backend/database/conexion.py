# backend/database/conexion.py
import pymysql
from typing import Optional, List, Tuple, Dict, Any

# Configuración de la base de datos (USA TUS DATOS)
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '040616',
    'database': 'electrostock_db',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor  # Para obtener diccionarios en lugar de tuplas
}

def get_connection():
    """Obtener conexión a MySQL"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def ejecutar_select(sql: str, params: tuple = None) -> List[Dict]:
    """Ejecutar SELECT y retornar lista de diccionarios"""
    conn = get_connection()
    if not conn:
        return []
    
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor.fetchall()
    except Exception as e:
        print(f"❌ Error en consulta: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def ejecutar_insert(sql: str, params: tuple = None) -> int:
    """Ejecutar INSERT y retornar ID insertado"""
    conn = get_connection()
    if not conn:
        return 0
    
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"❌ Error en INSERT: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()

def ejecutar_update_delete(sql: str, params: tuple = None) -> bool:
    """Ejecutar UPDATE o DELETE"""
    conn = get_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        conn.commit()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def probar_conexion():
    """Probar conexión y mostrar info"""
    conn = get_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT VERSION() as version, DATABASE() as db")
        resultado = cursor.fetchone()
        print(f"✅ Conectado a MySQL {resultado['version']}")
        print(f"📊 Base de datos: {resultado['db']}")
        
        cursor.execute("SHOW TABLES")
        tablas = cursor.fetchall()
        if tablas:
            print(f"📋 Tablas encontradas: {len(tablas)}")
            for tabla in tablas:
                print(f"   - {list(tabla.values())[0]}")
        else:
            print("⚠️ No hay tablas en la base de datos")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    probar_conexion()