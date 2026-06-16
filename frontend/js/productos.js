// ========== VARIABLES GLOBALES ==========
let productoAEliminar = null;
let productoActualizarStock = null;

// ========== VERIFICAR AUTENTICACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/verify-token', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        
        // Cargar selects
        await cargarTiendasSelect();
        await cargarProveedoresSelect();
        
        // Cargar datos
        await cargarProductos();
        mostrarInfoUsuario();
        actualizarFecha();
        
        // Configurar event listeners
        document.getElementById('formProducto').addEventListener('submit', agregarProducto);
        document.getElementById('filtro_tienda').addEventListener('change', () => cargarProductos());
        document.getElementById('filtro_categoria').addEventListener('change', () => cargarProductos());
        document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
        
        // Modal stock
        document.getElementById('btnCancelarStock').addEventListener('click', cerrarModalStock);
        document.getElementById('btnConfirmarStock').addEventListener('click', confirmarActualizarStock);
        document.querySelector('.modal-close-stock').addEventListener('click', cerrarModalStock);
        
        // Modal eliminar
        document.getElementById('btnCancelar').addEventListener('click', cerrarModalEliminar);
        document.getElementById('btnConfirmar').addEventListener('click', confirmarEliminar);
        document.querySelectorAll('.modal-close').forEach(el => {
            el.addEventListener('click', cerrarModalEliminar);
        });
        
        window.addEventListener('click', (e) => {
            const modalEliminar = document.getElementById('modalEliminar');
            const modalStock = document.getElementById('modalStock');
            if (e.target === modalEliminar) cerrarModalEliminar();
            if (e.target === modalStock) cerrarModalStock();
        });
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        localStorage.clear();
        window.location.href = '/';
    }
});

