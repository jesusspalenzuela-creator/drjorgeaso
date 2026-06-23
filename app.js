const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const N8N_LOGIN_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/login';
const N8N_CONFIG_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/guardarconfig';

let clienteLogueado = "";
let idCitaEnEdicion = null;

// Solo quedan los campos de sistema estáticos
const COLUMNAS_SISTEMA = ['id', 'estado'];
const NOMBRES_COLUMNAS_SISTEMA = { 'id': 'ID', 'estado': 'Estado' };

// Si un cliente nuevo entra, le damos esta plantilla inicial (él puede borrarla luego)
const PLANTILLA_POR_DEFECTO = ['Identificación', 'Nombres', 'Apellidos', 'Teléfono', 'Fecha', 'Hora', 'Profesional'];

let camposPlantilla = [];
let columnasOcultas = []; 
let ordenColumnas = [];

let citasAnteriores = [];
let hashTablaActual = ""; 
let loopSincronizacion = null;

const modal = document.getElementById('modal-cita');
const modalColumnas = document.getElementById('modal-columnas');

// --- NOTIFICACIONES ---
window.mostrarNotificacion = (titulo, mensaje, tipo = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bgIcono = 'bg-blue-100 text-blue-600', iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
    if(tipo === 'success' || tipo === 'confirmó') { bgIcono = 'bg-emerald-100 text-emerald-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`; }
    else if(tipo === 'error' || tipo === 'canceló') { bgIcono = 'bg-red-100 text-red-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`; }
    else if(tipo === 'warning' || tipo === 'reprogramó') { bgIcono = 'bg-amber-100 text-amber-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`; }

    toast.className = `toast-enter flex items-start gap-4 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-100 pointer-events-auto cursor-pointer`;
    toast.innerHTML = `<div class="flex-shrink-0 w-10 h-10 ${bgIcono} rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div><div class="flex-1"><h4 class="text-sm font-black text-slate-800">${titulo}</h4><p class="text-[13px] text-slate-500 font-medium leading-tight mt-0.5">${mensaje}</p></div>`;
    container.appendChild(toast);
    toast.onclick = () => toast.remove();
    setTimeout(() => { toast.classList.add('opacity-0', 'transition-opacity', 'duration-300'); setTimeout(() => toast.remove(), 300); }, 6000);
};

// --- GUARDAR CONFIGURACIÓN EN LA BASE DE DATOS ---
async function sincronizarConfiguracionNube() {
    const payload = {
        usuario: clienteLogueado,
        config: { orden_columnas: ordenColumnas, columnas_ocultas: columnasOcultas, campos_plantilla: camposPlantilla }
    };
    try {
        await fetch(N8N_CONFIG_URL, { method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} });
    } catch (error) { console.error("Error guardando preferencias en la nube."); }
}

// --- EVENTOS MODAL ---
document.getElementById('btn-abrir-modal').onclick = () => { resetearFormulario(); modal.classList.remove('hidden'); modal.classList.add('flex'); };
const cerrarModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
document.getElementById('btn-cerrar-modal').onclick = cerrarModal;
document.getElementById('btn-cerrar-modal-secundario').onclick = cerrarModal;
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = () => { mostrarNotificacion("Sincronizando...", "Actualizando agenda médica.", "info"); cargarCitasDelServidor(); };

// --- GESTIÓN DE VISTAS Y ORDEN ---
function renderizarModalVistas() {
    const container = document.getElementById('lista-columnas');
    container.innerHTML = ordenColumnas.map((colKey, index) => {
        const isChecked = !columnasOcultas.includes(colKey) ? 'checked' : '';
        const label = NOMBRES_COLUMNAS_SISTEMA[colKey] || `${colKey}`;
        return `
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
            <label class="flex items-center gap-3 cursor-pointer flex-1">
                <input type="checkbox" value="${colKey}" class="chk-columna w-5 h-5 custom-checkbox rounded text-blue-600 focus:ring-blue-500 border-slate-300" ${isChecked}>
                <span class="font-semibold text-slate-700">${label}</span>
            </label>
            <div class="flex gap-1 ml-2">
                <button type="button" onclick="moverColumna(${index}, -1)" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition" ${index === 0 ? 'disabled opacity-30 cursor-not-allowed' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
                <button type="button" onclick="moverColumna(${index}, 1)" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition" ${index === ordenColumnas.length - 1 ? 'disabled opacity-30 cursor-not-allowed' : ''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></button>
            </div>
        </div>`;
    }).join('');
}

window.moverColumna = (index, direccion) => {
    const checkboxes = document.querySelectorAll('.chk-columna');
    let nuevasOcultas = [];
    checkboxes.forEach((cb, idx) => { if (!cb.checked) nuevasOcultas.push(ordenColumnas[idx]); });
    columnasOcultas = nuevasOcultas;

    const nuevoIndex = index + direccion;
    if (nuevoIndex >= 0 && nuevoIndex < ordenColumnas.length) {
        const temp = ordenColumnas[index];
        ordenColumnas[index] = ordenColumnas[nuevoIndex];
        ordenColumnas[nuevoIndex] = temp;
        renderizarModalVistas();
    }
};

document.getElementById('btn-configurar-columnas').onclick = () => { renderizarModalVistas(); modalColumnas.classList.remove('hidden'); modalColumnas.classList.add('flex'); };
document.getElementById('btn-cerrar-modal-columnas').onclick = () => { modalColumnas.classList.add('hidden'); modalColumnas.classList.remove('flex'); };

document.getElementById('btn-guardar-columnas').onclick = async () => {
    const checkboxes = document.querySelectorAll('.chk-columna');
    let nuevasOcultas = [];
    checkboxes.forEach((cb, idx) => { if (!cb.checked) nuevasOcultas.push(ordenColumnas[idx]); });
    
    columnasOcultas = nuevasOcultas;
    modalColumnas.classList.add('hidden'); modalColumnas.classList.remove('flex');
    hashTablaActual = ""; 
    
    await sincronizarConfiguracionNube(); 
    cargarCitasDelServidor();
    mostrarNotificacion("Nube Sincronizada", "Preferencias guardadas en tu cuenta.", "success");
};

// --- CREAR CAMPO DINÁMICO ---
document.getElementById('btn-agregar-campo').addEventListener('click', async () => {
    const nombre = prompt("Nombre del nuevo campo (ej: Tipo de Consulta, Alergias):");
    if(nombre && nombre.trim() !== "") {
        const nombreLimpio = nombre.trim();
        // Si el usuario intenta crear un campo que ya es de sistema, no lo dejamos
        if(COLUMNAS_SISTEMA.includes(nombreLimpio.toLowerCase())) {
            alert(`El campo '${nombreLimpio}' está reservado por el sistema.`); return;
        }

        if(!camposPlantilla.includes(nombreLimpio)) {
            camposPlantilla.push(nombreLimpio);
            // Lo insertamos en ordenColumnas justo antes de 'estado' para que se vea ordenado
            const idxEstado = ordenColumnas.indexOf('estado');
            if(idxEstado !== -1) ordenColumnas.splice(idxEstado, 0, nombreLimpio);
            else ordenColumnas.push(nombreLimpio);
            
            await sincronizarConfiguracionNube(); 
            
            hashTablaActual = ""; cargarCitasDelServidor(); 
            mostrarNotificacion("Campo Creado", `Columna guardada en la base de datos.`, "success");
            // Si el modal de cita está abierto, lo actualizamos
            if(!modal.classList.contains('hidden')) renderizarCamposModal();
        } else { alert("Este campo ya existe."); }
    }
});

// --- RENDERIZAR TODO EL FORMULARIO DINÁMICO ---
function renderizarCamposModal(datosCita = {}) {
    const container = document.getElementById('contenedor-campos-dinamicos');
    
    container.innerHTML = camposPlantilla.map(nombre => {
        // Asignamos tipos de input inteligentes según el nombre del campo
        let inputType = 'text';
        let nombreMinuscula = nombre.toLowerCase();
        if (nombreMinuscula.includes('fecha')) inputType = 'date';
        else if (nombreMinuscula.includes('hora')) inputType = 'time';
        else if (nombreMinuscula.includes('edad') || nombreMinuscula.includes('cantidad')) inputType = 'number';

        return `
        <div class="relative group">
            <label class="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">${nombre}</label>
            <input type="${inputType}" data-key="${nombre}" value="${datosCita[nombre] || ''}" class="input-dinamico w-full p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition font-semibold text-slate-800">
            <button type="button" onclick="eliminarCampo('${nombre}')" class="absolute top-0 right-0 text-red-400 hover:text-red-600 text-[10px] font-black p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-bl-lg">Quitar</button>
        </div>
        `;
    }).join('');
}

window.eliminarCampo = async (nombre) => {
    if(confirm(`¿Eliminar la columna "${nombre}" en todas las vistas?`)) {
        camposPlantilla = camposPlantilla.filter(c => c !== nombre);
        ordenColumnas = ordenColumnas.filter(c => c !== nombre);
        
        await sincronizarConfiguracionNube(); 
        
        renderizarCamposModal(); hashTablaActual = ""; cargarCitasDelServidor();
    }
};

function resetearFormulario() {
    idCitaEnEdicion = null;
    document.getElementById('titulo-modal').innerText = "Nueva Cita";
    renderizarCamposModal(); 
}

// --- LOGIN SEGURO CON LA NUBE ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-usuario').value.trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Autenticando..."; btnSubmit.disabled = true;

    try {
        const res = await fetch(N8N_LOGIN_URL, { 
            method: 'POST', body: JSON.stringify({usuario: u, password: p}), headers: {'Content-Type': 'application/json'} 
        });
        const data = await res.json();

        if (data.success) {
            clienteLogueado = u;
            
            let dbConfig = {};
            if (typeof data.config === 'string') {
                try { dbConfig = JSON.parse(data.config); } catch (err) {}
            } else if (typeof data.config === 'object') {
                dbConfig = data.config;
            }

            // Si es un cliente nuevo y no tiene campos, le cargamos la plantilla por defecto
            camposPlantilla = dbConfig.campos_plantilla && dbConfig.campos_plantilla.length > 0 ? dbConfig.campos_plantilla : [...PLANTILLA_POR_DEFECTO];
            columnasOcultas = dbConfig.columnas_ocultas || [];
            ordenColumnas = dbConfig.orden_columnas && dbConfig.orden_columnas.length > 0 
                            ? dbConfig.orden_columnas 
                            : ['id', ...camposPlantilla, 'estado'];

            // Asegurar que ID y Estado siempre estén presentes
            if (!ordenColumnas.includes('id')) ordenColumnas.unshift('id');
            if (!ordenColumnas.includes('estado')) ordenColumnas.push('estado');

            document.getElementById('seccion-login').classList.add('hidden');
            document.getElementById('seccion-panel').classList.remove('hidden');
            document.getElementById('nombre-cliente-titulo').innerText = "Usuario: " + u;
            
            cargarCitasDelServidor();
            loopSincronizacion = setInterval(cargarCitasDelServidor, 10000);
            mostrarNotificacion("Acceso Aprobado", "Entorno personalizado cargado.", "success");
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    } catch (err) {
        console.error(err);
        alert("Error de conexión con el servidor.");
    } finally {
        btnSubmit.innerText = "Acceder al panel"; btnSubmit.disabled = false;
    }
});

// --- MOTOR PRINCIPAL ---
async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas || (Array.isArray(data) ? data : []);
        
        if (citasAnteriores.length > 0) {
            citas.forEach(nuevaCita => {
                const citaVieja = citasAnteriores.find(c => c.id === nuevaCita.id);
                if (citaVieja && citaVieja.estado !== nuevaCita.estado) {
                    // Solo mostramos notificación si existe un nombre dentro del JSON, sino un genérico
                    let nombrePaciente = "";
                    try { 
                        let jsonParseado = typeof nuevaCita.campos_personalizados === 'string' ? JSON.parse(nuevaCita.campos_personalizados) : nuevaCita.campos_personalizados;
                        nombrePaciente = jsonParseado['Nombres'] || `Cita #${nuevaCita.id}`;
                    } catch(e) { nombrePaciente = `Cita #${nuevaCita.id}`; }
                    
                    mostrarNotificacion('Actualización', `${nombrePaciente} ha cambiado a: ${nuevaCita.estado.toUpperCase()}`, nuevaCita.estado.toLowerCase());
                }
            });
        }
        
        const nuevoHash = JSON.stringify(citas) + JSON.stringify(ordenColumnas) + JSON.stringify(columnasOcultas);
        if (nuevoHash === hashTablaActual) return; 
        hashTablaActual = nuevoHash;
        citasAnteriores = JSON.parse(JSON.stringify(citas));

        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'confirmó').length;
        document.getElementById('stat-canceladas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'canceló' || c.estado?.toLowerCase() === 'cancelada').length;
        document.getElementById('stat-reprogramadas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'reprogramó' || c.estado?.toLowerCase() === 'reprogramada').length;

        let htmlCabecera = `<tr>`;
        ordenColumnas.forEach(colKey => {
            if (!columnasOcultas.includes(colKey)) { 
                htmlCabecera += `<th class="px-6 py-4">${NOMBRES_COLUMNAS_SISTEMA[colKey] || colKey}</th>`; 
            }
        });
        htmlCabecera += `<th class="px-6 py-4 text-right">Acciones</th></tr>`;
        document.getElementById('tabla-cabecera').innerHTML = htmlCabecera;

        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            // Toda la info ahora vive aquí
            let camposParseados = {};
            try { camposParseados = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : (c.campos_personalizados || {}); } catch(e){}
            const citaString = encodeURIComponent(JSON.stringify({...c, camposParseados}));
            
            let estadoClass = 'bg-slate-100 text-slate-600';
            const estadoLower = c.estado?.toLowerCase() || '';
            if(estadoLower === 'confirmó') estadoClass = 'bg-emerald-100 text-emerald-700';
            else if(estadoLower.includes('cancel')) estadoClass = 'bg-red-100 text-red-700';
            else if(estadoLower.includes('reprogram')) estadoClass = 'bg-amber-100 text-amber-700';
            
            let row = `<tr class="table-row-hover">`;
            ordenColumnas.forEach(colKey => {
                if (!columnasOcultas.includes(colKey)) {
                    let valor = '-';
                    // Evaluamos campos de sistema
                    if (colKey === 'id') valor = `<span class="font-bold text-slate-400">${c.id || '-'}</span>`;
                    else if (colKey === 'estado') valor = `<span class="px-3 py-1.5 rounded-lg text-[10px] font-black ${estadoClass} uppercase shadow-sm">${c.estado || 'pendiente'}</span>`;
                    else {
                        // TODO lo demás viene del JSON generado dinámicamente
                        valor = camposParseados[colKey] || '-';
                        // Para darle un toque visual, si detecta un campo "Nombres" o "Profesional", le da estilo
                        if(colKey.toLowerCase().includes('nombres')) valor = `<span class="font-black text-slate-800">${valor}</span>`;
                        if(colKey.toLowerCase().includes('profesional')) valor = `<span class="font-bold text-blue-600">${valor}</span>`;
                    }
                    
                    row += `<td class="px-6 py-4">${valor}</td>`;
                }
            });
            row += `<td class="px-6 py-4 text-right"><button onclick="prepararEdicion('${citaString}')" class="text-blue-700 font-bold hover:text-white bg-blue-50 hover:bg-blue-600 px-5 py-2.5 rounded-xl transition-all shadow-sm">Editar</button></td></tr>`;
            return row;
        }).join('');
    } catch (e) { console.error("Error al cargar:", e); }
}

