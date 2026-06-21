const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin", "clinicadental": "12345" };

let clienteLogueado = "";
let camposDinamicosGlobales = [];

const modal = document.getElementById('modal-cita');
document.getElementById('btn-abrir-modal').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// Agregar Campos
document.getElementById('btn-agregar-campo').addEventListener('click', () => {
    const container = document.getElementById('contenedor-campos');
    const id = 'campo_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "flex gap-2";
    div.innerHTML = `
        <input type="text" placeholder="Nombre (ej: Seguro)" class="nombre-campo bg-slate-50 p-2 rounded-lg border w-1/2 text-sm">
        <input type="text" placeholder="Valor" class="valor-campo bg-slate-50 p-2 rounded-lg border w-1/2 text-sm">
        <button type="button" onclick="document.getElementById('${id}').remove()" class="text-red-500 font-bold px-2">X</button>
    `;
    container.appendChild(div);
});

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

        let keysUnicas = new Set();
        citas.forEach(c => {
            // Protección: si no hay datos, inicializamos como objeto vacío
            let obj = {};
            if (c.campos_personalizados) {
                try {
                    obj = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : c.campos_personalizados;
                } catch(e) { console.error("Error parseando JSON"); }
            }
            c.camposParseados = obj;
            Object.keys(obj).forEach(k => keysUnicas.add(k));
        });
        camposDinamicosGlobales = Array.from(keysUnicas);

        // Cabeceras
        let htmlCabecera = `<tr>
            <th class="p-4">ID</th><th class="p-4">Identificación</th><th class="p-4">Paciente</th>
            <th class="p-4">Edad</th><th class="p-4">Teléfono</th><th class="p-4">F. Cita</th>
            <th class="p-4">H. Cita</th><th class="p-4">Profesional</th><th class="p-4">Motivo</th>
            <th class="p-4">Procesado</th><th class="p-4">Estado</th>`;
        camposDinamicosGlobales.forEach(k => htmlCabecera += `<th class="p-4 text-indigo-400 uppercase tracking-widest">${k.replace(/_/g, ' ')}</th>`);
        document.getElementById('tabla-cabecera').innerHTML = htmlCabecera + `</tr>`;

        // Filas
        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            let row = `<tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-4">${c.id || '-'}</td>
                <td class="p-4">${c.identificacion || '-'}</td>
                <td class="p-4 font-bold text-slate-800">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4">${c.edad || '-'}</td>
                <td class="p-4">${c.telefono || '-'}</td>
                <td class="p-4">${c.fecha_cita ? c.fecha_cita.split('T')[0] : '-'}</td>
                <td class="p-4">${c.hora_cita || '-'}</td>
                <td class="p-4 text-blue-700 font-semibold">${c.profesional || '-'}</td>
                <td class="p-4 text-slate-500">${c.motivo || '-'}</td>
                <td class="p-4">${c.procesado || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-[9px] font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-slate-100'} uppercase">${c.estado || 'pendiente'}</span></td>`;
            camposDinamicosGlobales.forEach(k => row += `<td class="p-4 font-semibold text-indigo-600">${c.camposParseados[k] || '-'}</td>`);
            return row + `</tr>`;
        }).join('');

    } catch (e) { 
        console.error("Error crítico de carga:", e); 
        alert("Hubo un error cargando las citas. Revisa la consola.");
    }
}

document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    let camposPersonalizadosObj = {};
    document.querySelectorAll('.nombre-campo').forEach((input, index) => {
        const key = input.value.trim().toLowerCase().replace(/ /g, "_");
        if(key) camposPersonalizadosObj[key] = document.querySelectorAll('.valor-campo')[index].value.trim();
    });

    const payload = {
        id_cliente: clienteLogueado,
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
        procesado: 'pendiente',
        campos_personalizados: camposPersonalizadosObj
    };

    try {
        await fetch(N8N_POST_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        modal.classList.add('hidden');
        document.getElementById('form-cita').reset();
        document.getElementById('contenedor-campos').innerHTML = ""; 
        cargarCitasDelServidor();
    } catch (e) { console.error(e); }
});
