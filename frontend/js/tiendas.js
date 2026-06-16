// ========== VARIABLES GLOBALES ==========
let mapaSeleccion = null;
let mapaTiendas = null;
let marcadorSeleccion = null;
let tiendaAEliminar = null;

// Coordenadas por defecto (Bogotá)
const DEFAULT_COORD = { lat: 4.7110, lng: -74.0721 };

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
        
        // Inicializar mapas
        inicializarMapaSeleccion();
        
        // Cargar datos
        await cargarTiendas();
        await cargarMapaTiendas();
        mostrarInfoUsuario();
        actualizarFecha();
        
        // Configurar event listeners
        document.getElementById('formTienda').addEventListener('submit', agregarTienda);
        document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
        document.getElementById('btnConfirmar').addEventListener('click', confirmarEliminar);
        document.getElementById('btnActualizarMapa').addEventListener('click', actualizarMapaDesdeCoordenadas);
        
        // Eventos para actualizar marcador cuando cambian coordenadas manuales
        document.getElementById('latitud').addEventListener('change', actualizarMarcadorDesdeCoordenadas);
        document.getElementById('longitud').addEventListener('change', actualizarMarcadorDesdeCoordenadas);
        
        document.querySelector('.modal-close').addEventListener('click', cerrarModal);
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modalEliminar');
            if (e.target === modal) {
                cerrarModal();
            }
        });
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        localStorage.clear();
        window.location.href = '/';
    }
});

// ========== INICIALIZAR MAPA DE SELECCIÓN ==========
function inicializarMapaSeleccion() {
    const latInicial = parseFloat(document.getElementById('latitud').value) || DEFAULT_COORD.lat;
    const lngInicial = parseFloat(document.getElementById('longitud').value) || DEFAULT_COORD.lng;
    
    mapaSeleccion = L.map('mapa').setView([latInicial, lngInicial], 13);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapaSeleccion);
    
    // Agregar marcador inicial
    actualizarMarcadorDesdeCoordenadas();
    
    // Evento de clic en el mapa
    mapaSeleccion.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        // Actualizar campos de coordenadas
        document.getElementById('latitud').value = lat.toFixed(6);
        document.getElementById('longitud').value = lng.toFixed(6);
        
        // Actualizar marcador
        actualizarMarcadorDesdeCoordenadas();
    });
}

// ========== ACTUALIZAR MARCADOR DESDE CAMPOS ==========
function actualizarMarcadorDesdeCoordenadas() {
    const lat = parseFloat(document.getElementById('latitud').value);
    const lng = parseFloat(document.getElementById('longitud').value);
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    if (marcadorSeleccion) {
        mapaSeleccion.removeLayer(marcadorSeleccion);
    }
    
    marcadorSeleccion = L.marker([lat, lng]).addTo(mapaSeleccion)
        .bindPopup(`📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup();
    
    // Centrar mapa en las coordenadas
    mapaSeleccion.setView([lat, lng], 13);
}

// ========== ACTUALIZAR MAPA DESDE COORDENADAS MANUALES ==========
function actualizarMapaDesdeCoordenadas() {
    const lat = parseFloat(document.getElementById('latitud').value);
    const lng = parseFloat(document.getElementById('longitud').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        mostrarNotificacion('Ingrese coordenadas válidas', 'error');
        return;
    }
    
    mapaSeleccion.setView([lat, lng], 15);
    actualizarMarcadorDesdeCoordenadas();
    
    mostrarNotificacion(`Mapa centrado en: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
}

// ========== CARGAR MAPA DE TIENDAS ==========
async function cargarMapaTiendas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/rendimiento/mapa', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar mapa');
        
        const tiendas = await response.json();
        
        // Inicializar mapa
        mapaTiendas = L.map('mapa-tiendas').setView([DEFAULT_COORD.lat, DEFAULT_COORD.lng], 6);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(mapaTiendas);
        
        // Agregar marcadores
        tiendas.forEach(tienda => {
            if (tienda.latitud && tienda.longitud) {
                let color = '#ffc107';
                if (tienda.rendimiento === 'alto') color = '#4caf50';
                else if (tienda.rendimiento === 'bajo') color = '#f44336';
                
                const icono = L.divIcon({
                    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [18, 18],
                    className: 'custom-marker'
                });
                
                const marcador = L.marker([tienda.latitud, tienda.longitud], { icon: icono })
                    .addTo(mapaTiendas)
                    .bindPopup(`
                        <strong>${tienda.nombre}</strong><br>
                        📍 ${tienda.ciudad}<br>
                        💰 Ventas: $${(tienda.ventas_totales || 0).toLocaleString()}<br>
                        📈 Ganancias: $${(tienda.ganancia_total || 0).toLocaleString()}<br>
                        <span style="color: ${color}">🎯 Rendimiento: ${tienda.rendimiento}</span>
                    `);
            }
        });
        
        // Ajustar el mapa para mostrar todas las tiendas
        const bounds = [];
        tiendas.forEach(tienda => {
            if (tienda.latitud && tienda.longitud) {
                bounds.push([tienda.latitud, tienda.longitud]);
            }
        });
        if (bounds.length > 0) {
            mapaTiendas.fitBounds(bounds);
        }
        
    } catch (error) {
        console.error('Error cargando mapa:', error);
    }
}

