const {databaseHeaders}=require('./supabase-headers');
const {reproSlots}=require('../outputs/booking-schedule');
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
async function rpc(name,body){
  const url=new URL(process.env.SUPABASE_URL);
  const response=await fetch(url.origin+'/rest/v1/rpc/'+name,{method:'POST',headers:{...databaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok){let code;try{code=(await response.json()).code;}catch{}if(code==='PGRST202'||code==='42P01')fail('Falta instalar la agenda de reservas en Supabase. El taller debe ejecutar database/direct-repro-bookings.sql.',503);if(code==='23P01'||code==='23505'||code==='P0001')fail('Esta hora ya no está disponible. Elige otra.',409);fail('No se pudo comprobar la agenda. No se ha realizado ningún cobro.',502);}
  return response.json();
}
function madridParts(instant){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(p=>[p.type,p.value]));}
function instant(day,time){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||!/^\d{2}:\d{2}$/.test(time||''))fail('Fecha u hora no válida.');
  const target=new Date(day+'T'+time+':00Z');if(!Number.isFinite(+target)||target.toISOString().slice(0,10)!==day)fail('Fecha no válida.');
  const parts=madridParts(target),shown=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));
  return new Date(+target-(shown-+target));
}
function appointment(day,time,dyno,now=new Date()){
  const start=instant(day,time),weekday=new Date(day+'T12:00:00Z').getUTCDay();
  const slot=reproSlots(dyno).find(item=>item.start===time);
  if(weekday===0||weekday===6||!slot||+start<+now+45*60000||+start>+now+180*86400000)fail('Selecciona una hora con al menos 45 minutos de antelación, de lunes a viernes, dentro del horario del taller.');
  return {day,time,endTime:slot.end,durationMinutes:slot.duration,start:start.toISOString(),end:new Date(+start+slot.duration*60000).toISOString(),timeZone:'Europe/Madrid'};
}
async function availability(day,dyno,mode){
  // Validate the date even when every slot has elapsed.
  instant(day,'08:00');const busy=await rpc('fl_repro_busy',{p_day:day,p_mode:mode});
  return {day,slots:reproSlots(dyno).map(slot=>{let selected;try{selected=appointment(day,slot.start,dyno);}catch{return {...slot,available:false};}return {...slot,available:!busy.some(row=>Date.parse(selected.start)<Date.parse(row.ends_at)&&Date.parse(selected.end)>Date.parse(row.starts_at))};})};
}
module.exports={rpc,appointment,availability};
