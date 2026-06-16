// Variables globales
let ventasTiendaChart = null;
let gananciasCategoriaChart = null;
let tendenciaMensualChart = null;

// ========== VERIFICAR AUTENTICACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard cargando...');
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No hay token, redirigiendo a login');
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
        
        console.log('Token válido, cargando dashboard...');
        await cargarDashboard();
        setInterval(cargarDashboard, 30000);
        mostrarInfoUsuario();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        localStorage.clear();
        window.location.href = '/';
    }
});

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

// ========== CARGAR DASHBOARD ==========
async function cargarDashboard() {
    try {
        await cargarKPIs();
        await cargarGraficos();
        await cargarAlertas();
        await cargarUltimasVentas();
        actualizarFecha();
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

async function cargarKPIs() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/analisis/kpis', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en KPIs');
        const kpis = await response.json();
        
        const elementos = {
            'total-tiendas': kpis.total_tiendas || 0,
            'total-productos': kpis.total_productos || 0,
            'total-proveedores': kpis.total_proveedores || 0,
            'total-ventas': `$${(kpis.ingresos_totales || 0).toLocaleString()}`,
            'total-ganancias': `$${(kpis.ganancias_totales || 0).toLocaleString()}`,
            'stock-critico': kpis.stock_critico || 0
        };
        
        for (const [id, valor] of Object.entries(elementos)) {
            const el = document.getElementById(id);
            if (el) el.textContent = valor;
        }
        
    } catch (error) {
        console.error('Error cargando KPIs:', error);
    }
}

async function cargarGraficos() {
    await cargarGraficoVentasTienda();
    await cargarGraficoGananciasCategoria();
    await cargarGraficoTendenciaMensual();
}

async function cargarGraficoVentasTienda() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/analisis/ventas-por-tienda', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en ventas por tienda');
        const data = await response.json();
        
        const ctx = document.getElementById('ventasTiendaChart');
        if (!ctx) return;
        
        if (ventasTiendaChart) ventasTiendaChart.destroy();
        
        ventasTiendaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.tienda),
                datasets: [{
                    label: 'Ventas ($)',
                    data: data.map(item => item.ventas_totales),
                    backgroundColor: '#0f3460',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `$${ctx.raw.toLocaleString()}` } }
                }
            }
        });
    } catch (error) {
        console.error('Error gráfico ventas tienda:', error);
    }
}

async function cargarGraficoGananciasCategoria() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/analisis/ganancias-por-categoria', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en ganancias por categoría');
        const data = await response.json();
        
        const ctx = document.getElementById('gananciasCategoriaChart');
        if (!ctx) return;
        
        if (gananciasCategoriaChart) gananciasCategoriaChart.destroy();
        
        gananciasCategoriaChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.categoria),
                datasets: [{
                    data: data.map(item => item.ganancia_total),
                    backgroundColor: ['#0f3460', '#e94560', '#ffb347', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: $${ctx.raw.toLocaleString()}` } }
                }
            }
        });
    } catch (error) {
        console.error('Error gráfico ganancias categoría:', error);
    }
}

async function cargarGraficoTendenciaMensual() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/analisis/tendencia-mensual', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en tendencia mensual');
        const data = await response.json();
        
        const ctx = document.getElementById('tendenciaMensualChart');
        if (!ctx) return;
        
        if (tendenciaMensualChart) tendenciaMensualChart.destroy();
        
        tendenciaMensualChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.mes),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: data.map(item => item.ingreso_total || 0),
                        borderColor: '#0f3460',
                        backgroundColor: 'rgba(15, 52, 96, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Ganancias',
                        data: data.map(item => item.ganancia_total || 0),
                        borderColor: '#e94560',
                        backgroundColor: 'rgba(233, 69, 96, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.raw.toLocaleString()}` } }
                }
            }
        });
    } catch (error) {
        console.error('Error gráfico tendencia mensual:', error);
    }
}

async function cargarAlertas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/productos/stock/critico?limite=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en stock crítico');
        const stockCritico = await response.json();
        
        const container = document.getElementById('alertas-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (stockCritico.length > 0) {
            stockCritico.forEach(producto => {
                const alerta = document.createElement('div');
                alerta.className = 'alerta critico';
                alerta.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span><strong>${producto.nombre}</strong> - Stock crítico: ${producto.stock} unidades en ${producto.tienda}</span>
                `;
                container.appendChild(alerta);
            });
        } else {
            container.innerHTML = '<div class="alerta info"><i class="fas fa-check-circle"></i><span>No hay productos con stock crítico</span></div>';
        }
    } catch (error) {
        console.error('Error cargando alertas:', error);
    }
}

async function cargarUltimasVentas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/ventas/?limit=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error en últimas ventas');
        const ventas = await response.json();
        
        const tbody = document.getElementById('ultimas-ventas-body');
        if (!tbody) return;
        
        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay ventas registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = ventas.map(venta => `
            <tr>
                <td>${venta.id}</td>
                <td>${venta.fecha}</td>
                <td>${venta.producto}</td>
                <td>${venta.tienda}</td>
                <td>${venta.cantidad}</td>
                <td>$${(venta.ingreso || 0).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando últimas ventas:', error);
    }
}

function actualizarFecha() {
    const fechaElement = document.getElementById('fecha-actual');
    if (fechaElement) {
        const hoy = new Date();
        fechaElement.textContent = hoy.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}