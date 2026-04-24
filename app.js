/* ================== CONFIGURACIÓN PRINCIPAL ================== */
const API_BASE = 'https://script.google.com/macros/s/AKfycbwqP9YIs-WkkvHRJ-fuGnIEDPaPoxW5JksyS-0Niw650w4qwng9LnuN7bsnDHZrwzg4/exec';
const BUILDERBOT_ENDPOINT = 'https://app.builderbot.cloud/api/v2/ff37a123-12b0-4fdc-9866-f3e2daf389fb/messages';
const BUILDERBOT_API_KEY  = 'bb-7f9ef630-5cfc-4ba4-9258-5e7cecbb4f65';

/* ================== SONIDOS ================== */
const SOUNDS = {
  question: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_fail_ls2aif.mp3',
  info: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Default_notification_pkp4wr.mp3',
  success: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Pay_success_t5aawh.mp3',
  error: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  warning: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Low_battery_d5qua1.mp3',
  login: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_star_g1owy4.mp3',
  logout: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011577/Siri_End_kelv02.mp3',
  back: 'https://res.cloudinary.com/dqqeavica/video/upload/v1759011578/Keyboard_Enter_b9k2dc.mp3'
};
function playSoundOnce(url){
  try{
    const a = new Audio(url);
    a.preload = 'auto';
    a.play().catch(()=>{});
  }catch(e){}
}
if (window.Swal && typeof Swal.fire === 'function'){
  const __fire = Swal.fire.bind(Swal);
  Swal.fire = function(options = {}, ...rest){
    try{
      const icon = options.icon || options.type;
      if (icon && SOUNDS[icon]) playSoundOnce(SOUNDS[icon]);
    }catch(e){}
    return __fire(options, ...rest);
  }
}

/* ================== LOADER ================== */
const loader = document.getElementById('loader');
let loadingCount = 0;
let loaderTimer = null;

function startLoading(){
  loadingCount++;
  if (loadingCount === 1){
    loaderTimer = setTimeout(()=>{
      loader.classList.remove('hidden');
      loaderTimer = null;
    }, 120);
  }
}
function stopLoading(){
  if (loadingCount === 0) return;
  loadingCount--;
  if (loadingCount === 0){
    if (loaderTimer){
      clearTimeout(loaderTimer);
      loaderTimer = null;
    }
    loader.classList.add('hidden');
  }
}

/* ================== API HELPERS ================== */
async function apiGet(action, params = {}){
  startLoading();
  try{
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ action, ...params }).toString();
    const r = await fetch(url.toString(), { method: 'GET' });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}
async function apiPost(action, body = {}){
  startLoading();
  try{
    const url = API_BASE + '?action=' + encodeURIComponent(action);
    const r = await fetch(url, {
      method:'POST',
      headers: { 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  } finally { stopLoading(); }
}

/* ================== BUILDERBOT ================== */
function normalizeContratistaNumber(raw){
  let num = String(raw || '').replace(/\D/g,'');
  if(!num) return '';
  if(num.length === 10 && !num.startsWith('57')) num = '57' + num;
  if(!(num.length === 12 && num.startsWith('57'))) return '';
  return num;
}
function sendBuilderbotMessage(destino, mensaje){
  const numberField = String(destino || '').trim();
  if(!numberField){
    console.warn('Destino vacío, no se envía BuilderBot');
    return;
  }
  fetch(BUILDERBOT_ENDPOINT, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-builderbot':BUILDERBOT_API_KEY
    },
    body: JSON.stringify({
      messages: { content: mensaje },
      number: numberField,
      checkIfExists: false
    })
  }).catch(err => console.warn('Error enviando BuilderBot', err));
}

/* ================== UTILIDADES UI ================== */
function showView(id){
  for(const el of document.querySelectorAll('.view')) el.classList.remove('active');
  const v = document.getElementById(id);
  if(v) v.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatoFechaHumana(date){
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d=dias[date.getDay()];
  const dia=('0'+date.getDate()).slice(-2);
  const mes=meses[date.getMonth()];
  const y=date.getFullYear();
  return `${d}, ${dia} de ${mes} de ${y}`;
}
function fechaDMY(date){
  const dd=('0'+date.getDate()).slice(-2);
  const mm=('0'+(date.getMonth()+1)).slice(-2);
  const yyyy=date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function parseCOPNumber(raw){
  // toma "4.200.000" o "$ 4.200.000" -> 4200000
  const s = String(raw||'').replace(/[^\d]/g,'');
  if(!s) return 0;
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
function formatCOPFrontend(n){
  const num = Number(n);
  if(!isFinite(num) || num<=0) return '$ 0';
  const s = String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return '$ ' + s;
}
function formatPagoDetallesDS_(text){
  const t = String(text||'').trim();
  if(!t) return '';

  // Reemplaza cada "PAGO DE 12345" por "PAGO DE $ 12.345"
  return t.replace(/PAGO\s+DE\s+(\d+)/gi, (_, numStr)=>{
    const n = Number(numStr);
    if(!isFinite(n)) return 'PAGO DE ' + numStr;
    return 'PAGO DE ' + formatCOPFrontend(n);
  });
}

/* ================== LOGIN ================== */
let currentUser = null;
const btnLogin = document.getElementById('btn-login');
const loginCedula = document.getElementById('login-cedula');

const toggleCedulaBtn = document.getElementById('toggle-cedula');
toggleCedulaBtn.addEventListener('click', ()=>{
  const oculto = loginCedula.type === 'password';
  loginCedula.type = oculto ? 'text' : 'password';
  const nuevoIcono = oculto
    ? 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Ocultar_lgdxpd.png'
    : 'https://res.cloudinary.com/dqqeavica/image/upload/v1764084782/Mostrar_yymceh.png';
  const accion = oculto ? 'Ocultar' : 'Mostrar';
  toggleCedulaBtn.setAttribute('aria-label', accion + ' cédula');
  toggleCedulaBtn.innerHTML = '<img src="'+nuevoIcono+'" alt="'+accion+'">';
});

btnLogin.addEventListener('click', async () => {
  const cedula = (loginCedula.value || '').trim();
  if (cedula === '') {
    Swal.fire({ icon:'warning', title:'¿Deseas iniciar Sesión?', text:'Ingresa tu Contraseña.' });
    return;
  }
  if (!/^\d{6,10}$/.test(cedula)) {
    Swal.fire({ icon:'warning', title:'Contraseña inválida', text:'Te mostraré unas opciones' });
    return;
  }
  try {
    const res = await apiGet('login', { cedula });
    if (!res || !res.encontrado){
      const soporte = '573103230712';
      const mensaje =
        'Buen día *Oscar*%0A%0ANo tengo acceso a la app de Contratación.%0A' +
        'Mi Contraseña: *' + cedula + '*%0A' +
        'Te dejo mis datos a continuación:%0A*Nombre Completo:*%0A*Celular:*';
      const esMovil = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
      const urlWA = esMovil
        ? 'whatsapp://send?phone=' + soporte + '&text=' + mensaje
        : 'https://api.whatsapp.com/send?phone=' + soporte + '&text=' + mensaje;

      const rs = await Swal.fire({
        icon: 'error',
        title: 'NO TIENES ACCESO',
        text: 'Toma una de las opciones',
        showConfirmButton: true,
        confirmButtonText: 'Solicitar Acceso',
        showDenyButton: true,
        denyButtonText: 'Rectificar / Salir'
      });

      if (rs.isConfirmed){
        window.open(urlWA, '_blank');
        await Swal.fire({
          icon: 'success',
          title: 'Se abrió WhatsApp',
          text: 'Solicita tu habilitación por ese medio.',
          timer: 6000,
          showConfirmButton: false
        });
        return;
      } else if (rs.isDenied){
        loginCedula.value = '';
        return;
      }
    }

    currentUser = {
      cedula,
      profesional: res.profesional || '',
      celular: res.celular || ''
    };

    playSoundOnce(SOUNDS.login);
    renderInicio();
    showView('view-inicio');
  } catch (e) {
    Swal.fire({ icon:'error', title:'Error', text:e.message });
  }
});

document.getElementById('btn-logout').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.logout);
  currentUser = null;
  loginCedula.value = '';
  showView('view-login');
});

function renderInicio(){
  document.getElementById('inicio-profesional').textContent = 'PROFESIONAL: ' + (currentUser?.profesional || '');
  document.getElementById('inicio-fecha').textContent = formatoFechaHumana(new Date());
}

/* ================== NAVEGACIÓN ================== */
document.getElementById('go-contratistas').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  await cargarContratistas();
  showView('view-contratistas');
});

