// ================================================
// app.js - COMPLETO CON CABECERA SIEMPRE VISIBLE
// ================================================

const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const N8N_LOGIN_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/login';
const N8N_CONFIG_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/guardarconfig';

let clienteLogueado = "";
let idCitaEnEdicion = null;

const COLUMNAS_FIJAS = ['id', 'procesado', 'estado'];
const NOMBRES_COLUMNAS_SISTEMA = {
    'id': 'ID',
    'procesado': 'Procesado',
    'estado': 'Estado'
};
const CAMPOS_FIJOS_FORMULARIO = ['procesado', 'estado'];

let camposPlantilla = [];
let columnasOcultas = [];
let ordenColumnas = ['id', 'procesado', 'estado'];
let valoresDefault = {};

let citasAnteriores = [];
let hashTablaActual = "";
let loopSincronizacion = null;

const modal = document.getElementById('modal-cita');
const modalColumnas = document.getElementById('modal-columnas');
const modalNuevoCampo = document.getElementById('modal-nuevo-campo');

// --- NOTIFICACIONES ---
window.mostrarNotificacion = (titulo, mensaje, tipo = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bgIcono = 'bg-blue-100 text-blue-600', iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
    if(tipo === 'success' || tipo === 'confirmó') { bgIcono = 'bg-emerald-100 text-emerald-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`; }
    else if(tipo === 'error' || tipo === 'canceló') { bgIcono = 'bg-red-100 text-red-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`; }
    else if(tipo === 'warning' || tipo === 'reprogramó') { bgIcono = 'bg-amber-100 text-amber-600'; iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`; }

    toast.className = `toast-enter flex items-start gap-4 p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 pointer-events-auto cursor-pointer`;
    toast.innerHTML = `<div class="flex-shrink-0 w-10 h-10 ${bgIcono} rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div><div class="flex-1"><h4 class="text-sm font-black text-slate-800">${titulo}</h4><p class="text-[13px] text-slate-500 font-medium leading-tight mt-0.5">${mensaje}</p></div>`;
    container.appendChild(toast);
    toast.onclick = () => toast.remove();
    setTimeout(() => { toast.classList.add('opacity-0', 'transition-opacity', 'duration-300'); setTimeout(() => toast.remove(), 300); }, 6000);
};

// --- GUARDAR CONFIGURACIÓN EN LA NUBE ---
async function sincronizarConfiguracionNube() {
    const payload = {
        usuario: clienteLogueado,
        config: {
            orden_columnas: ordenColumnas,
            columnas_ocultas: columnasOcultas,
            campos_plantilla: camposPlantilla,
            valores_default: valoresDefault
        }
    };
    try {
        await fetch(N8N_CONFIG_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error guardando preferencias en la nube.");
    }
}

// --- EVENTOS MODAL PRINCIPAL ---
document.getElementById('btn-abrir-modal').onclick = () => { resetearFormulario(); modal.classList.remove('hidden'); modal.classList.add('flex'); };
const cerrarModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
document.getElementById('btn-cerrar-modal').onclick = cerrarModal;
document.getElementById('btn-cerrar-modal-secundario').onclick = cerrarModal;
document.getElementById('btn-cerrar-sesion').onclick = () => location.reload();
document.getElementById('btn-refrescar').onclick = () => {
    mostrarNotificacion("Sincronizando...", "Actualizando agenda médica.", "info");
    cargarCitasDelServidor();
};

// --- MODAL NUEVO CAMPO ---
document.getElementById('btn-agregar-campo').onclick = () => {
    document.getElementById('campo-nombre').value = '';
    document.getElementById('campo-valor-default').value = '';
    modalNuevoCampo.classList.remove('hidden');
    modalNuevoCampo.classList.add('flex');
};
document.getElementById('btn-cerrar-modal-campo').onclick = () => {
    modalNuevoCampo.classList.add('hidden');
    modalNuevoCampo.classList.remove('flex');
};

document.getElementById('form-nuevo-campo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('campo-nombre').value.trim();
    const valorDefault = document.getElementById('campo-valor-default').value.trim();

    if (!nombre) {
        alert("El nombre del campo es obligatorio.");
        return;
    }

    if (COLUMNAS_FIJAS.includes(nombre.toLowerCase())) {
        alert(`El campo '${nombre}' está reservado por el sistema.`);
        return;
    }

    if (camposPlantilla.includes(nombre)) {
        alert("Este campo ya existe.");
        return;
    }

    camposPlantilla.push(nombre);
    if (valorDefault) {
        valoresDefault[nombre] = valorDefault;
    }

    // Insertar antes de 'procesado'
    const idxProcesado = ordenColumnas.indexOf('procesado');
    if (idxProcesado !== -1) {
        ordenColumnas.splice(idxProcesado, 0, nombre);
    } else {
        const idxEstado = ordenColumnas.indexOf('estado');
        if (idxEstado !== -1) ordenColumnas.splice(idxEstado, 0, nombre);
        else ordenColumnas.push(nombre);
    }

    await sincronizarConfiguracionNube();
    modalNuevoCampo.classList.add('hidden');
    modalNuevoCampo.classList.remove('flex');
    hashTablaActual = "";
    cargarCitasDelServidor();
    mostrarNotificacion("Campo Creado", `Columna '${nombre}' guardada.`, "success");
    if (!modal.classList.contains('hidden')) renderizarCamposModal();
});

// --- GESTIÓN DE VISTAS Y ORDEN DE COLUMNAS ---
function renderizarModalVistas() {
    const container = document.getElementById('lista-columnas');
    container.innerHTML = ordenColumnas.map((colKey, index) => {
        const isChecked = !columnasOcultas.includes(colKey) ? 'checked' : '';
        const label = NOMBRES_COLUMNAS_SISTEMA[colKey] || `${colKey}`;
        return `
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
            <label class="flex items-center gap-3 cursor-pointer flex-1">
                <input type="checkbox" value="${colKey}" class="chk-columna w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" ${isChecked}>
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

document.getElementById('btn-configurar-columnas').onclick = () => {
    renderizarModalVistas();
    modalColumnas.classList.remove('hidden');
    modalColumnas.classList.add('flex');
};
document.getElementById('btn-cerrar-modal-columnas').onclick = () => {
    modalColumnas.classList.add('hidden');
    modalColumnas.classList.remove('flex');
};

document.getElementById('btn-guardar-columnas').onclick = async () => {
    const checkboxes = document.querySelectorAll('.chk-columna');
    let nuevasOcultas = [];
    checkboxes.forEach((cb, idx) => { if (!cb.checked) nuevasOcultas.push(ordenColumnas[idx]); });
    columnasOcultas = nuevasOcultas;
    modalColumnas.classList.add('hidden');
    modalColumnas.classList.remove('flex');
    hashTablaActual = "";
    await sincronizarConfiguracionNube();
    cargarCitasDelServidor();
    mostrarNotificacion("Nube Sincronizada", "Preferencias guardadas en tu cuenta.", "success");
};

// --- RENDERIZAR FORMULARIO DE CITA ---
function renderizarCamposModal(datosCita = {}) {
    const container = document.getElementById('contenedor-campos-dinamicos');
    let html = '';

    // Campos fijos: procesado y estado
    CAMPOS_FIJOS_FORMULARIO.forEach(nombre => {
        const valor = datosCita[nombre] || '';
        html += `
        <div class="relative group">
            <label class="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">${nombre}</label>
            <input type="text" data-key="${nombre}" value="${valor}" class="input-fijo w-full bg-white border border-slate-200 rounded-xl p-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
        </div>
        `;
    });

    // Campos personalizados
    camposPlantilla.forEach(nombre => {
        let valor = datosCita[nombre] || '';
        // Si es nueva cita y no hay datos, usar valor por defecto si existe
        if (!idCitaEnEdicion && !valor && valoresDefault[nombre]) {
            valor = valoresDefault[nombre];
        }
        html += `
        <div class="relative group">
            <label class="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">${nombre}</label>
            <input type="text" data-key="${nombre}" value="${valor}" class="input-dinamico w-full bg-white border border-slate-200 rounded-xl p-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
            <button type="button" onclick="eliminarCampo('${nombre}')" class="absolute top-0 right-0 text-red-400 hover:text-red-600 text-[10px] font-black p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-bl-lg">✕</button>
        </div>
        `;
    });

    container.innerHTML = html;
}

window.eliminarCampo = async (nombre) => {
    if (confirm(`¿Eliminar la columna "${nombre}" en todas las vistas?`)) {
        camposPlantilla = camposPlantilla.filter(c => c !== nombre);
        ordenColumnas = ordenColumnas.filter(c => c !== nombre);
        delete valoresDefault[nombre];
        await sincronizarConfiguracionNube();
        renderizarCamposModal();
        hashTablaActual = "";
        cargarCitasDelServidor();
    }
};

function resetearFormulario() {
    idCitaEnEdicion = null;
    document.getElementById('titulo-modal').innerText = "Nueva Cita";
    renderizarCamposModal({ procesado: 'Pendiente', estado: 'Esperando respuesta' });
}

// --- LOGIN ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-usuario').value.trim().toLowerCase();
    const p = document.getElementById('login-password').value;

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Autenticando...";
    btnSubmit.disabled = true;

    try {
        const res = await fetch(N8N_LOGIN_URL, {
            method: 'POST',
            body: JSON.stringify({ usuario: u, password: p }),
            headers: { 'Content-Type': 'application/json' }
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

            camposPlantilla = dbConfig.campos_plantilla || [];
            camposPlantilla = camposPlantilla.filter(c => !COLUMNAS_FIJAS.includes(c.toLowerCase()));

            valoresDefault = dbConfig.valores_default || {};

            let ordenGuardado = dbConfig.orden_columnas || [];
            let personalizadosEnOrden = ordenGuardado.filter(c => camposPlantilla.includes(c) && !COLUMNAS_FIJAS.includes(c));
            let personalizadosFaltantes = camposPlantilla.filter(c => !personalizadosEnOrden.includes(c));
            let personalizadosOrdenados = [...personalizadosEnOrden, ...personalizadosFaltantes];

            let nuevoOrden = ['id', ...personalizadosOrdenados, 'procesado', 'estado'];
            ordenColumnas = [...new Set(nuevoOrden)];

            columnasOcultas = dbConfig.columnas_ocultas || [];

            const configNueva = {
                orden_columnas: ordenColumnas,
                columnas_ocultas: columnasOcultas,
                campos_plantilla: camposPlantilla,
                valores_default: valoresDefault
            };
            const configOriginal = {
                orden_columnas: dbConfig.orden_columnas || [],
                columnas_ocultas: dbConfig.columnas_ocultas || [],
                campos_plantilla: dbConfig.campos_plantilla || [],
                valores_default: dbConfig.valores_default || {}
            };
            if (JSON.stringify(configNueva) !== JSON.stringify(configOriginal)) {
                try {
                    await fetch(N8N_CONFIG_URL, {
                        method: 'POST',
                        body: JSON.stringify({ usuario: clienteLogueado, config: configNueva }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.warn('No se pudo guardar la configuración:', e);
                }
            }

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
        btnSubmit.innerText = "Acceder al panel";
        btnSubmit.disabled = false;
    }
});

// --- MOTOR PRINCIPAL (CON CABECERA SIEMPRE VISIBLE) ---
async function cargarCitasDelServidor() {
    try {
        const res = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await res.json();
        const citas = data.citas || (Array.isArray(data) ? data : []);

        // --- 1. RENDERIZAR CABECERA SIEMPRE (incluso sin citas) ---
        const columnasMostradas = ordenColumnas.filter(col => !columnasOcultas.includes(col));
        let htmlCabecera = `<tr>`;
        columnasMostradas.forEach(colKey => {
            const label = NOMBRES_COLUMNAS_SISTEMA[colKey] || colKey;
            htmlCabecera += `<th class="px-6 py-4 text-slate-600 font-extrabold text-xs uppercase tracking-widest">${label}</th>`;
        });
        htmlCabecera += `<th class="px-6 py-4 text-right text-slate-600 font-extrabold text-xs uppercase tracking-widest">Acciones</th></tr>`;
        document.getElementById('tabla-cabecera').innerHTML = htmlCabecera;

        // --- 2. ACTUALIZAR ESTADÍSTICAS (siempre) ---
        document.getElementById('stat-total').innerText = citas.length;
        document.getElementById('stat-confirmadas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'confirmó').length;
        document.getElementById('stat-canceladas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'canceló' || c.estado?.toLowerCase() === 'cancelada').length;
        document.getElementById('stat-reprogramadas').innerText = citas.filter(c => c.estado?.toLowerCase() === 'reprogramó' || c.estado?.toLowerCase() === 'reprogramada').length;

        // --- 3. SI NO HAY CITAS, mostrar mensaje y SALIR (la cabecera ya está pintada) ---
        if (citas.length === 0) {
            const colspan = columnasMostradas.length + 1; // +1 por columna de acciones
            document.getElementById('tabla-cuerpo').innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="px-6 py-12 text-center text-slate-400 font-medium">
                        <div class="flex flex-col items-center gap-2">
                            <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <span>No hay citas registradas</span>
                            <span class="text-sm text-slate-400">Crea una nueva cita con el botón "Nueva Cita"</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // --- 4. NOTIFICACIONES DE CAMBIOS DE ESTADO (solo si hay citas) ---
        if (citasAnteriores.length > 0) {
            citas.forEach(nuevaCita => {
                const citaVieja = citasAnteriores.find(c => c.id === nuevaCita.id);
                if (citaVieja && citaVieja.estado !== nuevaCita.estado) {
                    let nombrePaciente = "";
                    try {
                        let jsonParseado = typeof nuevaCita.campos_personalizados === 'string' ? JSON.parse(nuevaCita.campos_personalizados) : nuevaCita.campos_personalizados;
                        nombrePaciente = jsonParseado['Nombres'] || `Cita #${nuevaCita.id}`;
                    } catch(e) { nombrePaciente = `Cita #${nuevaCita.id}`; }
                    mostrarNotificacion('Actualización', `${nombrePaciente} ha cambiado a: ${nuevaCita.estado.toUpperCase()}`, nuevaCita.estado.toLowerCase());
                }
            });
        }

        // --- 5. RENDERIZAR CUERPO DE LA TABLA (solo si hay citas) ---
        const nuevoHash = JSON.stringify(citas) + JSON.stringify(ordenColumnas) + JSON.stringify(columnasOcultas);
        if (nuevoHash === hashTablaActual) return;
        hashTablaActual = nuevoHash;
        citasAnteriores = JSON.parse(JSON.stringify(citas));

        document.getElementById('tabla-cuerpo').innerHTML = citas.map(c => {
            let camposParseados = {};
            try {
                camposParseados = typeof c.campos_personalizados === 'string' ? JSON.parse(c.campos_personalizados) : (c.campos_personalizados || {});
            } catch(e) {}
            const citaString = encodeURIComponent(JSON.stringify({...c, camposParseados}));

            let badgeClass = 'badge-pendiente';
            let estadoLower = c.estado?.toLowerCase() || '';
            if (estadoLower === 'confirmó') badgeClass = 'badge-confirmada';
            else if (estadoLower.includes('cancel')) badgeClass = 'badge-cancelada';
            else if (estadoLower.includes('reprogram')) badgeClass = 'badge-reprogramada';
            else if (estadoLower === 'esperando respuesta') badgeClass = 'badge-esperando';

            let row = `<tr class="table-row hover:bg-slate-50">`;
            columnasMostradas.forEach(colKey => {
                let valor = '-';
                if (colKey === 'id') {
                    valor = `<span class="font-bold text-slate-400">${c.id || '-'}</span>`;
                } else if (colKey === 'estado') {
                    valor = `<span class="badge ${badgeClass}">${c.estado || 'pendiente'}</span>`;
                } else if (colKey === 'procesado') {
                    valor = `<span class="font-medium text-slate-600">${c.procesado || '-'}</span>`;
                } else {
                    valor = camposParseados[colKey] || '-';
                    if (colKey.toLowerCase().includes('nombres')) {
                        valor = `<span class="font-bold text-slate-800">${valor}</span>`;
                    } else if (colKey.toLowerCase().includes('profesional')) {
                        valor = `<span class="font-bold text-blue-600">${valor}</span>`;
                    }
                }
                row += `<td class="px-6 py-4 text-slate-700">${valor}</td>`;
            });
            row += `<td class="px-6 py-4 text-right"><button onclick="prepararEdicion('${citaString}')" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold transition">Editar</button></td></tr>`;
            return row;
        }).join('');
    } catch (e) {
        console.error("Error al cargar:", e);
    }
}

