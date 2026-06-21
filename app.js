const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin" };
let clienteLogueado = "";

// UI Controls
const modal = document.getElementById('modal-cita');
document.getElementById('btn-abrir-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// Login Logic
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-usuario').value.trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    if (USUARIOS_VALIDOS[u] && USUARIOS_VALIDOS[u] === p) {
        clienteLogueado = u;
        document.getElementById('seccion-login').classList.add('hidden');
        document.getElementById('seccion-panel').classList.remove('hidden');
        document.getElementById('nombre-cliente-titulo').innerText = u;
        cargarCitasDelServidor();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

// Data Fetching
async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas ? data.citas : (Array.isArray(data) ? data : []);
        
        // Stats
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;

        // Render Table
        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = citas.map(c => `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-6 text-sm font-semibold text-slate-800">${c.nombres || ''} ${c.apellidos || ''}<br><span class="text-[10px] text-slate-400">${c.identificacion || ''}</span></td>
                <td class="p-6 text-sm text-slate-500">${c.telefono || '-'}</td>
                <td class="p-6 text-sm text-slate-500">${c.fecha_cita ? c.fecha_cita.split('T')[0] : ''}<br>${c.hora_cita || ''}</td>
                <td class="p-6 text-sm font-bold text-blue-700">${c.profesional || '-'}</td>
                <td class="p-6 text-sm text-slate-500">${c.motivo || '-'}</td>
                <td class="p-6">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} uppercase">
                        ${c.estado || 'pendiente'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// Form Submission
document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        identificacion: document.getElementById('form-identificacion').value,
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        edad: parseInt(document.getElementById('form-edad').value) || 0,
        telefono: document.getElementById('form-telefono').value,
        fecha_cita: document.getElementById('form-fecha').value,
        hora_cita: document.getElementById('form-hora').value,
        motivo: document.getElementById('form-motivo').value,
        profesional: document.getElementById('form-profesional-input').value, // Manual
        estado: 'esperando respuesta',
        procesado: 'pendiente'
    };
    await fetch(N8N_POST_URL, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload) 
    });
    modal.classList.add('hidden');
    document.getElementById('form-cita').reset();
    cargarCitasDelServidor();
});
