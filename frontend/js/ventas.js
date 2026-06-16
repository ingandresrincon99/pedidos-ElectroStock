// ========== VARIABLES GLOBALES ==========
let ventaAEliminar = null;
let productosPorTienda = {};

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
        
        // Configurar fecha por defecto
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fecha').value = hoy;
        
        // Cargar selectores
        await cargarTiendas();
        await cargarFiltroTiendas();
        await cargarVentas();
        
        mostrarInfoUsuario();
        actualizarFecha();
        
        // Event listeners
        document.getElementById('tienda_id').addEventListener('change', cargarProductosPorTienda);
        document.getElementById('producto_id').addEventListener('change', mostrarInfoProducto);
        document.getElementById('cantidad').addEventListener('input', calcularResumen);
        document.getElementById('formVenta').addEventListener('submit', registrarVenta);
        
        document.getElementById('btnFiltrar').addEventListener('click', filtrarVentas);
        document.getElementById('btnLimpiar').addEventListener('click', limpiarFiltros);
        
        // Modal eliminar
        document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
        document.getElementById('btnConfirmar').addEventListener('click', confirmarEliminar);
        document.querySelector('.modal-close').addEventListener('click', cerrarModal);
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modalEliminar');
            if (e.target === modal) cerrarModal();
        });
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        localStorage.clear();
        window.location.href = '/';
    }
});

// ========== CARGAR TIENDAS ==========
async function cargarTiendas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar tiendas');
        
        const tiendas = await response.json();
        const selectTienda = document.getElementById('tienda_id');
        
        selectTienda.innerHTML = '<option value="">Seleccionar tienda</option>';
        tiendas.forEach(tienda => {
            selectTienda.innerHTML += `<option value="${tienda.id}">${tienda.nombre} - ${tienda.ciudad}</option>`;
        });
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar tiendas', 'error');
    }
}