// --- PREPARAR EDICIÓN DE CITA ---
window.prepararEdicion = (citaString) => {
    const c = JSON.parse(decodeURIComponent(citaString));
    idCitaEnEdicion = c.id;
    document.getElementById('titulo-modal').innerText = "Editando Cita #" + c.id;
    const datos = {
        procesado: c.procesado || '',
        estado: c.estado || 'Esperando respuesta',
        ...c.camposParseados
    };
    renderizarCamposModal(datos);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// --- GUARDAR CITA (NUEVA O EDICIÓN) ---
document.getElementById('form-cita').addEventListener('submit', async (e) => {
    e.preventDefault();

    const camposFijos = {};
    document.querySelectorAll('.input-fijo').forEach(i => {
        camposFijos[i.getAttribute('data-key')] = i.value;
    });

    const camposDinamicos = {};
    document.querySelectorAll('.input-dinamico').forEach(i => {
        if (i.value) camposDinamicos[i.getAttribute('data-key')] = i.value;
    });

    const payload = {
        ...(idCitaEnEdicion && { id: idCitaEnEdicion }),
        procesado: camposFijos.procesado || '',
        estado: camposFijos.estado || 'Esperando respuesta',
        campos_personalizados: camposDinamicos
    };

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "Guardando...";
    btnSubmit.disabled = true;

    try {
        await fetch(N8N_POST_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        cerrarModal();
        resetearFormulario();
        mostrarNotificacion("Éxito", "Guardado correctamente.", "success");
        hashTablaActual = "";
        await cargarCitasDelServidor();
    } catch (error) {
        mostrarNotificacion("Error", "No se pudo guardar.", "error");
    } finally {
        btnSubmit.innerText = "Guardar Información";
        btnSubmit.disabled = false;
    }
});
