import pymysql

DB_CONFIG = {
    'host': '127.0.0.1',           
    'user': 'root',        
    'password': '040616',    
    'database': 'electrostock_db', 
    'port': 3306
}

def conectar():
    """Conectar a MySQL"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def ejecutar_insert(sql, params=None):
    """Ejecutar INSERT, UPDATE, DELETE"""
    conn = conectar()
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
        print(f"❌ Error al ejecutar: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def ejecutar_select(sql, params=None):
    """Ejecutar SELECT y retornar resultados"""
    conn = conectar()
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

def obtener_ultimo_id():
    """Obtener el último ID insertado"""
    conn = conectar()
    if not conn:
        return None
    
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT LAST_INSERT_ID()")
        return cursor.fetchone()[0]
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
    finally:
        cursor.close()
        conn.close()