let REVISION_MODE = 'ORDEN DE PAGO';

document.getElementById('go-revision').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  REVISION_MODE = 'ORDEN DE PAGO';
  document.getElementById('revision-title').textContent = 'EGRESOS PENDIENTES';
  document.getElementById('revision-caption').textContent = 'N° de Egresos Pendientes';
  await cargarCuentasPorEstado();
  if (!CUENTAS_DATA || CUENTAS_DATA.length === 0){
    await Swal.fire({ icon:'success', title:'¡Estás al día!', text:'No tienes EGRESOS pendientes', timer: 3200, showConfirmButton:false });
    showView('view-inicio');
    return;
  }
  showView('view-revision');
});

document.getElementById('go-egresos-emitidos').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  REVISION_MODE = 'EGRESO';
  document.getElementById('revision-title').textContent = 'EGRESOS EMITIDOS';
  document.getElementById('revision-caption').textContent = 'N° de Egresos Emitidos';
  await cargarCuentasPorEstado();
  if (!CUENTAS_DATA || CUENTAS_DATA.length === 0){
    await Swal.fire({ icon:'success', title:'¡Estás al día!', text:'No tienes EGRESOS emitidos pendientes por marcar como PAGADA', timer: 3200, showConfirmButton:false });
    showView('view-inicio');
    return;
  }
  showView('view-revision');
});

document.getElementById('go-cuentas-pagadas').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  REVISION_MODE = 'PAGADA';
  document.getElementById('revision-title').textContent = 'CUENTAS PAGADAS';
  document.getElementById('revision-caption').textContent = 'N° de Cuentas Pagadas';
  await cargarCuentasPorEstado();
  if (!CUENTAS_DATA || CUENTAS_DATA.length === 0){
    await Swal.fire({ icon:'success', title:'Sin registros', text:'No hay CUENTAS PAGADAS para mostrar', timer: 3200, showConfirmButton:false });
    showView('view-inicio');
    return;
  }
  showView('view-revision');
});

  /* ================== MIS INFORMES ================== */
const INFORMES_LINKS = {
  'DEYSI PATRICIA GONZALEZ GUERRA': 'https://docs.google.com/spreadsheets/d/1Fkc12KgVJAvu9zvwNtlg-KH876lizXV5Mde9FTSIV1Q/edit?usp=sharing',
  'YISED ALBANI MARTINEZ BAUTISTA': 'https://docs.google.com/spreadsheets/d/15ysS1kpmfWO2_OjGMZnlMTmKG5ywwZJIkUyYZYZQvo4/edit?usp=sharing'
};

function openMisInformesFor(nombreProfesional){
  const name = String(nombreProfesional || '').trim().toUpperCase();

  if (INFORMES_LINKS[name]){
    window.open(INFORMES_LINKS[name], '_blank');
    return;
  }

  // Si es OSCAR POLANIA o LUZ HAYDEE ORTEGA MAYORGA: mostrar opciones
  if (name === 'OSCAR POLANIA' || name === 'LUZ HAYDEE ORTEGA MAYORGA'){
    // sonido de pregunta (como “opciones”)
    playSoundOnce(SOUNDS.question);

    Swal.fire({
      icon: 'info',
      title: 'MIS INFORMES',
      text: 'Selecciona el usuario:',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'DEYSI PATRICIA GONZALEZ GUERRA',
      denyButtonText: 'YISED ALBANI MARTINEZ BAUTISTA',
      cancelButtonText: 'CERRAR'
    }).then((rs)=>{
      if (rs.isConfirmed){
        playSoundOnce(SOUNDS.login);
        window.open(INFORMES_LINKS['DEYSI PATRICIA GONZALEZ GUERRA'], '_blank');
      } else if (rs.isDenied){
        playSoundOnce(SOUNDS.login);
        window.open(INFORMES_LINKS['YISED ALBANI MARTINEZ BAUTISTA'], '_blank');
      } else {
        // cerrar: no hacemos nada (SweetAlert ya reproduce el sonido según icon si lo pones)
        playSoundOnce(SOUNDS.back);
      }
    });

    return;
  }

  // Otros usuarios
  Swal.fire({ icon:'warning', title:'Sin acceso', text:'No tienes MIS INFORMES asignados.' });
}

document.getElementById('go-mis-informes').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  openMisInformesFor(currentUser?.profesional || '');
});

document.getElementById('go-comunicados').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-comunicados');
});
document.getElementById('go-soporte').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.login);
  showView('view-soporte');
});

