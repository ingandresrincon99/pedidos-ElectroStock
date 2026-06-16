// ========== VARIABLES GLOBALES ==========
let proveedorAEliminar = null;

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
        
        // Cargar datos
        await cargarProveedores();
        mostrarInfoUsuario();
        actualizarFecha();
        
        // Configurar event listeners
        document.getElementById('formProveedor').addEventListener('submit', agregarProveedor);
        document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
        document.getElementById('btnConfirmar').addEventListener('click', confirmarEliminar);
        
        // Cerrar modal al hacer clic en la X
        document.querySelector('.modal-close').addEventListener('click', cerrarModal);
        
        // Cerrar modal al hacer clic fuera
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

// ========== CARGAR PROVEEDORES ==========
async function cargarProveedores() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/proveedores/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar proveedores');
        
        const proveedores = await response.json();
        const tbody = document.getElementById('proveedores-body');
        
        if (proveedores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay proveedores registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = proveedores.map(prov => `
            <tr>
                <td>${prov.id}</td>
                <td><strong>${escapeHtml(prov.nombre)}</strong></td>
                <td>${escapeHtml(prov.contacto) || '-'}</td>
                <td>${escapeHtml(prov.telefono) || '-'}</td>
                <td>${escapeHtml(prov.email) || '-'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editarProveedor(${prov.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-delete" onclick="mostrarModalEliminar(${prov.id}, '${escapeHtml(prov.nombre)}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al cargar proveedores', 'error');
    }
}

// ========== AGREGAR PROVEEDOR ==========
async function agregarProveedor(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const contacto = document.getElementById('contacto').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    
    if (!nombre) {
        mostrarNotificacion('El nombre del proveedor es obligatorio', 'error');
        return;
    }
    
    const proveedor = { nombre, contacto, telefono, email };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/proveedores/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(proveedor)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al guardar');
        }
        
        mostrarNotificacion('Proveedor agregado exitosamente', 'success');
        document.getElementById('formProveedor').reset();
        await cargarProveedores();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ========== EDITAR PROVEEDOR ==========
window.editarProveedor = async function(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/proveedores/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al obtener proveedor');
        
        const proveedor = await response.json();
        
        // Llenar formulario
        document.getElementById('nombre').value = proveedor.nombre;
        document.getElementById('contacto').value = proveedor.contacto || '';
        document.getElementById('telefono').value = proveedor.telefono || '';
        document.getElementById('email').value = proveedor.email || '';
        
        // Cambiar botón del formulario
        const btnSubmit = document.querySelector('#formProveedor button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Proveedor';
        
        // Cambiar el evento del formulario temporalmente
        const form = document.getElementById('formProveedor');
        const originalSubmit = form.onsubmit;
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const updatedProveedor = {
                nombre: document.getElementById('nombre').value.trim(),
                contacto: document.getElementById('contacto').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                email: document.getElementById('email').value.trim()
            };
            
            try {
                const updateResponse = await fetch(`http://localhost:8000/api/proveedores/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedProveedor)
                });
                
                if (!updateResponse.ok) throw new Error('Error al actualizar');
                
                mostrarNotificacion('Proveedor actualizado exitosamente', 'success');
                form.reset();
                btnSubmit.innerHTML = originalText;
                form.onsubmit = agregarProveedor;
                await cargarProveedores();
                
            } catch (error) {
                mostrarNotificacion(error.message, 'error');
            }
        };
        
        // Scroll al formulario
        document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
        
        mostrarNotificacion('Editando proveedor. Modifica los campos y presiona Actualizar.', 'info');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al editar proveedor', 'error');
    }
};

// ========== ELIMINAR PROVEEDOR ==========
window.mostrarModalEliminar = function(id, nombre) {
    proveedorAEliminar = { id, nombre };
    document.getElementById('proveedor-nombre').textContent = `"${nombre}"`;
    document.getElementById('modalEliminar').style.display = 'block';
};

function cerrarModal() {
    document.getElementById('modalEliminar').style.display = 'none';
    proveedorAEliminar = null;
}

async function confirmarEliminar() {
    if (!proveedorAEliminar) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/proveedores/${proveedorAEliminar.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al eliminar');
        }
        
        mostrarNotificacion(`Proveedor "${proveedorAEliminar.nombre}" eliminado exitosamente`, 'success');
        cerrarModal();
        await cargarProveedores();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion(error.message, 'error');
        cerrarModal();
    }
}

// ========== NOTIFICACIONES ==========
function mostrarNotificacion(mensaje, tipo) {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    // Estilos de la notificación
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
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
    
    // Eliminar después de 3 segundos
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

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);