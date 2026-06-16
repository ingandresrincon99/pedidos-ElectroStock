# backend/app.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import datetime
import os
from typing import Optional

# Importar routers
from backend.routers import proveedores, tiendas, productos, ventas, analisis

# Configuración JWT (clave más segura)
SECRET_KEY = "electrostock_secret_key_2024_segura_32bytes"  # Ahora tiene más de 32 bytes
ALGORITHM = "HS256"
TOKEN_EXPIRATION_HOURS = 24

# Modelo para login
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

# Usuarios válidos
USUARIOS_VALIDOS = {
    "admin": {
        "password": "admin123",
        "role": "administrador"
    },
    "gerente": {
        "password": "gerente456",
        "role": "gerente"
    },
    "vendedor": {
        "password": "vendedor789",
        "role": "vendedor"
    }
}

# Crear aplicación FastAPI
app = FastAPI(
    title="ElectroStock Analytics API",
    description="API para gestión de tiendas de electrónica",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar seguridad
security = HTTPBearer()

# ========== FUNCIONES DE AUTENTICACIÓN ==========
def create_token(username: str, role: str) -> str:
    """Crear token JWT"""
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRATION_HOURS)
    payload = {
        "username": username,
        "role": role,
        "exp": expiration,
        "iat": datetime.datetime.utcnow()
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_token(token: str) -> dict:
    """Verificar token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Obtener usuario actual desde el token"""
    token = credentials.credentials
    payload = verify_token(token)
    return payload

# ========== RUTAS DE AUTENTICACIÓN ==========
@app.post("/api/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Endpoint para iniciar sesión"""
    username = login_data.username
    password = login_data.password
    
    if username in USUARIOS_VALIDOS and USUARIOS_VALIDOS[username]["password"] == password:
        role = USUARIOS_VALIDOS[username]["role"]
        token = create_token(username, role)
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            username=username,
            role=role
        )
    else:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

@app.get("/api/verify-token")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verificar si el token es válido"""
    return {"valid": True, "username": current_user["username"], "role": current_user["role"]}

@app.get("/api/logout")
async def logout():
    """Cerrar sesión"""
    return {"message": "Sesión cerrada exitosamente"}

# ========== CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS ==========
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/lib", StaticFiles(directory="frontend/lib"), name="lib")
app.mount("/public", StaticFiles(directory="public"), name="public")

# Incluir routers
app.include_router(proveedores.router, prefix="/api/proveedores", tags=["Proveedores"])
app.include_router(tiendas.router, prefix="/api/tiendas", tags=["Tiendas"])
app.include_router(productos.router, prefix="/api/productos", tags=["Productos"])
app.include_router(ventas.router, prefix="/api/ventas", tags=["Ventas"])
app.include_router(analisis.router, prefix="/api/analisis", tags=["Análisis"])

# ========== RUTAS PARA EL FRONTEND ==========
# La página principal DEBE ser el login
@app.get("/")
async def root():
    return FileResponse("frontend/login.html")

# Dashboard y demás páginas (requieren autenticación)
@app.get("/dashboard")
async def dashboard():
    return FileResponse("frontend/index.html")

@app.get("/proveedores")
async def proveedores_page():
    return FileResponse("frontend/proveedores.html")

@app.get("/tiendas")
async def tiendas_page():
    return FileResponse("frontend/tiendas.html")

@app.get("/productos")
async def productos_page():
    return FileResponse("frontend/productos.html")

@app.get("/ventas")
async def ventas_page():
    return FileResponse("frontend/ventas.html")

@app.get("/analisis")
async def analisis_page():
    return FileResponse("frontend/analisis.html")

# Ruta de salud (pública)
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "ElectroStock Analytics API funcionando"}
@app.get("/tiendas")
async def tiendas_page():
    return FileResponse("frontend/tiendas.html")
@app.get("/productos")
async def productos_page():
    return FileResponse("frontend/productos.html")
@app.get("/ventas")
async def ventas_page():
    return FileResponse("frontend/ventas.html")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)