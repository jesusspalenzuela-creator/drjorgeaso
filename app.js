// CONFIGURACIÓN CENTRAL
const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

const USUARIOS_VALIDOS = {
    "drjorgeaso": "1234",
    "inovixe": "admin"
};

let clienteLogueado = "";

// 1. CONTROL DE LOGIN
document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault();
    const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;

    if (USUARIOS_VALIDOS[usuario] && USUARIOS_VALIDOS[usuario] === pass) {
        clienteLogueado = usuario;
        document.getElementById('seccion-login').classList.add('hidden');
        document.getElementById('seccion-panel').classList.remove('hidden');
        document.getElementById('nombre-cliente-titulo').innerText = usuario;
        document.getElementById('form-profesional').value = usuario;
        cargarCitasDelServidor();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

// 2. MODAL Y UI
const modal = document.getElementById('modal-cita');
document.getElementById('btn-abrir-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// 3. ACTUALIZAR ESTADÍSTICAS
function actualizarStats(citas) {
    document.getElementById('stat-total').innerText = citas.length;
    document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;
    document.getElementById('stat-pendientes').innerText = citas.filter(c => c.estado !== 'confirmó').length;
}

// 4. CARGAR DATOS
async function cargarCitasDelServidor() {
    try {
        const respuesta = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await respuesta.json();
        const listaCitas = data.citas ? data.citas : (Array.isArray(data) ? data : []);

        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = "";

        if (listaCitas.length > 0) {
            actualizarStats(listaCitas);
            listaCitas.forEach(cita => {
                const htmlFila = `
                    <tr class="border-b hover:bg-gray-50 transition">
                        <td class="p-4 font-medium">${cita.nombres || ''} ${cita.apellidos || ''}</td>
                        <td class="p-4 text-gray-500">${cita.telefono || '-'}</td>
                        <td class="p-4 text-gray-500">${cita.fecha_cita ? cita.fecha_cita.split('T')[0] : ''}</td>
                        <td class="p-4">
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${cita.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                                ${cita.estado || 'pendiente'}
                            </span>
                        </td>
                    </tr>
                `;
                cuerpo.innerHTML += htmlFila;
            });
        }
    } catch (error) {
        console.error("Error al cargar citas:", error);
    }
}

// 5. CREAR NUEVA CITA
document.getElementById('form-cita').addEventListener('submit', async function(e) {
    e.preventDefault();

    const datosCita = {
        identificacion: 'N/A',
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        edad: 0,
        telefono: 'N/A',
        fecha_cita: document.getElementById('form-fecha').value,
        hora_cita: '08:00',
        motivo: document.getElementById('form-motivo').value,
        profesional: document.getElementById('form-profesional').value,
        estado: 'esperando respuesta',
        procesado: 'pendiente'
    };

    try {
        const res = await fetch(N8N_POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCita)
        });

        if (res.ok) {
            alert("¡Cita creada!");
            modal.classList.add('hidden');
            document.getElementById('form-cita').reset();
            cargarCitasDelServidor();
        }
    } catch (error) {
        alert("Error al guardar.");
    }
});