window.prepararEdicion = (citaString) => {
    const c = JSON.parse(decodeURIComponent(citaString));
    idCitaEnEdicion = c.id; 
    document.getElementById('titulo-modal').innerText = "Editando Cita #" + c.id;
    
    // Simplemente pasamos el paquete parseado al renderizador para que llene los inputs
    renderizarCamposModal(c.camposParseados);
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // El sistema dinámico: Coge TODOS los inputs y los empaqueta automáticamente
    let camposDinamicosObj = {};
    document.querySelectorAll('.input-dinamico').forEach(i => { 
        if(i.value) camposDinamicosObj[i.getAttribute('data-key')] = i.value; 
    });

    const payload = {
        ...(idCitaEnEdicion && { id: idCitaEnEdicion }), 
        id_cliente: clienteLogueado,
        estado: 'esperando respuesta',
        // Todo el formulario viaja en esta única caja
        campos_personalizados: camposDinamicosObj
    };

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Guardando..."; btnSubmit.disabled = true;
    try {
        await fetch(N8N_POST_URL, { method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} });
        cerrarModal(); resetearFormulario();
        mostrarNotificacion("Éxito", "Guardado correctamente.", "success");
        hashTablaActual = ""; await cargarCitasDelServidor();
    } catch (error) { mostrarNotificacion("Error", "No se pudo guardar.", "error"); } 
    finally { btnSubmit.innerText = "Guardar Información"; btnSubmit.disabled = false; }
});