async function cargarFiltroTiendas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar tiendas');
        
        const tiendas = await response.json();
        const selectFiltro = document.getElementById('filtro_tienda');
        
        selectFiltro.innerHTML = '<option value="">Todas las tiendas</option>';
        tiendas.forEach(tienda => {
            selectFiltro.innerHTML += `<option value="${tienda.id}">${tienda.nombre} - ${tienda.ciudad}</option>`;
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// ========== CARGAR PRODUCTOS POR TIENDA ==========
async function cargarProductosPorTienda() {
    const tiendaId = document.getElementById('tienda_id').value;
    const selectProducto = document.getElementById('producto_id');
    const productoInfo = document.getElementById('producto-info');
    const resumenVenta = document.getElementById('resumen-venta');
    
    if (!tiendaId) {
        selectProducto.innerHTML = '<option value="">Primero seleccione una tienda</option>';
        selectProducto.disabled = true;
        productoInfo.style.display = 'none';
        resumenVenta.style.display = 'none';
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/productos/?tienda_id=${tiendaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar productos');
        
        const productos = await response.json();
        productosPorTienda = {};
        
        selectProducto.innerHTML = '<option value="">Seleccionar producto</option>';
        selectProducto.disabled = false;
        
        productos.forEach(producto => {
            if (producto.stock > 0) {
                selectProducto.innerHTML += `<option value="${producto.id}" data-precio="${producto.precio_venta}" data-stock="${producto.stock}" data-nombre="${producto.nombre}" data-precio-compra="${producto.precio_compra}">${producto.nombre} - Stock: ${producto.stock} - $${producto.precio_venta}</option>`;
                productosPorTienda[producto.id] = producto;
            }
        });
        
        if (productos.filter(p => p.stock > 0).length === 0) {
            selectProducto.innerHTML = '<option value="">No hay productos con stock</option>';
            selectProducto.disabled = true;
        }
        
        productoInfo.style.display = 'none';
        resumenVenta.style.display = 'none';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar productos', 'error');
    }
}

// ========== MOSTRAR INFO PRODUCTO ==========
function mostrarInfoProducto() {
    const selectProducto = document.getElementById('producto_id');
    const selectedOption = selectProducto.options[selectProducto.selectedIndex];
    const productoInfo = document.getElementById('producto-info');
    const resumenVenta = document.getElementById('resumen-venta');
    const cantidad = document.getElementById('cantidad');
    
    if (!selectProducto.value) {
        productoInfo.style.display = 'none';
        resumenVenta.style.display = 'none';
        return;
    }
    
    const precio = parseFloat(selectedOption.dataset.precio);
    const stock = parseInt(selectedOption.dataset.stock);
    const nombre = selectedOption.dataset.nombre;
    const precioCompra = parseFloat(selectedOption.dataset.precioCompra);
    const gananciaUnidad = precio - precioCompra;
    
    document.getElementById('precio-producto').textContent = precio.toFixed(2);
    document.getElementById('stock-producto').textContent = stock;
    document.getElementById('ganancia-unidad').textContent = gananciaUnidad.toFixed(2);
    
    productoInfo.style.display = 'block';
    
    // Calcular resumen si hay cantidad
    if (cantidad.value && parseInt(cantidad.value) > 0) {
        calcularResumen();
    }
}

// ========== CALCULAR RESUMEN ==========
function calcularResumen() {
    const selectProducto = document.getElementById('producto_id');
    const selectedOption = selectProducto.options[selectProducto.selectedIndex];
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const resumenVenta = document.getElementById('resumen-venta');
    
    if (!selectProducto.value || !cantidad || cantidad <= 0) {
        resumenVenta.style.display = 'none';
        return;
    }
    
    const precio = parseFloat(selectedOption.dataset.precio);
    const stock = parseInt(selectedOption.dataset.stock);
    const nombre = selectedOption.dataset.nombre;
    const precioCompra = parseFloat(selectedOption.dataset.precioCompra);
    
    if (cantidad > stock) {
        mostrarNotificacion(`Stock insuficiente. Solo hay ${stock} unidades`, 'error');
        document.getElementById('cantidad').value = stock;
        calcularResumen();
        return;
    }
    
    const total = cantidad * precio;
    const ganancia = cantidad * (precio - precioCompra);
    
    document.getElementById('resumen-producto').textContent = nombre;
    document.getElementById('resumen-cantidad').textContent = cantidad;
    document.getElementById('resumen-total').textContent = total.toFixed(2);
    document.getElementById('resumen-ganancia').textContent = ganancia.toFixed(2);
    
    resumenVenta.style.display = 'block';
}

// ========== REGISTRAR VENTA ==========
async function registrarVenta(e) {
    e.preventDefault();
    
    const tiendaId = document.getElementById('tienda_id').value;
    const productoId = document.getElementById('producto_id').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const fecha = document.getElementById('fecha').value;
    
    if (!tiendaId || !productoId || !cantidad || cantidad <= 0) {
        mostrarNotificacion('Complete todos los campos', 'error');
        return;
    }
    
    const venta = { producto_id: parseInt(productoId), tienda_id: parseInt(tiendaId), fecha, cantidad };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/ventas/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(venta)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al registrar venta');
        }
        
        const result = await response.json();
        
        // Mostrar éxito
        mostrarNotificacion(`✅ Venta registrada! Total: $${result.ingreso.toFixed(2)}`, 'success');
        
        // Limpiar formulario
        document.getElementById('producto_id').value = '';
        document.getElementById('cantidad').value = '';
        document.getElementById('producto-info').style.display = 'none';
        document.getElementById('resumen-venta').style.display = 'none';
        
        // Recargar productos de la tienda
        await cargarProductosPorTienda();
        await cargarVentas();
        
        // Aplicar filtros actuales
        filtrarVentas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ========== CARGAR VENTAS ==========
async function cargarVentas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/ventas/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar ventas');
        
        const ventas = await response.json();
        const tbody = document.getElementById('ventas-body');
        
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay ventas registradas</td</tr>';
            return;
        }
        
        tbody.innerHTML = ventas.map(venta => `
            <tr>
                <td>${venta.id}</td>
                <td>${venta.fecha}</td>
                <td><strong>${escapeHtml(venta.producto)}</strong></td>
                <td>${escapeHtml(venta.tienda)}</td>
                <td>${venta.cantidad}</td>
                <td><strong>$${venta.ingreso.toFixed(2)}</strong></td>
                <td class="ganancia">$${venta.ganancia.toFixed(2)}</td>
                <td>
                    <button class="btn btn-delete" onclick="mostrarModalEliminar(${venta.id}, '${escapeHtml(venta.producto)}', ${venta.cantidad})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                 </td>
             </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar ventas', 'error');
    }
}

// ========== FILTRAR VENTAS ==========
async function filtrarVentas() {
    const fechaDesde = document.getElementById('fecha_desde').value;
    const fechaHasta = document.getElementById('fecha_hasta').value;
    const tiendaId = document.getElementById('filtro_tienda').value;
    
    try {
        const token = localStorage.getItem('token');
        let url = 'http://localhost:8000/api/ventas/';
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al filtrar ventas');
        
        let ventas = await response.json();
        
        // Filtrar por fecha
        if (fechaDesde) {
            ventas = ventas.filter(v => v.fecha >= fechaDesde);
        }
        if (fechaHasta) {
            ventas = ventas.filter(v => v.fecha <= fechaHasta);
        }
        if (tiendaId) {
            // Necesitamos obtener las ventas por tienda
            const tiendaResponse = await fetch(`http://localhost:8000/api/ventas/tienda/${tiendaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tiendaResponse.ok) {
                ventas = await tiendaResponse.json();
                // Aplicar filtros de fecha después
                if (fechaDesde) ventas = ventas.filter(v => v.fecha >= fechaDesde);
                if (fechaHasta) ventas = ventas.filter(v => v.fecha <= fechaHasta);
            }
        }
        
        const tbody = document.getElementById('ventas-body');
        
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay ventas en el período seleccionado</td></tr>';
            document.getElementById('totales-filtro').style.display = 'none';
            return;
        }
        
        tbody.innerHTML = ventas.map(venta => `
             <tr>
                 <td>${venta.id}</td>
                 <td>${venta.fecha}</td>
                 <td><strong>${escapeHtml(venta.producto)}</strong></td>
                 <td>${escapeHtml(venta.tienda)}</td>
                 <td>${venta.cantidad}</td>
                 <td><strong>$${venta.ingreso.toFixed(2)}</strong></td>
                 <td class="ganancia">$${venta.ganancia.toFixed(2)}</td>
                 <td>
                     <button class="btn btn-delete" onclick="mostrarModalEliminar(${venta.id}, '${escapeHtml(venta.producto)}', ${venta.cantidad})">
                         <i class="fas fa-trash"></i> Eliminar
                     </button>
                 </td>
             </tr>
        `).join('');
        
        // Mostrar totales
        const totalVentas = ventas.reduce((sum, v) => sum + v.ingreso, 0);
        const totalGanancias = ventas.reduce((sum, v) => sum + v.ganancia, 0);
        const totalUnidades = ventas.reduce((sum, v) => sum + v.cantidad, 0);
        
        document.getElementById('total-ventas-filtro').textContent = totalVentas.toFixed(2);
        document.getElementById('total-ganancias-filtro').textContent = totalGanancias.toFixed(2);
        document.getElementById('total-unidades-filtro').textContent = totalUnidades;
        document.getElementById('totales-filtro').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al filtrar ventas', 'error');
    }
}