// ========== CARGAR SELECTS ==========
async function cargarTiendasSelect() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar tiendas');
        
        const tiendas = await response.json();
        const selectTienda = document.getElementById('tienda_id');
        const selectFiltro = document.getElementById('filtro_tienda');
        
        selectTienda.innerHTML = '<option value="">Seleccionar tienda</option>';
        selectFiltro.innerHTML = '<option value="">Todas las tiendas</option>';
        
        tiendas.forEach(tienda => {
            selectTienda.innerHTML += `<option value="${tienda.id}">${tienda.nombre} - ${tienda.ciudad}</option>`;
            selectFiltro.innerHTML += `<option value="${tienda.id}">${tienda.nombre} - ${tienda.ciudad}</option>`;
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarProveedoresSelect() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/proveedores/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar proveedores');
        
        const proveedores = await response.json();
        const selectProveedor = document.getElementById('proveedor_id');
        
        selectProveedor.innerHTML = '<option value="">Seleccionar proveedor</option>';
        
        proveedores.forEach(proveedor => {
            selectProveedor.innerHTML += `<option value="${proveedor.id}">${proveedor.nombre}</option>`;
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ========== CARGAR PRODUCTOS ==========
async function cargarProductos() {
    try {
        const token = localStorage.getItem('token');
        const tiendaId = document.getElementById('filtro_tienda').value;
        const categoria = document.getElementById('filtro_categoria').value;
        
        let url = 'http://localhost:8000/api/productos/';
        const params = [];
        if (tiendaId) params.push(`tienda_id=${tiendaId}`);
        if (categoria) params.push(`categoria=${categoria}`);
        if (params.length) url += '?' + params.join('&');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        const tbody = document.getElementById('productos-body');
        
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No hay productos registrados</td><tr>';
            return;
        }
        
        tbody.innerHTML = productos.map(producto => {
            const ganancia = producto.precio_venta - producto.precio_compra;
            const isStockCritico = producto.stock < 10;
            const rowClass = isStockCritico ? 'stock-critico' : '';
            
            return `
                <tr class="${rowClass}">
                    <td>${producto.id}</td>
                    <td><strong>${escapeHtml(producto.nombre)}</strong></td>
                    <td><span class="categoria-badge categoria-${producto.categoria}">${producto.categoria}</span></td>
                    <td class="stock-value">${producto.stock} ${isStockCritico ? '⚠️' : ''}</td>
                    <td>$${producto.precio_compra.toFixed(2)}</td>
                    <td>$${producto.precio_venta.toFixed(2)}</td>
                    <td style="color: ${ganancia > 0 ? '#4caf50' : '#f44336'}">$${ganancia.toFixed(2)}</td>
                    <td>${escapeHtml(producto.tienda)}</td>
                    <td>${escapeHtml(producto.proveedor)}</td>
                    <td>
                        <button class="btn-update-stock" onclick="mostrarModalStock(${producto.id}, '${escapeHtml(producto.nombre)}', ${producto.stock})">
                            <i class="fas fa-edit"></i> Stock
                        </button>
                        <button class="btn btn-delete" onclick="mostrarModalEliminar(${producto.id}, '${escapeHtml(producto.nombre)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar productos', 'error');
    }
}

// ========== AGREGAR PRODUCTO ==========
async function agregarProducto(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoria').value;
    const precio_compra = parseFloat(document.getElementById('precio_compra').value) || 0;
    const precio_venta = parseFloat(document.getElementById('precio_venta').value);
    const stock = parseInt(document.getElementById('stock').value) || 0;
    const tienda_id = parseInt(document.getElementById('tienda_id').value);
    const proveedor_id = parseInt(document.getElementById('proveedor_id').value);
    
    if (!nombre || !categoria || !precio_venta || !tienda_id || !proveedor_id) {
        mostrarNotificacion('Complete todos los campos obligatorios', 'error');
        return;
    }
    
    if (precio_venta <= precio_compra) {
        mostrarNotificacion('El precio de venta debe ser mayor al de compra', 'error');
        return;
    }
    
    const producto = { nombre, categoria, stock, precio_compra, precio_venta, tienda_id, proveedor_id };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/productos/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(producto)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al guardar');
        }
        
        mostrarNotificacion('Producto agregado exitosamente', 'success');
        document.getElementById('formProducto').reset();
        await cargarProductos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ========== ACTUALIZAR STOCK ==========
window.mostrarModalStock = function(id, nombre, stockActual) {
    productoActualizarStock = { id, nombre, stockActual };
    document.getElementById('stock-producto-nombre').textContent = nombre;
    document.getElementById('stock-actual').textContent = stockActual;
    document.getElementById('nuevo-stock').value = stockActual;
    document.getElementById('modalStock').style.display = 'block';
};

function cerrarModalStock() {
    document.getElementById('modalStock').style.display = 'none';
    productoActualizarStock = null;
}

async function confirmarActualizarStock() {
    if (!productoActualizarStock) return;
    
    const nuevoStock = parseInt(document.getElementById('nuevo-stock').value);
    
    if (isNaN(nuevoStock) || nuevoStock < 0) {
        mostrarNotificacion('Stock inválido', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/productos/${productoActualizarStock.id}/stock?stock=${nuevoStock}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al actualizar stock');
        }
        
        mostrarNotificacion(`Stock actualizado de ${productoActualizarStock.stockActual} a ${nuevoStock}`, 'success');
        cerrarModalStock();
        await cargarProductos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ========== ELIMINAR PRODUCTO ==========
window.mostrarModalEliminar = function(id, nombre) {
    productoAEliminar = { id, nombre };
    document.getElementById('producto-nombre').textContent = `"${nombre}"`;
    document.getElementById('modalEliminar').style.display = 'block';
};

function cerrarModalEliminar() {
    document.getElementById('modalEliminar').style.display = 'none';
    productoAEliminar = null;
}

async function confirmarEliminar() {
    if (!productoAEliminar) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/productos/${productoAEliminar.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al eliminar');
        }
        
        mostrarNotificacion(`Producto "${productoAEliminar.nombre}" eliminado exitosamente`, 'success');
        cerrarModalEliminar();
        await cargarProductos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
        cerrarModalEliminar();
    }
}

// ========== FILTROS ==========
function limpiarFiltros() {
    document.getElementById('filtro_tienda').value = '';
    document.getElementById('filtro_categoria').value = '';
    cargarProductos();
}

// ========== MOSTRAR INFO USUARIO ==========
function mostrarInfoUsuario() {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    const headerInfo = document.querySelector('.header-info');
    if (headerInfo && !document.querySelector('.user-info')) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>${username || 'Usuario'} (${role || 'rol'})</span>
            <button onclick="cerrarSesion()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
        headerInfo.appendChild(userInfo);
    }
}

window.cerrarSesion = function() {
    localStorage.clear();
    window.location.href = '/';
};

// ========== NOTIFICACIONES ==========
function mostrarNotificacion(mensaje, tipo) {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${mensaje}</span>`;
    
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notificacion);
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// ========== UTILIDADES ==========
function actualizarFecha() {
    const fechaElement = document.getElementById('fecha-actual');
    if (fechaElement) {
        const hoy = new Date();
        fechaElement.textContent = hoy.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}