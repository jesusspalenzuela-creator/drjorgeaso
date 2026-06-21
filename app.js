// CONFIGURACIÓN CENTRAL - Reemplaza con tus Webhooks reales de N8N
const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

// Simulador de Login sencillo para el Prototipo (Mismo frontend para todos)
const USUARIOS_VALIDOS = {
    "drjorgeaso": "1234",
    "inovixe": "admin"
};

let clienteLogueado = "";

// CONTROL DE LOGIN
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
        
        // Cargar los datos de este cliente específico
        cargarCitasDelServidor();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

document.getElementById('btn-cerrar-sesion').addEventListener('click', function() {
    location.reload();
});

// CREACIÓN DE CAMPOS MANUALES DESDE LA INTERFAZ
document.getElementById('btn-agregar-campo-manual').addEventListener('click', function() {
    const contenedor = document.getElementById('contenedor-campos-manuales');
    const divId = 'campo_' + Date.now();
    
    const div = document.createElement('div');
    div.id = divId;
    div.className = "flex gap-2 items-center";
    div.innerHTML = `
        <input type="text" placeholder="Nombre Campo (ej: Alergias)" class="nombre-campo-manual border rounded p-1 text-xs w-1/2 bg-purple-50" required>
        <input type="text" placeholder="Valor" class="valor-campo-manual border rounded p-1 text-xs w-1/2" required>
        <button type="button" onclick="document.getElementById('${divId}').remove()" class="text-red-500 font-bold text-xs px-1">X</button>
    `;
    contenedor.appendChild(div);
});

// CARGAR DATOS (BOTÓN REFRESCAR O LOGIN)
document.getElementById('btn-refrescar').addEventListener('click', cargarCitasDelServidor);

async function cargarCitasDelServidor() {
    try {
        // Le pasamos el cliente por la URL para que N8N sepa de quién buscar
        const respuesta = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const citas = await respuesta.json();

        const cabecera = document.getElementById('tabla-cabecera');
        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = "";

        // Definir Cabeceras Fijas
        let htmlCabecera = `
            <th class="p-3">ID</th>
            <th class="p-3">Identificación</th>
            <th class="p-3">Paciente</th>
            <th class="p-3">Teléfono</th>
            <th class="p-3">Fecha / Hora</th>
            <th class="p-3">Procesado</th>
            <th class="p-3">Estado</th>
        `;

        // Analizar campos personalizados de las citas para crear columnas dinámicas
        let todasLasKeysManuales = new Set();
        citas.forEach(c => {
            if(c.campos_personalizados) {
                Object.keys(c.campos_personalizados).forEach(key => todasLasKeysManuales.add(key));
            }
        });

        // Añadir las columnas dinámicas creadas manualmente a la cabecera
        todasLasKeysManuales.forEach(key => {
            htmlCabecera += `<th class="p-3 text-purple-700 capitalize">${key}</th>`;
        });
        cabecera.innerHTML = htmlCabecera;

        // Pintar Filas
        citas.forEach(cita => {
            let colorEstado = cita.estado === 'confirmó' ? 'bg-green-100 text-green-800' : 
                              cita.estado === 'canceló' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
            
            let colorProcesado = cita.procesado === 'enviado' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';

            let htmlFila = `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 font-semibold">${cita.id}</td>
                    <td class="p-3">${cita.identificacion}</td>
                    <td class="p-3">${cita.nombres} ${cita.apellidos}</td>
                    <td class="p-3">${cita.telefono}</td>
                    <td class="p-3">${cita.fecha_cita} / ${cita.hora_cita}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs ${colorProcesado}">${cita.procesado}</span></td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs ${colorEstado}">${cita.estado}</span></td>
            `;

            // Rellenar las celdas dinámicas de esta fila
            todasLasKeysManuales.forEach(key => {
                let valor = (cita.campos_personalizados && cita.campos_personalizados[key]) ? cita.campos_personalizados[key] : '-';
                htmlFila += `<td class="p-3 text-purple-600">${valor}</td>`;
            });

            htmlFila += `</tr>`;
            cuerpo.innerHTML += htmlFila;
        });

    } catch (error) {
        console.error("Error al obtener citas:", error);
    }
}

// ENVIAR / CARGAR NUEVA CITA A LA BASE DE DATOS
document.getElementById('form-cita').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Construir el objeto de campos personalizados recolectando los inputs manuales
    let camposPersonalizadosObj = {};
    const nombresCampos = document.querySelectorAll('.nombre-campo-manual');
    const valoresCampos = document.querySelectorAll('.valor-campo-manual');
    
    nombresCampos.forEach((input, index) => {
        const key = input.value.trim().toLowerCase().replace(/ /g, "_");
        if(key) {
            camposPersonalizadosObj[key] = valoresCampos[index].value.trim();
        }
    });

    // Construir el cuerpo de la cita completa
    const datosCita = {
        identificacion: document.getElementById('form-identificacion').value,
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        edad: parseInt(document.getElementById('form-edad').value),
        telefono: document.getElementById('form-telefono').value,
        fecha_cita: document.getElementById('form-fecha').value,
        hora_cita: document.getElementById('form-hora').value,
        motivo: document.getElementById('form-motivo').value,
        profesional: document.getElementById('form-profesional').value, // El ID de cliente logueado
        campos_personalizados: camposPersonalizadosObj
    };

    try {
        const res = await fetch(N8N_POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCita)
        });

        if (res.ok) {
            alert("¡Cita cargada con éxito en la base de datos!");
            document.getElementById('form-cita').reset();
            document.getElementById('contenedor-campos-manuales').innerHTML = "";
            cargarCitasDelServidor(); // Recargar la tabla automáticamente
        }
    } catch (error) {
        alert("Error al guardar la cita.");
        console.error(error);
    }
});
