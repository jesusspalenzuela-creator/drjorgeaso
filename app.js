// CONFIGURACIÓN CENTRAL
const N8N_GET_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL = 'https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';

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
        cargarCitasDelServidor();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

// CARGAR DATOS
document.getElementById('btn-refrescar').addEventListener('click', cargarCitasDelServidor);

async function cargarCitasDelServidor() {
    try {
        const respuesta = await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
        const data = await respuesta.json();
        
        // LÓGICA A PRUEBA DE ERRORES:
        // Si el nodo Code devuelve { "citas": [...] }, usamos data.citas
        // Si devuelve directamente [...], usamos data
        const listaCitas = data.citas ? data.citas : (Array.isArray(data) ? data : []);

        const cuerpo = document.getElementById('tabla-cuerpo');
        cuerpo.innerHTML = "";

        if (listaCitas.length === 0) {
            console.warn("No hay citas recibidas.");
            return;
        }

        listaCitas.forEach(cita => {
            const htmlFila = `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3">${cita.id || '-'}</td>
                    <td class="p-3">${cita.identificacion || '-'}</td>
                    <td class="p-3">${cita.nombres || ''} ${cita.apellidos || ''}</td>
                    <td class="p-3">${cita.telefono || '-'}</td>
                    <td class="p-3">${cita.fecha_cita ? cita.fecha_cita.split('T')[0] : ''}</td>
                    <td class="p-3">${cita.procesado || 'pendiente'}</td>
                    <td class="p-3">${cita.estado || 'esperando'}</td>
                </tr>
            `;
            cuerpo.innerHTML += htmlFila;
        });
    } catch (error) {
        console.error("Error al cargar citas:", error);
    }
}

// CREAR NUEVA CITA
document.getElementById('form-cita').addEventListener('submit', async function(e) {
    e.preventDefault();

    let camposPersonalizadosObj = {};
    document.querySelectorAll('.nombre-campo-manual').forEach((input, index) => {
        const key = input.value.trim().toLowerCase().replace(/ /g, "_");
        if(key) camposPersonalizadosObj[key] = document.querySelectorAll('.valor-campo-manual')[index].value.trim();
    });

    const datosCita = {
        identificacion: document.getElementById('form-identificacion').value,
        nombres: document.getElementById('form-nombres').value,
        apellidos: document.getElementById('form-apellidos').value,
        edad: parseInt(document.getElementById('form-edad').value),
        telefono: document.getElementById('form-telefono').value,
        fecha_cita: document.getElementById('form-fecha').value,
        hora_cita: document.getElementById('form-hora').value,
        motivo: document.getElementById('form-motivo').value,
        profesional: document.getElementById('form-profesional').value,
        campos_personalizados: camposPersonalizadosObj
    };

    try {
        const res = await fetch(N8N_POST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCita)
        });

        if (res.ok) {
            alert("¡Cita cargada con éxito!");
            document.getElementById('form-cita').reset();
            cargarCitasDelServidor();
        }
    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    }
});
