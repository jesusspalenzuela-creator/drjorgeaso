const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin" };
let clienteLogueado = "";

// NAVEGACIÓN (SPA)
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

// LOGIN
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-usuario').value.trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    if (USUARIOS_VALIDOS[u] && USUARIOS_VALIDOS[u] === p) {
        clienteLogueado = u;
        document.getElementById('seccion-login').classList.add('hidden');
        document.getElementById('seccion-panel').classList.remove('hidden');
        document.getElementById('form-profesional').value = u;
        cargarCitasDelServidor();
    }
});

// CARGA DE DATOS
async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas ? data.citas : (Array.isArray(data) ? data : []);
        
        // Stats
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;
        document.getElementById('stat-pendientes').innerText = citas.filter(c => c.estado !== 'confirmó').length;

        // Tabla
        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = citas.map(c => `
            <tr class="hover:bg-slate-50">
                <td class="p-4 font-semibold">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4 text-slate-500">${c.fecha_cita ? c.fecha_cita.split('T')[0] : ''}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs bg-slate-100">${c.estado || 'pendiente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// ENVÍO
document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        fecha_cita: document.getElementById('form-fecha').value,
        motivo: document.getElementById('form-motivo').value,
        profesional: document.getElementById('form-profesional').value,
        estado: 'esperando respuesta'
    };
    await fetch(N8N_POST_URL, { method: 'POST', body: JSON.stringify(payload) });
    alert("¡Cita registrada!");
    document.getElementById('form-cita').reset();
    showView('view-dashboard');
    cargarCitasDelServidor();
});

document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
