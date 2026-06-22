const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const USUARIOS_VALIDOS = { "drjorgeaso": "1234", "inovixe": "admin", "clinicadental": "12345" };

let clienteLogueado = "";
let idCitaEnEdicion = null;
let camposPlantilla = JSON.parse(localStorage.getItem('campos_plantilla') || '[]');

const modal = document.getElementById('modal-cita');

// --- EVENTOS DEL MODAL (Añadido "flex" para centrar) ---
document.getElementById('btn-abrir-modal').onclick = () => { 
    resetearFormulario(); 
    modal.classList.remove('hidden'); 
    modal.classList.add('flex'); // <-- Esto centra el modal
};

const cerrarModal = () => { 
    modal.classList.add('hidden'); 
    modal.classList.remove('flex'); 
};
document.getElementById('btn-cerrar-modal').onclick = cerrarModal;
document.getElementById('btn-cerrar-modal-secundario').onclick = cerrarModal;

document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = cargarCitasDelServidor;

// --- BOTÓN DE CAMPOS EN EL DASHBOARD ---
document.getElementById('btn-agregar-campo').addEventListener('click', () => {
    const nombre = prompt("Nombre del nuevo campo (ej: Seguro, Alergias):");
    if(nombre && nombre.trim() !== "") {
        const nombreLimpio = nombre.trim();
        if(!camposPlantilla.includes(nombreLimpio)) {
            camposPlantilla.push(nombreLimpio);
            localStorage.setItem('campos_plantilla', JSON.stringify(camposPlantilla));
            cargarCitasDelServidor(); // Refresca la tabla para mostrar la nueva columna
            alert(`¡Campo "${nombreLimpio}" añadido con éxito!`);
        } else {
            alert("Este campo ya existe.");
        }
    }
});

// --- FUNCIONES DE LÓGICA ---
function renderizarCamposModal(datosCita = {}) {
    const container = document.getElementById('contenedor-campos-plantilla');
    container.innerHTML = camposPlantilla.map(nombre => `
        <div class="relative">
            <label class="text-[11px] font-bold text-slate-500 uppercase mb-1 block">${nombre}</label>
            <input type="text" data-key="${nombre}" value="${datosCita[nombre] || ''}" class="input-plantilla w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition">
            <button type="button" onclick="eliminarCampo('${nombre}')" class="absolute top-0 right-0 text-red-500 hover:text-red-700 text-[10px] font-bold p-1">Eliminar</button>
        </div>
    `).join('');
}

window.eliminarCampo = (nombre) => {
    if(confirm(`¿Seguro que deseas eliminar la columna "${nombre}"? Los datos antiguos se conservarán en la base de datos pero no se verán en pantalla.`)) {
        camposPlantilla = camposPlantilla.filter(c => c !== nombre);
        localStorage.setItem('campos_plantilla', JSON.stringify(camposPlantilla));
        renderizarCamposModal();
        cargarCitasDelServidor();
    }
};

function resetearFormulario() {
    idCitaEnEdicion = null;
    document.getElementById('titulo-modal').innerText = "Nueva Cita";
    document.getElementById('form-cita').reset();
    renderizarCamposModal(); 
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
    } else {
        alert("Usuario o contraseña incorrectos");
    }
});

async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas || (Array.isArray(data) ? data : []);
        
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado === 'confirmó').length;

        // 1. ARMADO DE CABECERAS (Acciones SIEMPRE al final)
        const cabecerasBase = ['ID', 'Paciente', 'Edad', 'Teléfono', 'F. Cita', 'H. Cita', 'Profesional', 'Estado'];
        let htmlCabecera = `<tr>`;
        cabecerasBase.forEach(h => htmlCabecera += `<th class="p-4">${h}</th>`);
        camposPlantilla.forEach(k => htmlCabecera += `<th class="p-4 text-blue-500">${k}</th>`);
        htmlCabecera += `<th class="p-4 text-right">Acciones</th></tr>`;
        document.getElementById('tabla-cabecera').innerHTML = htmlCabecera;

        // 2. ARMADO DE FILAS (Botón editar SIEMPRE al final)
        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            let camposParseados = {};
            try { camposParseados = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : (c.campos_personalizados || {}); } catch(e){}
            
            const citaString = encodeURIComponent(JSON.stringify({...c, camposParseados}));
            
            let row = `
            <tr class="table-row-hover border-b border-slate-100">
                <td class="p-4 font-medium text-slate-500">${c.id || '-'}</td>
                <td class="p-4 font-bold text-slate-900">${c.nombres || ''} ${c.apellidos || ''}</td>
                <td class="p-4">${c.edad || '-'}</td>
                <td class="p-4">${c.telefono || '-'}</td>
                <td class="p-4">${c.fecha_cita?.split('T')[0] || '-'}</td>
                <td class="p-4">${c.hora_cita || '-'}</td>
                <td class="p-4 font-semibold text-blue-700">${c.profesional || '-'}</td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[10px] font-bold ${c.estado === 'confirmó' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} uppercase tracking-wide">${c.estado || 'pendiente'}</span></td>`;
            
            // Agregar columnas dinámicas
            camposPlantilla.forEach(k => {
                row += `<td class="p-4 text-slate-600">${camposParseados[k] || '-'}</td>`;
            });

            // Botón Acciones al final
            row += `<td class="p-4 text-right">
                        <button onclick="prepararEdicion('${citaString}')" class="text-blue-600 font-bold hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all shadow-sm">Editar</button>
                    </td>
            </tr>`;
            return row;
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
    modal.classList.add('flex'); // Centra al editar también
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

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Guardando...";
    btnSubmit.disabled = true;

    try {
        await fetch(N8N_POST_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload), 
            headers: {'Content-Type': 'application/json'} 
        });
        
        cerrarModal();
        resetearFormulario();
        await cargarCitasDelServidor();
    } catch (error) {
        alert("Error al guardar la cita.");
        console.error(error);
    } finally {
        btnSubmit.innerText = "Guardar cita";
        btnSubmit.disabled = false;
    }
});
