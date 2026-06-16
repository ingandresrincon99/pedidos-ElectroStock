# run.py
import uvicorn
import os
import sys

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("=" * 50)
    print("   🏪 ELECTROSTOCK ANALYTICS")
    print("=" * 50)
    print("   Servidor iniciando...")
    print("   Frontend: http://localhost:8000")
    print("   API Docs: http://localhost:8000/docs")
    print("=" * 50)
    print()
    
    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )