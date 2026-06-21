const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin" };
let clienteLogueado = "";

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
        document.getElementById('form-profesional').value = u;
        cargarCitasDelServidor();
    }
});

// UI Controls
const modal = document.getElementById('modal-cita');
document.getElementById('btn-abrir-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');

async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas ? data.citas : (Array.isArray(data) ? data : []);
        
        // Stats
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;
        document.getElementById('stat-pendientes').innerText = citas.filter(c => c.estado !== 'confirmó').length;

        // Render Table
        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = citas.map(c => `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-6 font-semibold">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-6 text-slate-500">${c.telefono || '-'}</td>
                <td class="p-6 text-slate-500">${c.fecha_cita ? c.fecha_cita.split('T')[0] : ''}</td>
                <td class="p-6"><span class="px-3 py-1 rounded-full text-xs font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${c.estado || 'pendiente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

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
    alert("Guardado");
    modal.classList.add('hidden');
    cargarCitasDelServidor();
});