// ========== CARGAR TIENDAS ==========
async function cargarTiendas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar tiendas');
        
        const tiendas = await response.json();
        const tbody = document.getElementById('tiendas-body');
        
        if (tiendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay tiendas registradas</td</tr>';
            return;
        }
        
        tbody.innerHTML = tiendas.map(tienda => `
            <tr>
                <td>${tienda.id}</td>
                <td><strong>${escapeHtml(tienda.nombre)}</strong></td>
                <td>${escapeHtml(tienda.ciudad)}</td>
                <td>${escapeHtml(tienda.direccion) || '-'}</td>
                <td>${escapeHtml(tienda.gerente) || '-'}</td>
                <td>
                    ${tienda.latitud ? `<i class="fas fa-latitude"></i> ${tienda.latitud.toFixed(4)}<br>` : '-'}
                    ${tienda.longitud ? `<i class="fas fa-longitude"></i> ${tienda.longitud.toFixed(4)}` : '-'}
                 </td>
                <td>
                    <button class="btn btn-delete" onclick="mostrarModalEliminar(${tienda.id}, '${escapeHtml(tienda.nombre)}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                 </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar tiendas', 'error');
    }
}

// ========== AGREGAR TIENDA ==========
async function agregarTienda(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const gerente = document.getElementById('gerente').value.trim();
    const latitud = parseFloat(document.getElementById('latitud').value);
    const longitud = parseFloat(document.getElementById('longitud').value);
    
    if (!nombre || !ciudad) {
        mostrarNotificacion('Nombre y ciudad son obligatorios', 'error');
        return;
    }
    
    if (isNaN(latitud) || isNaN(longitud)) {
        mostrarNotificacion('Ingrese coordenadas válidas (latitud y longitud)', 'error');
        return;
    }
    
    const tienda = { nombre, ciudad, direccion, latitud, longitud, gerente };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/tiendas/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(tienda)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al guardar');
        }
        
        mostrarNotificacion(`Tienda "${nombre}" agregada exitosamente`, 'success');
        
        // Limpiar formulario (opcional, mantener valores para seguir agregando)
        document.getElementById('nombre').value = '';
        document.getElementById('ciudad').value = '';
        document.getElementById('direccion').value = '';
        document.getElementById('gerente').value = '';
        // Mantener coordenadas por defecto
        document.getElementById('latitud').value = DEFAULT_COORD.lat;
        document.getElementById('longitud').value = DEFAULT_COORD.lng;
        
        // Actualizar marcador
        actualizarMarcadorDesdeCoordenadas();
        
        // Recargar datos
        await cargarTiendas();
        await cargarMapaTiendas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ========== ELIMINAR TIENDA ==========
window.mostrarModalEliminar = function(id, nombre) {
    tiendaAEliminar = { id, nombre };
    document.getElementById('tienda-nombre').textContent = `"${nombre}"`;
    document.getElementById('modalEliminar').style.display = 'block';
};

function cerrarModal() {
    document.getElementById('modalEliminar').style.display = 'none';
    tiendaAEliminar = null;
}

async function confirmarEliminar() {
    if (!tiendaAEliminar) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/tiendas/${tiendaAEliminar.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al eliminar');
        }
        
        mostrarNotificacion(`Tienda "${tiendaAEliminar.nombre}" eliminada exitosamente`, 'success');
        cerrarModal();
        await cargarTiendas();
        await cargarMapaTiendas();
        
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