function limpiarFiltros() {
    document.getElementById('fecha_desde').value = '';
    document.getElementById('fecha_hasta').value = '';
    document.getElementById('filtro_tienda').value = '';
    cargarVentas();
    document.getElementById('totales-filtro').style.display = 'none';
}

// ========== ELIMINAR VENTA ==========
window.mostrarModalEliminar = function(id, producto, cantidad) {
    ventaAEliminar = { id, producto, cantidad };
    document.getElementById('venta-info').innerHTML = `Producto: "${producto}"<br>Cantidad: ${cantidad} unidades`;
    document.getElementById('modalEliminar').style.display = 'block';
};

function cerrarModal() {
    document.getElementById('modalEliminar').style.display = 'none';
    ventaAEliminar = null;
}

async function confirmarEliminar() {
    if (!ventaAEliminar) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/ventas/${ventaAEliminar.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al eliminar');
        }
        
        mostrarNotificacion(`Venta eliminada. Se devolvieron ${ventaAEliminar.cantidad} unidades al stock.`, 'success');
        cerrarModal();
        await cargarVentas();
        filtrarVentas();
        
        // Recargar productos si la tienda está seleccionada
        const tiendaId = document.getElementById('tienda_id').value;
        if (tiendaId) {
            await cargarProductosPorTienda();
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
        cerrarModal();
    }
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