const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin" };
let clienteLogueado = "";

const modal = document.getElementById('modal-cita');
document.getElementById('btn-abrir-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

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
    }
});

async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas ? data.citas : (Array.isArray(data) ? data : []);
        
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;

        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-4">${c.id || '-'}</td>
                <td class="p-4">${c.identificacion || '-'}</td>
                <td class="p-4 font-bold">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4">${c.edad || '-'}</td>
                <td class="p-4">${c.telefono || '-'}</td>
                <td class="p-4">${c.fecha_cita ? c.fecha_cita.split('T')[0] : ''}</td>
                <td class="p-4">${c.hora_cita || '-'}</td>
                <td class="p-4 text-blue-700 font-semibold">${c.profesional || '-'}</td>
                <td class="p-4 text-slate-500">${c.motivo || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-[10px] font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}">${c.estado || 'pendiente'}</span></td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        identificacion: document.getElementById('form-identificacion').value,
        edad: parseInt(document.getElementById('form-edad').value) || 0,
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        telefono: document.getElementById('form-telefono').value,
        fecha_cita: document.getElementById('form-fecha').value,
        hora_cita: document.getElementById('form-hora').value,
        profesional: document.getElementById('form-profesional').value,
        motivo: document.getElementById('form-motivo').value,
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
