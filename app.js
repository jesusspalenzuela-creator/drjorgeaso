const N8N_GET_URL='https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/consultasql';
const N8N_POST_URL='https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/crearcita';
const N8N_LOGIN_URL='https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/login';
const N8N_CONFIG_URL='https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/guardarconfig';
const N8N_DELETE_URL='https://dr-jorge-aso-n8n.pmsak1.easypanel.host/webhook/eliminar';
let clienteLogueado="";
let idCitaEnEdicion=null;
const COLUMNAS_FIJAS=['id','procesado','estado'];
const NOMBRES_COLUMNAS_SISTEMA={'id':'ID','procesado':'Procesado','estado':'Estado'};
const CAMPOS_FIJOS_FORMULARIO=['procesado','estado'];
let camposPlantilla=[];
let columnasOcultas=[];
let ordenColumnas=['id','procesado','estado'];
let valoresDefault={};
let citasAnteriores=[];
let hashTablaActual="";
let loopSincronizacion=null;
let citasCompletas=[]; // Almacena todas las citas para búsqueda
let filtroBusqueda="";
const modal=document.getElementById('modal-cita');
const modalColumnas=document.getElementById('modal-columnas');
const modalNuevoCampo=document.getElementById('modal-nuevo-campo');
const modalConfirmacion=document.getElementById('modal-confirmacion');
let pendingDeleteId=null;
window.mostrarNotificacion=(titulo,mensaje,tipo='info')=>{
const container=document.getElementById('toast-container');
const toast=document.createElement('div');
let bgIcono='bg-blue-100 text-blue-600',iconSvg=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
if(tipo==='success'||tipo==='confirmó'){bgIcono='bg-emerald-100 text-emerald-600';iconSvg=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`;}
else if(tipo==='error'||tipo==='canceló'){bgIcono='bg-red-100 text-red-600';iconSvg=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`;}
else if(tipo==='warning'||tipo==='reprogramó'){bgIcono='bg-amber-100 text-amber-600';iconSvg=`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;}
toast.className=`toast-enter flex items-start gap-4 p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 pointer-events-auto cursor-pointer`;
toast.innerHTML=`<div class="flex-shrink-0 w-10 h-10 ${bgIcono} rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div><div class="flex-1"><h4 class="text-sm font-black text-slate-800">${titulo}</h4><p class="text-[13px] text-slate-500 font-medium leading-tight mt-0.5">${mensaje}</p></div>`;
container.appendChild(toast);
toast.onclick=()=>toast.remove();
setTimeout(()=>{toast.classList.add('opacity-0','transition-opacity','duration-300');setTimeout(()=>toast.remove(),300);},6000);
};
async function sincronizarConfiguracionNube(){
const payload={usuario:clienteLogueado,config:{orden_columnas:ordenColumnas,columnas_ocultas:columnasOcultas,campos_plantilla:camposPlantilla,valores_default:valoresDefault}};
try{await fetch(N8N_CONFIG_URL,{method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json'}});}catch(error){console.error("Error guardando preferencias en la nube.");}
}
function mostrarConfirmacion(mensaje,onConfirm){
document.getElementById('mensaje-confirmacion').innerText=mensaje;
modalConfirmacion.classList.remove('hidden');
modalConfirmacion.classList.add('flex');
pendingDeleteId=onConfirm;
}
document.getElementById('btn-cerrar-confirmacion').onclick=()=>{
modalConfirmacion.classList.add('hidden');
modalConfirmacion.classList.remove('flex');
pendingDeleteId=null;
};
document.getElementById('btn-confirmar-cancelar').onclick=()=>{
modalConfirmacion.classList.add('hidden');
modalConfirmacion.classList.remove('flex');
pendingDeleteId=null;
};
document.getElementById('btn-confirmar-eliminar').onclick=async()=>{
if(pendingDeleteId){await pendingDeleteId();modalConfirmacion.classList.add('hidden');modalConfirmacion.classList.remove('flex');pendingDeleteId=null;}
};
window.eliminarCita=(id)=>{
mostrarConfirmacion(`¿Estás seguro de que quieres eliminar la cita #${id}? Esta acción no se puede deshacer.`,async()=>{
try{
const response=await fetch(N8N_DELETE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})});
if(!response.ok)throw new Error(`Error ${response.status}`);
const result=await response.json();
if(result.success){mostrarNotificacion("Cita Eliminada",`La cita #${id} ha sido eliminada correctamente.`,"success");hashTablaActual="";await cargarCitasDelServidor();}
else{mostrarNotificacion("Error",result.message||"No se pudo eliminar la cita.","error");}
}catch(error){console.error("Error al eliminar:",error);mostrarNotificacion("Error","Ocurrió un error al intentar eliminar la cita.","error");}
});
};
window.abrirWhatsApp=(telefono)=>{
if(!telefono)return;
let numero=telefono.toString().replace(/\s/g,'').replace(/-/g,'');
if(!numero.startsWith('+'))numero='+'+numero;
window.open(`https://wa.me/${numero}`,'_blank');
};
document.getElementById('btn-abrir-modal').onclick=()=>{resetearFormulario();modal.classList.remove('hidden');modal.classList.add('flex');};
const cerrarModal=()=>{modal.classList.add('hidden');modal.classList.remove('flex');};
document.getElementById('btn-cerrar-modal').onclick=cerrarModal;
document.getElementById('btn-cerrar-modal-secundario').onclick=cerrarModal;
document.getElementById('btn-cerrar-sesion-sidebar').onclick=()=>location.reload();
document.getElementById('btn-refrescar').onclick=()=>{mostrarNotificacion("Sincronizando...","Actualizando agenda médica.","info");cargarCitasDelServidor();};
document.getElementById('btn-refrescar-citas').onclick=()=>{mostrarNotificacion("Sincronizando...","Actualizando agenda médica.","info");cargarCitasDelServidor();};
document.getElementById('btn-agregar-campo').onclick=()=>{
document.getElementById('campo-nombre').value='';
document.getElementById('campo-valor-default').value='';
modalNuevoCampo.classList.remove('hidden');
modalNuevoCampo.classList.add('flex');
};
document.getElementById('btn-cerrar-modal-campo').onclick=()=>{
modalNuevoCampo.classList.add('hidden');
modalNuevoCampo.classList.remove('flex');
};
document.getElementById('form-nuevo-campo').addEventListener('submit',async(e)=>{
e.preventDefault();
const nombre=document.getElementById('campo-nombre').value.trim();
const valorDefault=document.getElementById('campo-valor-default').value.trim();
if(!nombre){alert("El nombre del campo es obligatorio.");return;}
if(COLUMNAS_FIJAS.includes(nombre.toLowerCase())){alert(`El campo '${nombre}' está reservado por el sistema.`);return;}
if(camposPlantilla.includes(nombre)){alert("Este campo ya existe.");return;}
camposPlantilla.push(nombre);
if(valorDefault){valoresDefault[nombre]=valorDefault;}
const idxProcesado=ordenColumnas.indexOf('procesado');
if(idxProcesado!==-1){ordenColumnas.splice(idxProcesado,0,nombre);}
else{const idxEstado=ordenColumnas.indexOf('estado');if(idxEstado!==-1)ordenColumnas.splice(idxEstado,0,nombre);else ordenColumnas.push(nombre);}
await sincronizarConfiguracionNube();
modalNuevoCampo.classList.add('hidden');
modalNuevoCampo.classList.remove('flex');
hashTablaActual="";
cargarCitasDelServidor();
mostrarNotificacion("Campo Creado",`Columna '${nombre}' guardada.`,"success");
if(!modal.classList.contains('hidden'))renderizarCamposModal();
});
function renderizarModalVistas(){
const container=document.getElementById('lista-columnas');
container.innerHTML=ordenColumnas.map((colKey,index)=>{
const isChecked=!columnasOcultas.includes(colKey)?'checked':'';
const label=NOMBRES_COLUMNAS_SISTEMA[colKey]||`${colKey}`;
return`
<div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
<label class="flex items-center gap-3 cursor-pointer flex-1">
<input type="checkbox" value="${colKey}" class="chk-columna w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" ${isChecked}>
<span class="font-semibold text-slate-700">${label}</span>
</label>
<div class="flex gap-1 ml-2">
<button type="button" onclick="moverColumna(${index}, -1)" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition" ${index===0?'disabled opacity-30 cursor-not-allowed':''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg></button>
<button type="button" onclick="moverColumna(${index}, 1)" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition" ${index===ordenColumnas.length-1?'disabled opacity-30 cursor-not-allowed':''}><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></button>
</div>
</div>`;
}).join('');
}
window.moverColumna=(index,direccion)=>{
const checkboxes=document.querySelectorAll('.chk-columna');
let nuevasOcultas=[];
checkboxes.forEach((cb,idx)=>{if(!cb.checked)nuevasOcultas.push(ordenColumnas[idx]);});
columnasOcultas=nuevasOcultas;
const nuevoIndex=index+direccion;
if(nuevoIndex>=0&&nuevoIndex<ordenColumnas.length){
const temp=ordenColumnas[index];
ordenColumnas[index]=ordenColumnas[nuevoIndex];
ordenColumnas[nuevoIndex]=temp;
renderizarModalVistas();
}
};
document.getElementById('btn-configurar-columnas').onclick=()=>{
renderizarModalVistas();
modalColumnas.classList.remove('hidden');
modalColumnas.classList.add('flex');
};
document.getElementById('btn-cerrar-modal-columnas').onclick=()=>{
modalColumnas.classList.add('hidden');
modalColumnas.classList.remove('flex');
};
document.getElementById('btn-guardar-columnas').onclick=async()=>{
const checkboxes=document.querySelectorAll('.chk-columna');
let nuevasOcultas=[];
checkboxes.forEach((cb,idx)=>{if(!cb.checked)nuevasOcultas.push(ordenColumnas[idx]);});
columnasOcultas=nuevasOcultas;
modalColumnas.classList.add('hidden');
modalColumnas.classList.remove('flex');
hashTablaActual="";
await sincronizarConfiguracionNube();
cargarCitasDelServidor();
mostrarNotificacion("Nube Sincronizada","Preferencias guardadas en tu cuenta.","success");
};
function renderizarCamposModal(datosCita={}){
const container=document.getElementById('contenedor-campos-dinamicos');
let html='';
CAMPOS_FIJOS_FORMULARIO.forEach(nombre=>{
const valor=datosCita[nombre]||'';
html+=`
<div class="relative group">
<label class="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">${nombre}</label>
<input type="text" data-key="${nombre}" value="${valor}" class="input-fijo w-full bg-white border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Ingresa ${nombre.toLowerCase()}">
</div>`;
});
camposPlantilla.forEach(nombre=>{
let valor=datosCita[nombre]||'';
if(!idCitaEnEdicion&&!valor&&valoresDefault[nombre]){valor=valoresDefault[nombre];}
html+=`
<div class="relative group">
<label class="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">${nombre}</label>
<input type="text" data-key="${nombre}" value="${valor}" class="input-dinamico w-full bg-white border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Ingresa ${nombre.toLowerCase()}">
<button type="button" onclick="eliminarCampo('${nombre}')" class="absolute top-0 right-0 text-red-400 hover:text-red-600 text-[10px] font-black p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-bl-lg">✕</button>
</div>`;
});
container.innerHTML=html;
}
window.eliminarCampo=async(nombre)=>{
if(confirm(`¿Eliminar la columna "${nombre}" en todas las vistas?`)){
camposPlantilla=camposPlantilla.filter(c=>c!==nombre);
ordenColumnas=ordenColumnas.filter(c=>c!==nombre);
delete valoresDefault[nombre];
await sincronizarConfiguracionNube();
renderizarCamposModal();
hashTablaActual="";
cargarCitasDelServidor();
}
};
function resetearFormulario(){
idCitaEnEdicion=null;
document.getElementById('titulo-modal').innerText="Nueva Cita";
renderizarCamposModal({procesado:'Pendiente',estado:'Esperando respuesta'});
}
document.getElementById('form-login').addEventListener('submit',async(e)=>{
e.preventDefault();
const u=document.getElementById('login-usuario').value.trim().toLowerCase();
const p=document.getElementById('login-password').value;
const btnSubmit=e.target.querySelector('button[type="submit"]');
btnSubmit.innerText="Autenticando...";
btnSubmit.disabled=true;
try{
const res=await fetch(N8N_LOGIN_URL,{method:'POST',body:JSON.stringify({usuario:u,password:p}),headers:{'Content-Type':'application/json'}});
const data=await res.json();
if(data.success){
clienteLogueado=u;
let dbConfig={};
if(typeof data.config==='string'){try{dbConfig=JSON.parse(data.config);}catch(err){}}
else if(typeof data.config==='object'){dbConfig=data.config;}
camposPlantilla=dbConfig.campos_plantilla||[];
camposPlantilla=camposPlantilla.filter(c=>!COLUMNAS_FIJAS.includes(c.toLowerCase()));
valoresDefault=dbConfig.valores_default||{};
let ordenGuardado=dbConfig.orden_columnas||[];
let personalizadosEnOrden=ordenGuardado.filter(c=>camposPlantilla.includes(c)&&!COLUMNAS_FIJAS.includes(c));
let personalizadosFaltantes=camposPlantilla.filter(c=>!personalizadosEnOrden.includes(c));
let personalizadosOrdenados=[...personalizadosEnOrden,...personalizadosFaltantes];
let nuevoOrden=['id',...personalizadosOrdenados,'procesado','estado'];
ordenColumnas=[...new Set(nuevoOrden)];
columnasOcultas=dbConfig.columnas_ocultas||[];
const configNueva={orden_columnas:ordenColumnas,columnas_ocultas:columnasOcultas,campos_plantilla:camposPlantilla,valores_default:valoresDefault};
const configOriginal={orden_columnas:dbConfig.orden_columnas||[],columnas_ocultas:dbConfig.columnas_ocultas||[],campos_plantilla:dbConfig.campos_plantilla||[],valores_default:dbConfig.valores_default||{}};
if(JSON.stringify(configNueva)!==JSON.stringify(configOriginal)){
try{await fetch(N8N_CONFIG_URL,{method:'POST',body:JSON.stringify({usuario:clienteLogueado,config:configNueva}),headers:{'Content-Type':'application/json'}});}catch(e){console.warn('No se pudo guardar la configuración:',e);}
}
document.getElementById('seccion-login').classList.add('hidden');
document.getElementById('seccion-panel').classList.remove('hidden');
document.getElementById('usuario-nombre').textContent=u;
document.getElementById('usuario-sidebar').textContent=u;
cargarCitasDelServidor();
loopSincronizacion=setInterval(cargarCitasDelServidor,10000);
mostrarNotificacion("Acceso Aprobado","Entorno personalizado cargado.","success");
}else{
mostrarNotificacion("Error","Usuario o contraseña incorrectos.","error");
}
}catch(err){
console.error(err);
mostrarNotificacion("Error","Error de conexión con el servidor.","error");
}finally{
btnSubmit.innerText="Acceder al panel";
btnSubmit.disabled=false;
}
});
function actualizarEstadoConexion(online){
const statusCard=document.getElementById('status-card');
const statusText=document.getElementById('status-text');
const statusDot=document.getElementById('status-dot');
const statusIcon=document.getElementById('status-icon');
if(online){
statusCard.querySelector('.stat-icon').className='stat-icon';
statusText.className='stat-number text-sm font-bold text-emerald-600';
statusText.innerText='En línea';
statusDot.className='w-4 h-4 rounded-full animate-pulse bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
}else{
statusCard.querySelector('.stat-icon').className='stat-icon';
statusText.className='stat-number text-sm font-bold text-red-600';
statusText.innerText='Sin conexión';
statusDot.className='w-4 h-4 rounded-full animate-pulse bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]';
}
}
function renderTabla(citas){
const columnasMostradas=ordenColumnas.filter(col=>!columnasOcultas.includes(col));
let htmlCabecera=`<tr>`;
columnasMostradas.forEach(colKey=>{
const label=NOMBRES_COLUMNAS_SISTEMA[colKey]||colKey;
htmlCabecera+=`<th class="px-6 py-4 text-slate-600 font-extrabold text-xs uppercase tracking-widest">${label}</th>`;
});
htmlCabecera+=`<th class="px-6 py-4 text-right text-slate-600 font-extrabold text-xs uppercase tracking-widest">Acciones</th></tr>`;
document.getElementById('tabla-cabecera').innerHTML=htmlCabecera;
if(citas.length===0){
const colspan=columnasMostradas.length+1;
document.getElementById('tabla-cuerpo').innerHTML=`
<tr>
<td colspan="${colspan}" class="px-6 py-12 text-center text-slate-400 font-medium">
<div class="flex flex-col items-center gap-2">
<svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
<span>No hay citas registradas</span>
<span class="text-sm text-slate-400">Crea una nueva cita con el botón "Nueva Cita"</span>
</div>
</td>
</tr>`;
return;
}
document.getElementById('tabla-cuerpo').innerHTML=citas.map(c=>{
let camposParseados={};
try{camposParseados=typeof c.campos_personalizados==='string'?JSON.parse(c.campos_personalizados):(c.campos_personalizados||{});}catch(e){}
const citaString=encodeURIComponent(JSON.stringify({...c,camposParseados}));
let badgeClass='badge-pendiente';
let estadoLower=c.estado?.toLowerCase()||'';
if(estadoLower==='confirmó')badgeClass='badge-confirmada';
else if(estadoLower.includes('cancel'))badgeClass='badge-cancelada';
else if(estadoLower.includes('reprogram'))badgeClass='badge-reprogramada';
else if(estadoLower==='esperando respuesta')badgeClass='badge-esperando';
let row=`<tr class="table-row hover:bg-slate-50">`;
columnasMostradas.forEach(colKey=>{
let valor='-';
if(colKey==='id'){valor=`<span class="font-bold text-slate-400">${c.id||'-'}</span>`;}
else if(colKey==='estado'){valor=`<span class="badge ${badgeClass}">${c.estado||'pendiente'}</span>`;}
else if(colKey==='procesado'){valor=`<span class="font-medium text-slate-600">${c.procesado||'-'}</span>`;}
else{
valor=camposParseados[colKey]||'-';
if(colKey.toLowerCase().includes('nombres')){valor=`<span class="font-bold text-slate-800">${valor}</span>`;}
else if(colKey.toLowerCase().includes('profesional')){valor=`<span class="font-bold text-blue-600">${valor}</span>`;}
if(colKey.toLowerCase()==='telefono'&&valor!=='-'){
const telefono=valor;
valor=`
<span class="flex items-center gap-1">
<span>${telefono}</span>
<button onclick="abrirWhatsApp('${telefono}')" class="btn-whatsapp" title="Abrir WhatsApp">
<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</button>
</span>`;
}
}
row+=`<td class="px-6 py-4 text-slate-700">${valor}</td>`;
});
row+=`
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2">
<button onclick="prepararEdicion('${citaString}')" class="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold transition">Editar</button>
<button onclick="eliminarCita(${c.id})" class="btn-delete px-4 py-1.5 rounded-lg text-xs font-bold transition">Eliminar</button>
</div>
</td>
</tr>`;
return row;
}).join('');
}
async function cargarCitasDelServidor(){
try{
const res=await fetch(`${N8N_GET_URL}?cliente=${clienteLogueado}`);
if(!res.ok)throw new Error(`HTTP error ${res.status}`);
const text=await res.text();
let citas=[];
if(text&&text.trim()!==''){
try{const data=JSON.parse(text);citas=data.citas||(Array.isArray(data)?data:[]);}catch(parseError){console.warn('Error al parsear JSON:',parseError);citas=[];}
}else{citas=[];}
citasCompletas=citas;
actualizarEstadoConexion(true);
document.getElementById('stat-total').innerText=citas.length;
document.getElementById('stat-confirmadas').innerText=citas.filter(c=>c.estado?.toLowerCase()==='confirmó').length;
document.getElementById('stat-canceladas').innerText=citas.filter(c=>c.estado?.toLowerCase()==='canceló'||c.estado?.toLowerCase()==='cancelada').length;
document.getElementById('stat-reprogramadas').innerText=citas.filter(c=>c.estado?.toLowerCase()==='reprogramó'||c.estado?.toLowerCase()==='reprogramada').length;
const citasFiltradas = filtroBusqueda ? citas.filter(c=>{
const campos=typeof c.campos_personalizados==='string'?JSON.parse(c.campos_personalizados):(c.campos_personalizados||{});
const texto = `${c.id} ${c.estado||''} ${c.procesado||''} ${campos.Nombres||''} ${campos.Apellidos||''} ${campos.Telefono||''} ${campos.Profesional||''}`.toLowerCase();
return texto.includes(filtroBusqueda.toLowerCase());
}) : citas;
renderTabla(citasFiltradas);
if(citasAnteriores.length>0){
citas.forEach(nuevaCita=>{
const citaVieja=citasAnteriores.find(c=>c.id===nuevaCita.id);
if(citaVieja&&citaVieja.estado!==nuevaCita.estado){
let nombrePaciente="";
try{let jsonParseado=typeof nuevaCita.campos_personalizados==='string'?JSON.parse(nuevaCita.campos_personalizados):nuevaCita.campos_personalizados;nombrePaciente=jsonParseado['Nombres']||`Cita #${nuevaCita.id}`;}catch(e){nombrePaciente=`Cita #${nuevaCita.id}`;}
mostrarNotificacion('Actualización',`${nombrePaciente} ha cambiado a: ${nuevaCita.estado.toUpperCase()}`,nuevaCita.estado.toLowerCase());
}
});
}
const nuevoHash=JSON.stringify(citas)+JSON.stringify(ordenColumnas)+JSON.stringify(columnasOcultas);
if(nuevoHash!==hashTablaActual){
hashTablaActual=nuevoHash;
citasAnteriores=JSON.parse(JSON.stringify(citas));
}
}catch(e){
console.error("Error al cargar:",e);
actualizarEstadoConexion(false);
const columnasMostradas=ordenColumnas.filter(col=>!columnasOcultas.includes(col));
const colspan=columnasMostradas.length+1;
document.getElementById('tabla-cuerpo').innerHTML=`
<tr>
<td colspan="${colspan}" class="px-6 py-12 text-center text-red-400 font-medium">
<div class="flex flex-col items-center gap-2">
<svg class="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
<span>Error al cargar las citas</span>
<span class="text-sm text-slate-400">Intenta recargar la página o contacta con soporte</span>
</div>
</td>
</tr>`;
}
}
window.prepararEdicion=(citaString)=>{
const c=JSON.parse(decodeURIComponent(citaString));
idCitaEnEdicion=c.id;
document.getElementById('titulo-modal').innerText="Editando Cita #"+c.id;
const datos={procesado:c.procesado||'',estado:c.estado||'Esperando respuesta',...c.camposParseados};
renderizarCamposModal(datos);
modal.classList.remove('hidden');
modal.classList.add('flex');
};
document.getElementById('form-cita').addEventListener('submit',async(e)=>{
e.preventDefault();
const camposFijos={};
document.querySelectorAll('.input-fijo').forEach(i=>{camposFijos[i.getAttribute('data-key')]=i.value;});
const camposDinamicos={};
document.querySelectorAll('.input-dinamico').forEach(i=>{if(i.value)camposDinamicos[i.getAttribute('data-key')]=i.value;});
const payload={...(idCitaEnEdicion&&{id:idCitaEnEdicion}),procesado:camposFijos.procesado||'',estado:camposFijos.estado||'Esperando respuesta',campos_personalizados:camposDinamicos};
const btnSubmit=e.target.querySelector('button[type="submit"]');
btnSubmit.innerText="Guardando...";
btnSubmit.disabled=true;
try{
await fetch(N8N_POST_URL,{method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json'}});
cerrarModal();
resetearFormulario();
mostrarNotificacion("Éxito","Guardado correctamente.","success");
hashTablaActual="";
await cargarCitasDelServidor();
}catch(error){mostrarNotificacion("Error","No se pudo guardar.","error");}
finally{btnSubmit.innerText="Guardar Información";btnSubmit.disabled=false;}
});
document.querySelectorAll('.sidebar-nav a').forEach(enlace=>{
enlace.addEventListener('click',function(e){
e.preventDefault();
document.querySelectorAll('.sidebar-nav a').forEach(a=>a.classList.remove('active'));
this.classList.add('active');
document.querySelectorAll('.seccion').forEach(sec=>sec.classList.remove('active'));
const seccionId='seccion-'+this.dataset.section;
document.getElementById(seccionId).classList.add('active');
});
});
document.getElementById('btn-buscar').addEventListener('click',()=>{
const input=document.getElementById('buscar-citas');
filtroBusqueda=input.value.trim();
cargarCitasDelServidor();
});
document.getElementById('buscar-citas').addEventListener('keyup',(e)=>{
if(e.key==='Enter'){
filtroBusqueda=e.target.value.trim();
cargarCitasDelServidor();
}
});
