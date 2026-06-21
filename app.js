const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin", "clinicadental": "12345" };

let clienteLogueado = "";
let idCitaEnEdicion = null;
let camposPlantilla = JSON.parse(localStorage.getItem('campos_plantilla') || '[]');

const modal = document.getElementById('modal-cita');

// --- EVENTOS INICIALES ---
document.getElementById('btn-abrir-modal').onclick = () => { resetearFormulario(); modal.classList.remove('hidden'); };
document.getElementById('btn-cerrar-modal').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// Agregar campo "permanente" (Plantilla)
document.getElementById('btn-agregar-campo').addEventListener('click', () => {
    const nombre = prompt("Nombre del nuevo campo (ej: Seguro):");
    if(nombre) {
        if(!camposPlantilla.includes(nombre)) {
            camposPlantilla.push(nombre);
            localStorage.setItem('campos_plantilla', JSON.stringify(camposPlantilla));
            renderizarCamposModal();
        }
    }
});

// --- FUNCIONES DE LÓGICA ---

function renderizarCamposModal(datosCita = {}) {
    const container = document.getElementById('contenedor-campos-plantilla');
    container.innerHTML = camposPlantilla.map(nombre => `
        <div class="relative">
            <label class="text-[10px] font-bold text-slate-400 uppercase">${nombre}</label>
            <input type="text" data-key="${nombre}" value="${datosCita[nombre] || ''}" class="input-plantilla w-full p-3 bg-slate-50 rounded-xl border border-slate-200">
            <button type="button" onclick="eliminarCampo('${nombre}')" class="absolute top-0 right-0 text-red-400 text-[10px]">Borrar</button>
        </div>
    `).join('');
}

window.eliminarCampo = (nombre) => {
    camposPlantilla = camposPlantilla.filter(c => c !== nombre);
    localStorage.setItem('campos_plantilla', JSON.stringify(camposPlantilla));
    renderizarCamposModal();
};

function resetearFormulario() {
    idCitaEnEdicion = null;
    document.getElementById('titulo-modal').innerText = "Programar Nueva Cita";
    document.getElementById('form-cita').reset();
    renderizarCamposModal(); // Renderiza campos vacíos
}

// --- LOGIN Y CARGA ---

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
        const citas = data.citas || (Array.isArray(data) ? data : []);
        
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;

        // Render Tabla
        const cabeceras = ['ID', 'Paciente', 'Edad', 'Teléfono', 'F. Cita', 'H. Cita', 'Profesional', 'Estado', 'Acciones'];
        document.getElementById('tabla-cabecera').innerHTML = `<tr>${cabeceras.map(h => `<th class="p-4">${h}</th>`).join('')} ${camposPlantilla.map(k => `<th class="p-4 text-indigo-400">${k}</th>`).join('')}</tr>`;

        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            let camposParseados = {};
            try { camposParseados = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : (c.campos_personalizados || {}); } catch(e){}
            
            const citaString = encodeURIComponent(JSON.stringify({...c, camposParseados}));
            return `
            <tr class="border-b">
                <td class="p-4">${c.id || '-'}</td>
                <td class="p-4 font-bold">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4">${c.edad || '-'}</td>
                <td class="p-4">${c.telefono || '-'}</td>
                <td class="p-4">${c.fecha_cita?.split('T')[0] || '-'}</td>
                <td class="p-4">${c.hora_cita || '-'}</td>
                <td class="p-4">${c.profesional || '-'}</td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-[9px] font-bold ${c.estado === 'confirmó' ? 'bg-green-100 text-green-700' : 'bg-slate-100'} uppercase">${c.estado || 'pendiente'}</span></td>
                <td class="p-4"><button onclick="prepararEdicion('${citaString}')" class="text-blue-600 font-bold hover:underline">Editar</button></td>
                ${camposPlantilla.map(k => `<td class="p-4">${camposParseados[k] || '-'}</td>`).join('')}
            </tr>`;
        }).join('');
    } catch (e) { console.error("Error al cargar:", e); }
}

// --- EDICIÓN Y GUARDADO ---

window.prepararEdicion = (citaString) => {
    const c = JSON.parse(decodeURIComponent(citaString));
    idCitaEnEdicion = c.id; 
    document.getElementById('titulo-modal').innerText = "Editando Cita #" + c.id;
    
    document.getElementById('form-identificacion').value = c.identificacion || '';
    document.getElementById('form-edad').value = c.edad || '';
    document.getElementById('form-telefono').value = c.telefono || '';
    document.getElementById('form-nombres').value = c.nombres || '';
    document.getElementById('form-apellidos').value = c.apellidos || '';
    document.getElementById('form-fecha').value = c.fecha_cita?.split('T')[0] || '';
    document.getElementById('form-hora').value = c.hora_cita || '';
    document.getElementById('form-profesional').value = c.profesional || '';
    document.getElementById('form-motivo').value = c.motivo || '';
    
    renderizarCamposModal(c.camposParseados);
    modal.classList.remove('hidden');
};

document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    let camposPersonalizadosObj = {};
    document.querySelectorAll('.input-plantilla').forEach(i => {
        if(i.value) camposPersonalizadosObj[i.getAttribute('data-key')] = i.value;
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

    await fetch(N8N_POST_URL, { 
        method: 'POST', 
        body: JSON.stringify(payload), 
        headers: {'Content-Type': 'application/json'} 
    });
    
    modal.classList.add('hidden');
    resetearFormulario();
    cargarCitasDelServidor();
});
