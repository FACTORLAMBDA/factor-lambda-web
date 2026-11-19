const {databaseHeaders}=require('./supabase-headers');
const {instant}=require('./repro-reservations');
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
function localInstant(value){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||''))fail('Indica fecha y hora completas.');
  const [day,time]=value.split('T');
  if(Number(time.slice(0,2))>23||Number(time.slice(3))>59)fail('Hora no válida.');
  const date=instant(day,time);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  if(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`!==value)fail('Esta hora no existe por el cambio de horario. Elige otra.');
  return date;
}
function appointment(startValue,endValue){
  const start=localInstant(startValue),end=localInstant(endValue);
  if(end<=start||end-start>31*86400000)fail('El final debe ser posterior al inicio, con un máximo de 31 días.');
  return {day:startValue.slice(0,10),time:startValue.slice(11),endDay:endValue.slice(0,10),endTime:endValue.slice(11),durationMinutes:(end-start)/60000,start:start.toISOString(),end:end.toISOString(),timeZone:'Europe/Madrid'};
}
async function rpc(name,body){
  const base=new URL(process.env.SUPABASE_URL);
  const r=await fetch(base.origin+'/rest/v1/rpc/'+name,{method:'POST',headers:{...databaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!r.ok){let error={};try{error=await r.json();}catch{}
    if(['PGRST202','42P01'].includes(error.code))fail('Falta activar el calendario privado: ejecuta database/private-calendar.sql en Supabase.',503);
    if(error.code==='23P01')fail('Ese profesional ya tiene una cita o una retención en ese horario.',409);
    if(error.code==='40001')fail('La cita ha cambiado. Actualiza el calendario antes de guardar.',409);
    if(error.code==='P0001')fail('No se puede modificar esta cita en su estado actual. Actualiza el calendario.',409);
    fail('No se pudo guardar el calendario. No se ha realizado ningún cobro ni devolución.',502);
  }
  const text=await r.text();return text.trim()?JSON.parse(text):null;
}
async function list(from,to){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||''))fail('Intervalo no válido.');
  const start=localInstant(from+'T00:00'),end=localInstant(to+'T00:00');
  if(end<=start||end-start>63*86400000)fail('Consulta un máximo de dos meses a la vez.');
  return rpc('fl_private_calendar_list',{p_from:start.toISOString(),p_to:end.toISOString()});
}
async function save(data){
  const id=data.id||null;if(id&&!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))fail('Referencia no válida.');
  const title=clean(data.title,160),reason=clean(data.reason,500)||(id?'Edición desde el panel':'Alta manual desde el panel');
  if(!title||data.confirmed!==true)fail('Indica título y confirma el cambio.');
  if(!['repro','consult-joaquin','consult-german','mechanics'].includes(data.resource))fail('Selecciona un calendario.');
  if(!['live','test'].includes(data.mode))fail('Entorno no válido.');
  const customer={name:clean(data.name,120),email:clean(data.email,200),phone:clean(data.phone,30)};
  if(customer.email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customer.email))fail('Email no válido.');
  const mechanic=data.mechanic??'';
  if(!['','german','mazius','gerson','david'].includes(mechanic))fail('Selecciona un mecánico válido.');
  const billedHours=data.billedHours==null||data.billedHours===''?null:data.billedHours;
  if(billedHours!==null&&(typeof billedHours!=='number'||!Number.isFinite(billedHours)||billedHours<0||billedHours>10000||Math.abs(billedHours*100-Math.round(billedHours*100))>0.000001))fail('Indica horas facturadas positivas, con un máximo de dos decimales.');
  const vehiclePlate=clean(data.plate,20).toUpperCase(),vehicleVin=clean(data.vin,25).toUpperCase();
  if(vehiclePlate&&!/^[A-Z0-9 -]+$/.test(vehiclePlate))fail('Revisa la matrícula.');
  if(vehicleVin&&!/^[A-Z0-9]{6,25}$/.test(vehicleVin))fail('Revisa el número de bastidor.');
  const selected={...appointment(data.start,data.end),mechanic,billedHours,vehiclePlate,vehicleVin};
  return rpc('fl_private_calendar_save',{p_id:id,p_expected:data.expected||null,p_appointment:selected,p_title:title,p_customer:customer,p_vehicle:clean(data.vehicle,240),p_notes:clean(data.notes,2000),p_resource:data.resource,p_mode:data.mode,p_reason:reason,p_actor:'taller@factorlambda.com'});
}
async function cancel(id,reason){if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||'')||!clean(reason,500))fail('Indica una cita y el motivo.');return rpc('fl_private_calendar_cancel',{p_id:id,p_reason:clean(reason,500),p_actor:'taller@factorlambda.com'});}
async function closures(action,data){
  if(action==='closures'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data.from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(data.to||''))fail('Intervalo no válido.');
    const start=localInstant(data.from+'T00:00'),end=localInstant(data.to+'T00:00');
    if(end<=start||end-start>63*86400000)fail('Consulta un máximo de dos meses.');
    return rpc('fl_calendar_closures_list',{p_from:start.toISOString(),p_to:end.toISOString()});
  }
  if(data.id&&!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.id))fail('Referencia no válida.');
  if(data.confirmed!==true)fail('Confirma el cambio.');
  if(action==='closure-delete'){
    if(!data.id)fail('Selecciona un cierre.');
    return rpc('fl_calendar_closure_delete',{p_id:data.id});
  }
  const title=clean(data.title,160);
  if(!title)fail('Indica el título del cierre.');
  const start=localInstant(data.start),end=localInstant(data.end);
  if(end<=start||end-start>367*86400000)fail('Revisa el inicio y el final del cierre (máximo un año).');
  return rpc('fl_calendar_closure_save',{p_id:data.id||null,p_title:title,p_notes:clean(data.notes,2000),p_start:start.toISOString(),p_end:end.toISOString()});
}
module.exports={appointment,list,save,cancel,closures};
