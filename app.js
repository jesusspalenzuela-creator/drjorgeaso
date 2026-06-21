const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin", "clinicadental": "12345" };

let clienteLogueado = "";
let camposDinamicosGlobales = [];
let idCitaEnEdicion = null; // Variable clave para identificar edición

const modal = document.getElementById('modal-cita');

// Eventos básicos
document.getElementById('btn-abrir-modal').onclick = () => { resetearFormulario(); modal.classList.remove('hidden'); };
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// Agregar Campos nuevos
document.getElementById('btn-agregar-campo').addEventListener('click', () => {
    const container = document.getElementById('contenedor-campos');
    const id = 'campo_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "flex gap-2";
    div.innerHTML = `
        <input type="text" placeholder="Nombre" class="nombre-campo bg-slate-50 p-2 rounded-lg border w-1/2 text-sm">
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
        const citas = data.citas || [];
        
        let keysUnicas = new Set();
        citas.forEach(c => {
            if(c.campos_personalizados) {
                let obj = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : c.campos_personalizados;
                c.camposParseados = obj;
                Object.keys(obj).forEach(k => keysUnicas.add(k));
            } else { c.camposParseados = {}; }
        });
        camposDinamicosGlobales = Array.from(keysUnicas);

        // Render Tabla
        let cabeceras = ['ID', 'ID. Cliente', 'Paciente', 'Edad', 'Teléfono', 'F. Cita', 'H. Cita', 'Profesional', 'Motivo', 'Estado', 'Acciones'];
        document.getElementById('tabla-cabecera').innerHTML = `<tr>${cabeceras.map(h => `<th class="p-4">${h}</th>`).join('')} ${camposDinamicosGlobales.map(k => `<th class="p-4 text-indigo-400">${k}</th>`).join('')}</tr>`;

        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            // Usamos encodeURIComponent para pasar el objeto al botón editar sin romper el HTML
            const citaString = encodeURIComponent(JSON.stringify(c));
            return `
            <tr class="border-b">
                <td class="p-4">${c.id || '-'}</td>
                <td class="p-4">${c.identificacion || '-'}</td>
                <td class="p-4 font-bold">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4">${c.edad || '-'}</td>
                <td class="p-4">${c.telefono || '-'}</td>
                <td class="p-4">${c.fecha_cita?.split('T')[0] || '-'}</td>
                <td class="p-4">${c.hora_cita || '-'}</td>
                <td class="p-4">${c.profesional || '-'}</td>
                <td class="p-4">${c.motivo || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-[9px] font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-slate-100'} uppercase">${c.estado || 'pendiente'}</span></td>
                <td class="p-4"><button onclick="prepararEdicion('${citaString}')" class="text-blue-600 font-bold hover:underline">Editar</button></td>
                ${camposDinamicosGlobales.map(k => `<td class="p-4">${c.camposParseados[k] || '-'}</td>`).join('')}
            </tr>`;
        }).join('');
    } catch (e) { console.error(e); }
}

// Función global necesaria para el botón editar
window.prepararEdicion = (citaString) => {
    const c = JSON.parse(decodeURIComponent(citaString));
    idCitaEnEdicion = c.id; 
    document.getElementById('titulo-modal').innerText = "Editando Cita #" + c.id;
    
    document.getElementById('form-identificacion').value = c.identificacion;
    document.getElementById('form-edad').value = c.edad;
    document.getElementById('form-telefono').value = c.telefono;
    document.getElementById('form-nombres').value = c.nombres;
    document.getElementById('form-apellidos').value = c.apellidos;
    document.getElementById('form-fecha').value = c.fecha_cita?.split('T')[0] || '';
    document.getElementById('form-hora').value = c.hora_cita || '';
    document.getElementById('form-profesional').value = c.profesional;
    document.getElementById('form-motivo').value = c.motivo;
    
    document.getElementById('contenedor-campos-plantilla').innerHTML = camposDinamicosGlobales.map(k => `
        <div><label class="text-xs font-bold text-slate-500 uppercase">${k}</label>
        <input type="text" data-key="${k}" value="${c.camposParseados[k] || ''}" class="input-plantilla bg-indigo-50 p-3 rounded-xl border w-full"></div>
    `).join('');
    
    modal.classList.remove('hidden');
};

function resetearFormulario() {
    idCitaEnEdicion = null;
    document.getElementById('titulo-modal').innerText = "Programar Nueva Cita";
    document.getElementById('form-cita').reset();
    document.getElementById('contenedor-campos').innerHTML = "";
    document.getElementById('contenedor-campos-plantilla').innerHTML = "";
}

document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    let camposPersonalizadosObj = {};
    document.querySelectorAll('.input-plantilla').forEach(i => camposPersonalizadosObj[i.getAttribute('data-key')] = i.value);
    document.querySelectorAll('.nombre-campo').forEach((i, idx) => {
        if(i.value) camposPersonalizadosObj[i.value.trim()] = document.querySelectorAll('.valor-campo')[idx].value;
    });

    const payload = {
        ...(idCitaEnEdicion && { id: idCitaEnEdicion }), 
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
        campos_personalizados: camposPersonalizadosObj
    };

    await fetch(N8N_POST_URL, { method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} });
    modal.classList.add('hidden');
    resetearFormulario();
    cargarCitasDelServidor();
});
