// API Base URL
const API_BASE = 'http://localhost:8000/api';

// ========== FUNCIONES DE AUTENTICACIÓN ==========
function getToken() {
    return localStorage.getItem('token');
}

function isAuthenticated() {
    return getToken() !== null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.href = '/';
}

// ========== FUNCIONES GENÉRICAS CON AUTENTICACIÓN ==========
async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Token expirado o inválido
            logout();
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error en la petición');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========== FUNCIONES DE AUTENTICACIÓN ==========
async function login(username, password) {
    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        return data;
    } else {
        throw new Error(data.detail || 'Error de autenticación');
    }
}

async function verifyToken() {
    return await fetchAPI('/verify-token');
}

// ========== PROVEEDORES ==========
async function getProveedores() {
    return await fetchAPI('/proveedores/');
}

async function createProveedor(proveedor) {
    return await fetchAPI('/proveedores/', {
        method: 'POST',
        body: JSON.stringify(proveedor)
    });
}

async function deleteProveedor(id) {
    return await fetchAPI(`/proveedores/${id}`, {
        method: 'DELETE'
    });
}

// ========== TIENDAS ==========
async function getTiendas() {
    return await fetchAPI('/tiendas/');
}

async function createTienda(tienda) {
    return await fetchAPI('/tiendas/', {
        method: 'POST',
        body: JSON.stringify(tienda)
    });
}

async function deleteTienda(id) {
    return await fetchAPI(`/tiendas/${id}`, {
        method: 'DELETE'
    });
}

async function getRendimientoMapa() {
    return await fetchAPI('/tiendas/rendimiento/mapa');
}

// ========== PRODUCTOS ==========
async function getProductos(tiendaId = null, categoria = null) {
    let url = '/productos/';
    const params = [];
    if (tiendaId) params.push(`tienda_id=${tiendaId}`);
    if (categoria) params.push(`categoria=${categoria}`);
    if (params.length) url += '?' + params.join('&');
    return await fetchAPI(url);
}

async function createProducto(producto) {
    return await fetchAPI('/productos/', {
        method: 'POST',
        body: JSON.stringify(producto)
    });
}

async function updateStock(productoId, stock) {
    return await fetchAPI(`/productos/${productoId}/stock?stock=${stock}`, {
        method: 'PATCH'
    });
}

async function deleteProducto(id) {
    return await fetchAPI(`/productos/${id}`, {
        method: 'DELETE'
    });
}

async function getStockCritico(limite = 10) {
    return await fetchAPI(`/productos/stock/critico?limite=${limite}`);
}

// ========== VENTAS ==========
async function getVentas(limit = 50) {
    return await fetchAPI(`/ventas/?limit=${limit}`);
}

async function createVenta(venta) {
    return await fetchAPI('/ventas/', {
        method: 'POST',
        body: JSON.stringify(venta)
    });
}

async function deleteVenta(id) {
    return await fetchAPI(`/ventas/${id}`, {
        method: 'DELETE'
    });
}

// ========== ANÁLISIS ==========
async function getKPIs() {
    return await fetchAPI('/analisis/kpis');
}

async function getVentasPorTienda() {
    return await fetchAPI('/analisis/ventas-por-tienda');
}

async function getTopProductos(limit = 10) {
    return await fetchAPI(`/analisis/top-productos?limit=${limit}`);
}

async function getGananciasPorCategoria() {
    return await fetchAPI('/analisis/ganancias-por-categoria');
}

async function getTendenciaMensual() {
    return await fetchAPI('/analisis/tendencia-mensual');
}

async function getVentasPorCiudad() {
    return await fetchAPI('/analisis/ventas-por-ciudad');
}