/* ================== CONTRATISTAS ================== */
let CONTR_DATA=[];
async function cargarContratistas(){
  try{
    const list=await apiGet('listContratistas');
    CONTR_DATA=Array.isArray(list)?list:[];
    pintarContratistas(CONTR_DATA);
    actualizarResumenContratistas(CONTR_DATA);
  }catch(e){
    CONTR_DATA=[];
    pintarContratistas(CONTR_DATA);
    actualizarResumenContratistas(CONTR_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenContratistas(list){
  const box=document.getElementById('contr-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}
function pintarContratistas(list){
  const wrap=document.getElementById('contr-list');
  if(!wrap) return;
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay contratistas activos.</p>';
    return;
  }
  for(const c of list){
    const div=document.createElement('div');
    div.className='item-card';

    const header=document.createElement('div');
    header.className='item-header';

    const title=document.createElement('p');
    title.className='item-title';
    title.textContent= (c.nombre||'');
    header.appendChild(title);
    div.appendChild(header);

    const pDoc=document.createElement('p');
    pDoc.className='item-sub';
    pDoc.textContent='CC / NIT: '+(c.documento||'');
    div.appendChild(pDoc);

    const pSec=document.createElement('p');
    pSec.className='item-sub';
    pSec.textContent='SECRETARÍA: '+(c.secretaria||'');
    div.appendChild(pSec);

    const pSup=document.createElement('p');
    pSup.className='item-sub';
    pSup.textContent='SUPERVISOR: '+(c.supervisor||'');
    div.appendChild(pSup);

    const pContrato=document.createElement('p');
    pContrato.className='item-sub';
    pContrato.textContent='CONTRATO: '+(c.contrato||'')+' de: '+(c.fechaContrato||'');
    div.appendChild(pContrato);

    const pInicio=document.createElement('p');
    pInicio.className='item-sub';
    pInicio.textContent='FECHA INICIO: '+(c.fechaInicio||'');
    div.appendChild(pInicio);

    const pTermino=document.createElement('p');
    pTermino.className='item-sub';
    pTermino.textContent='FECHA TERMINO: '+(c.fechaTermino||'');
    div.appendChild(pTermino);

    const btnRow=document.createElement('div');
    btnRow.className='btn-row';

    const btnDetalles=document.createElement('button');
    btnDetalles.textContent='MOSTRAR DETALLES';
    btnDetalles.addEventListener('click', ()=>{
      playSoundOnce(SOUNDS.login);
      mostrarDetallesContratista(c.documento);
    });

    btnRow.appendChild(btnDetalles);
    div.appendChild(btnRow);

    wrap.appendChild(div);
  }
}
document.getElementById('contr-filter').addEventListener('input',()=>{
  const qRaw = document.getElementById('contr-filter').value || '';
  const q = qRaw.trim().toLowerCase();
  const digitsOnly = q.replace(/\D/g, '');
  const isNumericOnly = q !== '' && /^\d+$/.test(q);
  const useContratoOnly = isNumericOnly && digitsOnly.length >= 1 && digitsOnly.length <= 3;

  const filtered = CONTR_DATA.filter(c=>{
    if (useContratoOnly) return String(c.contrato || '').toLowerCase().includes(q);
    return [c.nombre,c.documento,c.secretaria,c.supervisor,c.telefono,c.contrato]
      .some(v=>String(v||'').toLowerCase().includes(q));
  });

  pintarContratistas(filtered);
  actualizarResumenContratistas(filtered);
});
document.getElementById('contr-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== DETALLES ================== */
async function mostrarDetallesContratista(documento){
  try{
    const d=await apiGet('detallesContratista',{documento});
    const body=document.getElementById('detalles-body');
    body.innerHTML='';
    if(!d){
      body.innerHTML='<p class="muted center">No encontrado.</p>';
    }else{
      const lines=[
        `<b>NOMBRE:</b> ${d.nombre||''}`,
        `<b>CC / NIT:</b> ${d.documento||''} <b>de:</b> ${d.expedida||''}`,
        `<b>TELEFONO:</b> ${d.telefono||'SIN REGISTRO'}`,
        `<b>CORREO:</b> ${d.correo||'SIN REGISTRO'}`,
        `<b>CUENTA:</b> ${d.cuenta||''} ${d.tipoCuenta||''} ${d.banco||''}`,
        `<b>EPS:</b> ${d.eps||''}`,
        `<b>AFP:</b> ${d.pension||''}`,
        `<b>ARL:</b> ${d.arl||''}`,
        `<b>SECRETARÍA:</b> ${d.secretaria||''}`,
        `<b>SUPERVISOR:</b> ${d.supervisor||''}`,
        `<b>CONTRATO:</b> ${d.contrato||''} <b>de:</b> ${d.fechaContrato||''}`,
        `<b>OBJETO:</b> ${d.objeto||''}`,
        `<b>FECHA DE INICIO:</b> ${d.fechaInicio||''}`,
        `<b>FECHA DE TERMINO:</b> ${d.fechaTermino||''}`,
        `<b>VALOR INICIAL:</b> ${d.valor||''}`,
        `<b>MRA:</b> ${d.mra||''}`,
        `<b>VALOR FINAL:</b> ${d.valorFinal||''}`,
        `<b>CDP:</b> ${d.cdp||''}`,
        `<b>RP:</b> ${d.rp||''}`,
        `<b>CDP ADICIÓN:</b> ${d.cdpAdicion||''}`,
        `<b>RP ADICIÓN:</b> ${d.rpAdicion||''}`,
        `<b>REGIMEN:</b> ${d.regimen||''}`
      ];
      for(let i=1;i<=26;i++){
        const val=d['obligacion'+i];
        if(val && val!=='-') lines.push(`<b>OBLIGACIÓN ${i}:</b> ${val}`);
      }
      body.innerHTML=lines.map(l=>`<p>${l}</p>`).join('');
    }
    showView('view-detalles');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
document.getElementById('detalles-ocultar').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-contratistas');
});

/* ================== LISTADO CUENTAS POR ESTADO ================== */
let CUENTAS_DATA=[];
async function cargarCuentasPorEstado(){
  try{
    const list=await apiGet('listCuentasPendientes', { estado: REVISION_MODE });
    CUENTAS_DATA=Array.isArray(list)?list:[];

    // Priorizar a OSCAR MAURICIO POLANIA GUERRA en EGRESOS PENDIENTES y EGRESOS EMITIDOS
    if (REVISION_MODE === 'ORDEN DE PAGO' || REVISION_MODE === 'EGRESO'){
      const PRIORITARIO = 'OSCAR MAURICIO POLANIA GUERRA';
      CUENTAS_DATA.sort((a, b) => {
        const aPrio = String(a.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
        const bPrio = String(b.nombre || '').trim().toUpperCase() === PRIORITARIO ? 0 : 1;
        return aPrio - bPrio;
      });
    }

    pintarCuentas(CUENTAS_DATA);
    actualizarResumenCuentas(CUENTAS_DATA);
  }catch(e){
    CUENTAS_DATA=[];
    pintarCuentas(CUENTAS_DATA);
    actualizarResumenCuentas(CUENTAS_DATA);
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
}
function actualizarResumenCuentas(list){
  const box=document.getElementById('cuentas-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent=String(list.length);
  box.style.display='inline-block';
}

/* ==== Mapa destinaciones (para EGRESOS EMITIDOS) ==== */
const DESTINACIONES = [
  { name:'PENSIONES PROCULTURA', banco:'BOGOTA', numCuenta:'348424151' },
  { name:'FONDOS COMUNES I', banco:'BOGOTA', numCuenta:'348424169' },
  { name:'FONDOS COMUNES II', banco:'OCCIDENTE', numCuenta:'103035523' },
  { name:'FONDOS COMUNES III', banco:'BOGOTA', numCuenta:'348438870' },
  { name:'SOBRETASA A LA GASOLINA', banco:'BOGOTA', numCuenta:'348423096' },
  { name:'TASA PRODEPORTE', banco:'BOGOTA', numCuenta:'348498155' },
  { name:'S.G.P - EDUCACION', banco:'BOGOTA', numCuenta:'348423674' },
  { name:'S.G.P - ALIMENTACION ESCOLAR I', banco:'BOGOTA', numCuenta:'348423708' },
  { name:'FONDO LOCAL DE SALUD - COLJUEGOS', banco:'BANCOLOMBIA', numCuenta:'40211194275' },
  { name:'MPIO FLANDES. FONDOS COMUNES', banco:'BANCOLOMBIA', numCuenta:'65914926848' },
  { name:'IMPUESTO PREDIAL', banco:'DAVIVIENDA', numCuenta:'35669999732' },
  { name:'FONDOS VARIOS', banco:'BOGOTA', numCuenta:'551260045' },
  { name:'FONDO SEGURIDAD CIUDADANA', banco:'BOGOTA', numCuenta:'348431925' },
  { name:'SALUD PUBLICA', banco:'BOGOTA', numCuenta:'348434010' },
  { name:'S.G.P - ALIMENTACION ESCOLAR', banco:'BOGOTA', numCuenta:'348434499' },
  { name:'ESTAMPILLA PROCULTURA', banco:'BOGOTA', numCuenta:'348438920' },
  { name:'SOBRETASA BOMBERIL', banco:'BOGOTA', numCuenta:'348438557' },
  { name:'ESTAMPILLA ADULTO MAYOR 70%', banco:'DAVIVIENDA', numCuenta:'356200006142' },
  { name:'ICLD ARTICULO 111 LEY 99 de 1993', banco:'DAVIVIENDA', numCuenta:'356000132635' },
  { name:'S.G.P - ALIMENTACION ESCOLAR II', banco:'OCCIDENTE', numCuenta:'103855565' },
  { name:'S.G.P - PROPOSITO GENERAL', banco:'OCCIDENTE', numCuenta:'103855557' },
  { name:'IMPUESTO AL CONSUMO DE TABACO Y CIGARRILLO (INDEPORTES)', banco:'OCCIDENTE', numCuenta:'103859393' },
  { name:'ESTAMPILLA ADULTO MAYOR 24%', banco:'DAVIVIENDA', numCuenta:'356000137089' },
  { name:'ESTAMPILLAS JUSTICIA FAMILIAR', banco:'DAVIVIENDA', numCuenta:'356070336322' },
  { name:'ADMON CEMENTARIO', banco:'DAVIVIENDA', numCuenta:'356000133997' }
];

function pintarCuentas(list){
  const wrap=document.getElementById('cuentas-list');
  wrap.innerHTML='';
  if(!list.length){
    wrap.innerHTML='<p class="muted center">No hay registros.</p>';
    return;
  }

  for(const c of list){
    const div=document.createElement('div');
    div.className='item-card';

    const header=document.createElement('div');
    header.className='item-header orden-header';

    const title=document.createElement('p');
    title.className='item-title';
    title.textContent=(c.nombre||'');
    header.appendChild(title);

    // icono carpeta (BH idCuenta)
    const folderBtn=document.createElement('button');
    folderBtn.className = 'btn-icon folder-corner';
    folderBtn.title='Abrir carpeta de CUENTA';
    folderBtn.setAttribute('aria-label','Abrir carpeta de CUENTA');
    folderBtn.innerHTML='<img src="https://res.cloudinary.com/dqqeavica/image/upload/v1764111247/carpeta_drive_epbrhp.webp" alt="CUENTA">';
    folderBtn.addEventListener('click', ()=>{
      playSoundOnce(SOUNDS.login);
      const idCuenta=String(c.idCuenta||'').trim();
      if(idCuenta){
        window.open('https://drive.google.com/drive/folders/'+idCuenta,'_blank');
      }else{
        Swal.fire({icon:'info',title:'Sin carpeta',text:'Esta cuenta no tiene id de carpeta (BH) asociado.'});
      }
    });
    header.appendChild(folderBtn);

    div.appendChild(header);

    // comunes
    const pDoc=document.createElement('p');
    pDoc.className='item-sub';
    pDoc.textContent='CC / NIT: '+(c.documento||'');

    const pContrato=document.createElement('p');
    pContrato.className='item-sub';
    pContrato.textContent='CONTRATO: '+(c.contrato||'');

    const pInf=document.createElement('p');
    pInf.className='item-sub';
    pInf.textContent='INFORME: '+(c.informe||'')+' de: '+(c.totalInformes||'');

    const pOrden=document.createElement('p');
    pOrden.className='item-sub';
    pOrden.textContent='N° ORDEN: '+(c.orden||'');

    div.appendChild(pDoc);
    div.appendChild(pContrato);
    div.appendChild(pInf);

    if (REVISION_MODE === 'ORDEN DE PAGO'){
      const facturaVal = String(c.facturaElectronica||'').trim();
      const pFactura=document.createElement('p');
      pFactura.className='item-sub';
      pFactura.textContent='FACTURA ELECTRÓNICA N°: '+(facturaVal ? facturaVal : 'N/A');

      const pSup=document.createElement('p');
      pSup.className='item-sub';
      pSup.textContent='SUPERVISOR: '+(c.supervisorCuenta||'');

      const pOrden2=document.createElement('p');
      pOrden2.className='item-sub';
      pOrden2.textContent='N° DE ORDEN: '+(c.orden||'');

      
      const pFechaOrden=document.createElement('p');
      pFechaOrden.className='item-sub';
      pFechaOrden.textContent='FECHA DE ORDEN: '+(c.fechaOrden||'');

      div.appendChild(pFactura);
      div.appendChild(pSup);
      div.appendChild(pOrden2);
      div.appendChild(pFechaOrden);

      // campos a diligenciar
      const labelFecha=document.createElement('label');
      labelFecha.textContent='FECHA DE EGRESO:';
      const inpFecha=document.createElement('input');
      inpFecha.type='text';
      inpFecha.readOnly=true;
      inpFecha.placeholder='dd/mm/2026';
      inpFecha.value=String(c.fechaEgreso||'');
      inpFecha.addEventListener('click', ()=>{
        window.__egresoEditing = { c, inpFecha, inpEgreso:null };
        abrirPickerFechaEgreso();
      });

      const labelEgreso=document.createElement('label');
      labelEgreso.textContent='NÚMERO DE EGRESO 1:';
      const inpEgreso=document.createElement('input');
      inpEgreso.className='op-input';
      inpEgreso.type='text';
      inpEgreso.inputMode='numeric';
      inpEgreso.autocomplete='off';
      inpEgreso.placeholder='000123';
      inpEgreso.maxLength=6;
      // Mostrar solo 6 dígitos aunque venga guardado full
      const egFull = String(c.egreso||'').trim();
      const eg6 = egFull.startsWith('2026') ? egFull.slice(4) : egFull;
      inpEgreso.value = eg6;

      inpEgreso.addEventListener('input', ()=>{
        let v=String(inpEgreso.value||'').replace(/\D/g,'').slice(0,6);
        inpEgreso.value=v;
        c.egreso6=v;
      });

      const labelEgreso2=document.createElement('label');
      labelEgreso2.textContent='NÚMERO DE EGRESO 2:';
      const inpEgreso2=document.createElement('input');
      inpEgreso2.id='egreso2';
      inpEgreso2.className='op-input';
      inpEgreso2.type='text';
      inpEgreso2.inputMode='numeric';
      inpEgreso2.autocomplete='off';
      inpEgreso2.placeholder='(Opcional) 000124';
      inpEgreso2.maxLength=6;

      const eg2Full = String(c.egreso2||'').trim();
      const eg2_6 = eg2Full.startsWith('2026') ? eg2Full.slice(4) : eg2Full;
      inpEgreso2.value = eg2_6;

      inpEgreso2.addEventListener('input', ()=>{
        let v=String(inpEgreso2.value||'').replace(/\D/g,'').slice(0,6);
        inpEgreso2.value=v;
        c.egreso2_6=v;
      });


      // botón guardar
      const btnRow=document.createElement('div');
      btnRow.className='btn-row';

      const btnGuardar=document.createElement('button');
      btnGuardar.className='btn-primary';
      btnGuardar.textContent='GUARDAR';
      btnGuardar.addEventListener('click', async ()=>{
        playSoundOnce(SOUNDS.login);

        const fechaEgreso = String(inpFecha.value||'').trim();
        const egreso6 = String(inpEgreso.value||'').trim();

        if(!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaEgreso)){
          Swal.fire({icon:'warning',title:'Fecha de Egreso requerida',text:'Usa el picker'}); return;
        }
        if(!/^\d{6}$/.test(egreso6)){
          Swal.fire({icon:'warning',title:'N° de Egreso inválido',text:'Debe tener exactamente 6 dígitos (ej: 000123)'}); return;
        }

        const egresoFull = '2026' + egreso6;

        const egreso2_6 = String(inpEgreso2.value||'').trim();
        if(egreso2_6 && !/^\d{6}$/.test(egreso2_6)){
          Swal.fire({icon:'warning',title:'N° de Egreso 2 inválido',text:'Debe tener 6 dígitos (ej: 000124) o quedar vacío'}); 
          return;
        }
        const egreso2Full = egreso2_6 ? ('2026' + egreso2_6) : '';

        const rs = await Swal.fire({
          icon:'success',
          title:`Cuenta N° ${c.informe} de ${c.nombre}`,
          text:'¿Deseas registrar EGRESO?',
          showCancelButton:true,
          confirmButtonText:'GUARDAR',
          cancelButtonText:'Cancelar'
        });
        if(!rs.isConfirmed) return;

        try{
          await apiPost('guardarEgreso', {
            documento: c.documento,
            informe: c.informe,
            fechaEgreso,
            egreso: egresoFull,
            egreso2: egreso2Full,
            responsable: currentUser?.profesional || '',
            cuentaText: (String(c.informe||'') + ' de ' + String(c.totalInformes||'')).trim(),
            contrato: c.contrato || '',
            nombre: c.nombre || '',
            orden: c.orden || '',
            fechaOrden: c.fechaOrden || ''
          });

          Swal.fire({icon:'success',title:'Egreso guardado',timer:1800,showConfirmButton:false});
          await cargarCuentasPorEstado();
          showView('view-revision');
        }catch(e){
          Swal.fire({icon:'error',title:'Error',text:e.message});
        }
      });

      btnRow.appendChild(btnGuardar);

      div.appendChild(labelFecha);
      div.appendChild(inpFecha);
      div.appendChild(labelEgreso);
      div.appendChild(inpEgreso);
      div.appendChild(labelEgreso2);
      div.appendChild(inpEgreso2);
      div.appendChild(btnRow);
    }

    if (REVISION_MODE === 'EGRESO'){
      // mostrar fecha/egreso
      const pFecha=document.createElement('p');
      pFecha.className='item-sub';
      pFecha.textContent='FECHA DE EGRESO: '+(c.fechaEgreso||'');

      const pEgreso=document.createElement('p');
      pEgreso.className='item-sub';
      pEgreso.textContent='NÚMERO DE EGRESO 1: '+(c.egreso||'');

      const pEgreso2=document.createElement('p');
      pEgreso2.className='item-sub';
      const eg2 = String(c.egreso2||'').trim();
      pEgreso2.textContent='NÚMERO DE EGRESO 2: ' + (eg2 ? eg2 : 'N/A');

      div.appendChild(pOrden);
      div.appendChild(pFecha);
      div.appendChild(pEgreso);
      div.appendChild(pEgreso2);

      // campos a diligenciar
      const labelPago=document.createElement('label');
      labelPago.textContent='VALOR PAGADO:';
      const inpPago=document.createElement('input');
      inpPago.id='';
      inpPago.className='cop-input';
      inpPago.type='text';
      inpPago.inputMode='numeric';
      inpPago.placeholder='$ 0';
      inpPago.value='';

      inpPago.addEventListener('input', ()=>{
        let digits = String(inpPago.value||'').replace(/\D/g,'');
        if(digits.length>12) digits = digits.slice(0,12);
        const n = digits ? Number(digits) : 0;
        inpPago.value = digits ? formatCOPFrontend(n) : '';
      });

      const labelDest=document.createElement('label');
      labelDest.textContent='FUENTE DE DESTINACIÓN:';
      const selDest=document.createElement('select');
      selDest.id='';
      const opt0=document.createElement('option');
      opt0.value='';
      opt0.textContent='Selecciona';
      opt0.disabled=true;
      opt0.selected=true;
      selDest.appendChild(opt0);
      for(const d of DESTINACIONES){
        const o=document.createElement('option');
        o.value=d.name;
        o.textContent=d.name;
        selDest.appendChild(o);
      }

      const labelBanco=document.createElement('label');
      labelBanco.textContent='BANCO:';
      const inpBanco=document.createElement('input');
      inpBanco.readOnly=true;

      const labelNum=document.createElement('label');
      labelNum.textContent='N° DE CUENTA:';
      const inpNum=document.createElement('input');
      inpNum.readOnly=true;

      selDest.addEventListener('change', ()=>{
        const name=String(selDest.value||'');
        const found = DESTINACIONES.find(x=>x.name===name);
        inpBanco.value = found ? found.banco : '';
        inpNum.value = found ? found.numCuenta : '';
      });

            const labelPago2=document.createElement('label');
      labelPago2.textContent='VALOR PAGADO 2:';
      const inpPago2=document.createElement('input');
      inpPago2.id='pago2';
      inpPago2.className='cop-input';
      inpPago2.type='text';
      inpPago2.inputMode='numeric';
      inpPago2.placeholder='(Opcional) $ 0';

      inpPago2.addEventListener('input', ()=>{
        let digits = String(inpPago2.value||'').replace(/\D/g,'');
        if(digits.length>12) digits = digits.slice(0,12);
        const n = digits ? Number(digits) : 0;
        inpPago2.value = digits ? formatCOPFrontend(n) : '';
      });

      const labelDest2=document.createElement('label');
      labelDest2.textContent='FUENTE DE DESTINACIÓN 2:';
      const selDest2=document.createElement('select');
      selDest2.id='destinacion2';
      const opt02=document.createElement('option');
      opt02.value='';
      opt02.textContent='Selecciona (opcional)';
      opt02.selected=true;
      selDest2.appendChild(opt02);
      for(const d of DESTINACIONES){
        const o=document.createElement('option');
        o.value=d.name;
        o.textContent=d.name;
        selDest2.appendChild(o);
      }

      const labelBanco2=document.createElement('label');
      labelBanco2.textContent='BANCO 2:';
      const inpBanco2=document.createElement('input');
      inpBanco2.id='banco2';
      inpBanco2.readOnly=true;

      const labelNum2=document.createElement('label');
      labelNum2.textContent='N° DE CUENTA 2:';
      const inpNum2=document.createElement('input');
      inpNum2.id='numCuenta2';
      inpNum2.readOnly=true;

      selDest2.addEventListener('change', ()=>{
        const name=String(selDest2.value||'').trim();
        const found = DESTINACIONES.find(x=>x.name===name);
        inpBanco2.value = found ? found.banco : '';
        inpNum2.value = found ? found.numCuenta : '';
      });

      const btnRow=document.createElement('div');
      btnRow.className='btn-row';

      const btnGuardar=document.createElement('button');
      btnGuardar.className='btn-primary';
      btnGuardar.textContent='GUARDAR';
      btnGuardar.addEventListener('click', async ()=>{
        playSoundOnce(SOUNDS.login);

        const pagoNum = parseCOPNumber(inpPago.value);
        if(!pagoNum || pagoNum<=0){
          Swal.fire({icon:'warning',title:'VALOR PAGADO requerido',text:'Ingresa un valor válido en pesos colombianos.'});
          return;
        }
        const destinacion = String(selDest.value||'').trim();
        if(!destinacion){
          Swal.fire({icon:'warning',title:'FUENTE DE DESTINACIÓN requerida',text:'Selecciona una opción.'});
          return;
        }
        const banco = String(inpBanco.value||'').trim();
        const numCuenta = String(inpNum.value||'').trim();
        if(!banco || !numCuenta){
          Swal.fire({icon:'warning',title:'Destino inválido',text:'Selecciona una destinación válida.'});
          return;
        }

        const pagoNum2 = parseCOPNumber(inpPago2.value);
        const destinacion2 = String(selDest2.value||'').trim();
        const banco2 = String(inpBanco2.value||'').trim();
        const numCuenta2 = String(inpNum2.value||'').trim();

        const hasPago2 = pagoNum2 && pagoNum2 > 0;
        const hasAny2 = hasPago2 || !!destinacion2 || !!banco2 || !!numCuenta2;

        if (hasAny2){
          if (!hasPago2){
            Swal.fire({icon:'warning',title:'VALOR PAGADO 2 inválido',text:'Si vas a diligenciar el bloque 2, ingresa un valor válido.'});
            return;
          }
          if (!destinacion2){
            Swal.fire({icon:'warning',title:'FUENTE DE DESTINACIÓN 2 requerida',text:'Selecciona una opción o deja todo el bloque 2 vacío.'});
            return;
          }
          if (!banco2 || !numCuenta2){
            Swal.fire({icon:'warning',title:'Destino 2 inválido',text:'Selecciona una destinación válida en el bloque 2.'});
            return;
          }
        }

        const fecha = fechaDMY(new Date());

        let detallePago = `PAGO DE ${pagoNum} - ${destinacion} - N° CUENTA ${numCuenta} BANCO ${banco}`;
        if (hasAny2){
          detallePago += ` Y PAGO DE ${pagoNum2} - ${destinacion2} - N° CUENTA ${numCuenta2} BANCO ${banco2}`;
        }
        detallePago += ` EL DIA ${fecha}`;
        const rs = await Swal.fire({
          icon:'success',
          title:`Egreso N° ${c.egreso} de ${c.nombre}`,
          text:'¿Marcar esta cuenta como PAGADA?',
          showCancelButton:true,
          confirmButtonText:'GUARDAR',
          cancelButtonText:'Cancelar'
        });
        if(!rs.isConfirmed) return;

        try{
          await apiPost('registrarPago', {
            documento: c.documento,
            informe: c.informe,
            pago: pagoNum,
            destinacion,
            banco,
            numCuenta,
            responsable: currentUser?.profesional || '',
            cuentaText: (String(c.informe||'') + ' de ' + String(c.totalInformes||'')).trim(),
            contrato: c.contrato || '',
            nombre: c.nombre || '',
            egreso: c.egreso || '',
            fechaEgreso: c.fechaEgreso || '',
            egreso2: c.egreso2 || '',
            pago2: (hasAny2 ? pagoNum2 : ''),
            destinacion2: (hasAny2 ? destinacion2 : ''),
            banco2: (hasAny2 ? banco2 : ''),
            numCuenta2: (hasAny2 ? numCuenta2 : ''),
            detallePago
          });

          // WhatsApp contratista (mensaje igual que ya estaba en tu index anterior)
          const telContratista = normalizeContratistaNumber(c.telefono||'');
                    function msgPagadaContratista(){
            const eg2 = String(c.egreso2||'').trim();
            if(!eg2){
              return (
                '> Estado 5️⃣\n' +
                'Estimado(a) *'+(c.nombre||'')+'*\n\n' +
                '¡Con fecha: *'+(c.fechaEgreso||'')+'*, ha sido emitado el Egreso *N° '+(c.egreso||'')+'* para tu *Cuenta N° '+(c.informe||'')+'*!\n' +
                'Si después de 3 días hábiles no has recibido tus honorarios, toma la opción *SOLICITUD TESORERÍA* desde la App para brindarte información.\n\n' +
                'Cordialmente,\n\n*Equipo de Tesorería*\n> Alcaldía de Flandes'
              );
            }
            return (
              '> Estado 5️⃣\n' +
              'Estimado(a) *'+(c.nombre||'')+'*\n\n' +
              '¡Con fecha: *'+(c.fechaEgreso||'')+'*, han sido emitados los Egresos *N° '+(c.egreso||'')+'* y *N° '+(eg2||'')+'* para tu *Cuenta N° '+(c.informe||'')+'*!\n' +
              'Si después de 3 días hábiles no has recibido tus honorarios, toma la opción *SOLICITUD TESORERÍA* desde la App para brindarte información.\n\n' +
              'Cordialmente,\n\n*Equipo de Tesorería*\n> Alcaldía de Flandes'
            );
          }
          if(telContratista){
            sendBuilderbotMessage(telContratista, msgPagadaContratista());
          }

          Swal.fire({icon:'success',title:'Marcada como PAGADA',timer:1800,showConfirmButton:false});
          await cargarCuentasPorEstado();
          showView('view-revision');
        }catch(e){
          Swal.fire({icon:'error',title:'Error',text:e.message});
        }
      });

      btnRow.appendChild(btnGuardar);

      div.appendChild(labelPago);
      div.appendChild(inpPago);
      div.appendChild(labelDest);
      div.appendChild(selDest);
      div.appendChild(labelBanco);
      div.appendChild(inpBanco);
      div.appendChild(labelNum);
      div.appendChild(inpNum);
      div.appendChild(labelPago2);
      div.appendChild(inpPago2);
      div.appendChild(labelDest2);
      div.appendChild(selDest2);
      div.appendChild(labelBanco2);
      div.appendChild(inpBanco2);
      div.appendChild(labelNum2);
      div.appendChild(inpNum2);
      div.appendChild(btnRow);
    }

    if (REVISION_MODE === 'PAGADA'){
      const pFecha=document.createElement('p');
      pFecha.className='item-sub';
      pFecha.textContent='FECHA DE EGRESO: '+(c.fechaEgreso||'');

      const pEgreso=document.createElement('p');
      pEgreso.className='item-sub';
      pEgreso.textContent='NÚMERO DE EGRESO: '+(c.egreso||'');

      const pDet=document.createElement('p');
      pDet.className='item-sub';
      const dsRaw = String(c.detallesPago||'').trim();
      pDet.textContent = 'DETALLES DE PAGO: ' + (dsRaw ? formatPagoDetallesDS_(dsRaw) : '');

      div.appendChild(pOrden);
      div.appendChild(pFecha);
      div.appendChild(pEgreso);
      div.appendChild(pDet);
      // se retira botón VER (no hay botones)
    }

    wrap.appendChild(div);
  }
}

document.getElementById('cuentas-filter').addEventListener('input',()=>{
  const qRaw = document.getElementById('cuentas-filter').value || '';
  const q = qRaw.trim().toLowerCase();
  const digitsOnly = q.replace(/\D/g, '');
  const isNumericOnly = q !== '' && /^\d+$/.test(q);
  const useContratoOnly = isNumericOnly && digitsOnly.length >= 1 && digitsOnly.length <= 3;

  const filtered = CUENTAS_DATA.filter(c=>{
    if (useContratoOnly) return String(c.contrato || '').toLowerCase().includes(q);
    return [c.nombre,c.documento,c.informe,c.totalInformes,c.contrato,c.orden,c.egreso]
      .some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarCuentas(filtered);
  actualizarResumenCuentas(filtered);
});

document.getElementById('revision-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  document.getElementById('revision-title').textContent = '';
  document.getElementById('revision-caption').textContent = '';
  showView('view-inicio');
});

/* ================== COMUNICADOS ================== */
document.getElementById('comunicado-enviar').addEventListener('click',async()=>{
  const txt=(document.getElementById('comunicado-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarComunicado',{
      profesional: currentUser?.profesional || '',
      noticia: txt
    });
    Swal.fire({icon:'success',title:'COMUNICADO CARGADO CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('comunicado-text').value='';
    renderInicio();
    showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('comunicado-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== SOPORTE ================== */
document.getElementById('soporte-enviar').addEventListener('click',async()=>{
  const txt=(document.getElementById('soporte-text').value||'').trim();
  if(!txt){ Swal.fire({icon:'warning',title:'Texto requerido'}); return; }
  try{
    await apiPost('guardarSoporte',{
      profesional: currentUser?.profesional || '',
      soporte: txt,
      celular: currentUser?.celular || ''
    });
    Swal.fire({icon:'success',title:'SOLICITUD CARGADA CON ÉXITO',timer:4000,showConfirmButton:false});
    document.getElementById('soporte-text').value='';
    renderInicio();
    showView('view-inicio');
  }catch(e){
    Swal.fire({icon:'error',title:'Error',text:e.message});
  }
});
document.getElementById('soporte-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});

/* ================== SOLICITUDES ================== */
let SOL_DATA = [];
let SOL_SELECTED = null;

document.getElementById('go-solicitudes').addEventListener('click', async ()=>{
  playSoundOnce(SOUNDS.login);
  await cargarSolicitudes();
  showView('view-solicitudes');
});
document.getElementById('sol-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  showView('view-inicio');
});
document.getElementById('sol-filter').addEventListener('input', ()=>{
  const q = (document.getElementById('sol-filter').value || '').trim().toLowerCase();
  const filtered = SOL_DATA.filter(s=>{
    return [s.nombre, s.secretaria, s.contrato].some(v=>String(v||'').toLowerCase().includes(q));
  });
  pintarSolicitudes(filtered);
  actualizarResumenSolicitudes(filtered);
});
async function cargarSolicitudes(){
  try{
    const list = await apiGet('listSolicitudesPendientes');
    SOL_DATA = Array.isArray(list) ? list : [];
    pintarSolicitudes(SOL_DATA);
    actualizarResumenSolicitudes(SOL_DATA);

    if (!SOL_DATA.length){
      await Swal.fire({ icon:'success', title:'Sin pendientes', text:'No tienes SOLICITUDES pendientes', timer: 2800, showConfirmButton: false });
      showView('view-inicio');
    }
  }catch(e){
    SOL_DATA = [];
    pintarSolicitudes(SOL_DATA);
    actualizarResumenSolicitudes(SOL_DATA);
    Swal.fire({ icon:'error', title:'Error', text:e.message });
  }
}
function actualizarResumenSolicitudes(list){
  const box = document.getElementById('sol-count');
  if(!box) return;
  if(!list.length){ box.style.display='none'; box.textContent=''; return; }
  box.textContent = String(list.length);
  box.style.display='inline-block';
}
function pintarSolicitudes(list){
  const wrap = document.getElementById('sol-list');
  if(!wrap) return;
  wrap.innerHTML = '';
  if(!list.length){
    wrap.innerHTML = '<p class="muted center">No hay solicitudes pendientes.</p>';
    return;
  }
  for(const s of list){
    const div = document.createElement('div');
    div.className = 'item-card';

    const nombre = document.createElement('p');
    nombre.className = 'item-title';
    nombre.innerHTML = '<b>' + (s.nombre || '') + '</b>';

    const sec = document.createElement('p');
    sec.className = 'item-sub';
    sec.textContent = 'SECRETARIA: ' + (s.secretaria || '');

    const cont = document.createElement('p');
    cont.className = 'item-sub';
    cont.textContent = 'CONTRATO: ' + (s.contrato || '');

    const hr = document.createElement('div');
    hr.style.borderTop = '2px solid #ddd';
    hr.style.margin = '8px 0';

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    const btn = document.createElement('button');
    btn.textContent = 'RESPONDER';
    btn.addEventListener('click', ()=>{
      playSoundOnce(SOUNDS.login);
      SOL_SELECTED = s;
      abrirRespuestaSolicitud();
    });

    btnRow.appendChild(btn);

    div.appendChild(nombre);
    div.appendChild(sec);
    div.appendChild(cont);
    div.appendChild(hr);
    div.appendChild(btnRow);

    wrap.appendChild(div);
  }
}
function abrirRespuestaSolicitud(){
  const box = document.getElementById('resp-solicitud-box');
  const ta = document.getElementById('respuesta');
  if (ta) ta.value = '';

  const solicitud = String(SOL_SELECTED?.solicitud || '').trim();
  const nombre = String(SOL_SELECTED?.nombre || '').trim();

  if (box){
    box.innerHTML = [
      `<p><b>Solicitud:</b></p>`,
      `<p style="margin-top:6px;">${solicitud || '-'}</p>`,
      `<p class="muted" style="margin-top:10px;"><b>Contratista:</b> ${nombre || '-'}</p>`
    ].join('');
  }
  showView('view-respuesta');
}
document.getElementById('resp-volver').addEventListener('click', ()=>{
  playSoundOnce(SOUNDS.back);
  SOL_SELECTED = null;
  showView('view-solicitudes');
});
document.getElementById('resp-guardar').addEventListener('click', async ()=>{
  if(!SOL_SELECTED){
    Swal.fire({ icon:'warning', title:'Sin solicitud seleccionada' });
    return;
  }
  const resp = (document.getElementById('respuesta')?.value || '').trim();
  if(!resp){
    Swal.fire({ icon:'warning', title:'Respuesta requerida', text:'Escribe tu respuesta.' });
    return;
  }
  const rowIndex = SOL_SELECTED.rowIndex;
  const nombre = String(SOL_SELECTED.nombre || '').trim();
  const solicitud = String(SOL_SELECTED.solicitud || '').trim();
  const telefonoNormalizado = normalizeContratistaNumber(SOL_SELECTED.telefono);

  const rs = await Swal.fire({
    icon:'success',
    title:'¿Guardar respuesta?',
    text:'Esta solicitud pasará a RESPONDIDA',
    showCancelButton:true,
    confirmButtonText:'GUARDAR',
    cancelButtonText:'Cancelar'
  });
  if(!rs.isConfirmed) return;

  try{
    await apiPost('guardarRespuestaSolicitud', { rowIndex, respuesta: resp });

    const mensaje =
      'Estimado(a) *' + nombre + '*\n\n' +
      'Atendiendo a tu solicitud: ' + solicitud + '\n\n' +
      'Nos permitimos responder: ' + resp + '\n\n' +
      'Muchas gracias por tu comprensión, ¡Excelente día!\n\n' +
      'Cordialmente,\n\n*Equipo de Tesorería*\n> Alcaldía de Flandes';

    if (telefonoNormalizado){
      sendBuilderbotMessage(telefonoNormalizado, mensaje);
    }

    Swal.fire({ icon:'success', title:'Respuesta guardada', timer: 1800, showConfirmButton:false });
    SOL_SELECTED = null;

    await cargarSolicitudes();
    showView('view-solicitudes');
  }catch(e){
    Swal.fire({ icon:'error', title:'Error', text:e.message });
  }
});

/* ================== PWA AVANZADO ================== */
let deferredPrompt = null;
let __installStartShown = false;    // bandera: ya mostramos "App instalándose"
let __installSuccessShown = false;  // bandera: ya mostramos "Instalación exitosa"

function isStandalone(){
  const dmStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const dmInstalled  = window.matchMedia('(display-mode: installed)').matches;
  const iosStandalone = (window.navigator.standalone === true);
  return dmStandalone || dmInstalled || iosStandalone;
}
function isIOS(){
  return /(iphone|ipad|ipod)/i.test(navigator.userAgent || '');
}
function isMarkedInstalled(){
  try{ return localStorage.getItem('pwaInstalledFlag') === '1'; }catch(_){ return false; }
}
function markInstalled(){
  try{ localStorage.setItem('pwaInstalledFlag', '1'); }catch(_){}
}
function clearInstalledMark(){
  try{ localStorage.removeItem('pwaInstalledFlag'); }catch(_){}
}
async function detectInstalled(){
  if (isStandalone()) return true;
  if (typeof navigator.getInstalledRelatedApps === 'function'){
    try{
      const apps = await navigator.getInstalledRelatedApps();
      const found = apps.some(a =>
        a.platform === 'webapp' &&
        typeof a.url === 'string' &&
        /manifest\.webmanifest$/.test(a.url)
      );
      if (found){
        markInstalled();
        return true;
      } else {
        clearInstalledMark();
      }
    }catch(_){}
  }
  return isMarkedInstalled();
}
function updateInstallButtonsVisibility(){
  const btn1 = document.getElementById('btn-instalar');
  const canPrompt = !!deferredPrompt;
  const installed = isMarkedInstalled() || isStandalone();
  const shouldShow = !installed && (canPrompt || isIOS());
  if(btn1) btn1.style.display = shouldShow ? '' : 'none';
}

window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButtonsVisibility();
});

window.addEventListener('appinstalled', ()=>{
  markInstalled();
  deferredPrompt = null;
  updateInstallButtonsVisibility();
});

document.getElementById('btn-instalar').addEventListener('click', async ()=>{
  // Flujo iOS: se respeta exactamente tu alerta e instrucciones
  if(isIOS()){
    Swal.fire({
      icon:'info',
      title: '¡Para Instalar en tu Iphone!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765745210/instalacion_ios_ysbhnd.gif"
        alt="Instalación de IOS"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div style="margin-top:10px;">
        <b>1.</b> Toca Compartir.<br><b>2.</b> Elige "Agregar a pantalla de inicio".<br><b>3.</b> Confirma "Agregar".
      </div>
    </div>
  `,
    });
    return;
  }
  // Android: requiere beforeinstallprompt (deferredPrompt)
  if(!deferredPrompt){
    Swal.fire({icon:'info',title:'Instalación no disponible todavía'});
    return;
  }

  const dp = deferredPrompt;
  dp.prompt();                           // muestra diálogo nativo de instalación
  const choice = await dp.userChoice;    // espera la elección del usuario
  deferredPrompt = null;                 // limpia el prompt (solo se usa una vez)

  if (choice.outcome === 'accepted'){
    // Primera alerta (Android): confirma inicio de instalación por 6 segundos
    markInstalled();
    __installStartShown = true;
    Swal.fire({
  icon: 'success',
  title: '¡App instalándose!',
  html: `
    <div style="text-align:center; margin-top:8px;">
      <img
        src="https://res.cloudinary.com/dqqeavica/image/upload/v1765740540/instalacion_lydtcl.gif"
        alt="Instalando app"
        style="width:180px; max-width:70vw; height:auto; display:block; margin:0 auto 12px;"
      >
      <div>Debes esperar unos segundos mientras el sistema instala la App.</div>
      <div style="margin-top:10px;">
        <b>Al desaparecer este aviso, puedes salir de esta vista. La App aparecerá en la pantalla principal de este dispositivo.</b>
      </div>
    </div>
  `,
  timer: 12000,
  showConfirmButton: false
});
  } else {
    Swal.fire({icon:'info',title:'Instalación cancelada'});
  }

  updateInstallButtonsVisibility();
});

async function initPWAVista(){
  const installed = await detectInstalled();
  if (installed){
    showView('view-login');
  } else {
    showView('view-instalar');
    updateInstallButtonsVisibility();
  }
}
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
window.addEventListener('load', initPWAVista);

(function initEgreso(){
  const eg = document.getElementById('egreso');
  if (!eg) return;

  eg.addEventListener('input', () => {
    let raw = (eg.value || '').replace(/\D/g, '').slice(0, 10);
    if (!raw.startsWith('2026')) {
      if (raw.length >= 1 && raw.length < 4) {
        raw = '2026';
      } else if (raw.length >= 4) {
        raw = '2026' + raw.slice(4);
      } else if (raw.length === 0) {
        raw = '';
      }
    }
    eg.value = raw;

    eg.style.border = '';
    if (raw.length === 10 && raw.startsWith('2026')) {
      eg.style.border = '2px solid green';
    }
  });
})();

(function initPickerFechaEgreso() {
  const dias = document.getElementById('pickerDiaEgreso');
  const meses = document.getElementById('pickerMesEgreso');
  if (!dias || !meses) return;

  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = String(d).padStart(2, '0');
    opt.textContent = String(d).padStart(2, '0');
    dias.appendChild(opt);
  }

  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = String(i + 1).padStart(2, '0');
    opt.textContent = mesesNombres[i];
    meses.appendChild(opt);
  }
})();

function abrirPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  if (modal) modal.style.display = 'flex';
}
function cancelarPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  if (modal) modal.style.display = 'none';
  const fc = document.getElementById('fechaEgreso'); if (fc) fc.value = '';
}
function confirmarPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  const dSel = (document.getElementById('pickerDiaEgreso')?.value) || '01';
  const mSel = (document.getElementById('pickerMesEgreso')?.value) || '01';
  const anio = '2026';

  const fc = document.getElementById('fechaEgreso');
  if (fc) fc.value = `${dSel}/${mSel}/${anio}`;

  if (modal) modal.style.display = 'none';
}

/* ================== PICKER FECHA EGRESO (se mantiene) ================== */
(function initPickerFechaEgreso() {
  const dias = document.getElementById('pickerDiaEgreso');
  const meses = document.getElementById('pickerMesEgreso');
  if (!dias || !meses) return;

  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = String(d).padStart(2, '0');
    opt.textContent = String(d).padStart(2, '0');
    dias.appendChild(opt);
  }

  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = String(i + 1).padStart(2, '0');
    opt.textContent = mesesNombres[i];
    meses.appendChild(opt);
  }
})();

function abrirPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  if (modal) modal.style.display = 'flex';
}
function cancelarPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  if (modal) modal.style.display = 'none';
  // no borramos automáticamente el campo global; solo cerramos
}
function confirmarPickerFechaEgreso() {
  const modal = document.getElementById('egresoModal');
  const dSel = (document.getElementById('pickerDiaEgreso')?.value) || '01';
  const mSel = (document.getElementById('pickerMesEgreso')?.value) || '01';
  const anio = '2026';
  const val = `${dSel}/${mSel}/${anio}`;

  // si venimos de tarjeta, setear ahí
  if(window.__egresoEditing && window.__egresoEditing.inpFecha){
    window.__egresoEditing.inpFecha.value = val;
  }
  if (modal) modal.style.display = 'none';
}

/* ================== AUTO-ACTUALIZACIÓN (version.json) ================== */
let __APP_VERSION_LOADED = '';
let __versionCheckInFlight = false;

async function checkAppVersion(){
  if(__versionCheckInFlight) return;
  __versionCheckInFlight = true;
  try{
    const url = 'version.json?t=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) return;
    const j = await r.json();
    const serverVersion = String(j.version || '').trim();
    if(!serverVersion) return;

    // Primera lectura: guardar la versión actual y pintarla en login
    if(!__APP_VERSION_LOADED){
      __APP_VERSION_LOADED = serverVersion;
      const el = document.getElementById('app-version');
      if(el) el.textContent = 'Versión ' + serverVersion;
      return;
    }

    // Lecturas posteriores: si cambió, recargar silenciosamente
    if(serverVersion !== __APP_VERSION_LOADED){
      try{
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }catch(_){}
      location.reload();
    }
  }catch(_){
    /* silencio: sin red no hay actualización */
  }finally{
    __versionCheckInFlight = false;
  }
}

// Recarga automática cuando el SW nuevo toma control (solo una vez por sesión de página)
if('serviceWorker' in navigator){
  let __reloadingFromSW = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(__reloadingFromSW) return;
    // Evitar loop: solo recargar si NO veníamos de una recarga reciente
    const lastReload = Number(sessionStorage.getItem('__swReloadTs') || 0);
    const now = Date.now();
    if(now - lastReload < 10000) return; // si recargamos hace menos de 10s, no recargar otra vez
    __reloadingFromSW = true;
    sessionStorage.setItem('__swReloadTs', String(now));
    location.reload();
  });
}

// Chequeo al cargar la página
window.addEventListener('load', ()=>{ checkAppVersion(); });

// Chequeo cada vez que la pestaña/PWA vuelve a estar visible (máx 1 vez cada 30s)
let __lastVersionCheck = Date.now();
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) return;
  const now = Date.now();
  if(now - __lastVersionCheck < 30000) return;
  __lastVersionCheck = now;
  checkAppVersion();
});
