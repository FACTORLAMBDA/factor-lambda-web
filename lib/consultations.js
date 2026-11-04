const policy=require('../outputs/consultation-policy');
const reservations=require('./repro-reservations');
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function appointment(day,time,professional,now=new Date()){
  const start=reservations.instant(day,time),slot=policy.slots(professional).find(s=>s.start===time),weekday=new Date(day+'T12:00:00Z').getUTCDay();
  if(!['german','joaquin'].includes(professional)||!slot||[0,6].includes(weekday)||+start<+now+45*60000||+start>+now+180*86400000)fail('Selecciona una hora válida de lunes a viernes con al menos 45 minutos de antelación.');
  return {day,time,endTime:slot.end,start:start.toISOString(),end:new Date(+start+30*60000).toISOString(),durationMinutes:30,timeZone:'Europe/Madrid'};
}
function lead(data){
  const service=policy.service(data.mode,data.topic),clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
  const name=clean(data.name,100),email=clean(data.email,254),rawPhone=clean(data.phone,30),vehicle=clean(data.vehicle,150),plate=clean(data.plate,20),notes=clean(data.notes,1500),otherHelp=clean(data.otherHelp,1500);
  if(!name||!/^[^\s@,;<>]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)||!/^\+?[\d\s().-]+$/.test(rawPhone))fail('Revisa nombre, email y teléfono.');
  let phone=rawPhone.replace(/\D/g,'');if(phone.length===9)phone='34'+phone;if(phone.length<8||phone.length>15)fail('Indica un teléfono válido con prefijo internacional.');
  if(!vehicle||!plate||!notes||(data.topic==='other-help'&&!otherHelp))fail('Completa los datos del vehículo y el motivo de la consulta.');
  if(data.accepted!==true)fail('Acepta las condiciones para tramitar la cita y recibir la confirmación por correo.');
  return {customer:{name,email,phone,emailConsent:true,whatsappConsent:false},vehicle:{model:vehicle,plate},config:{flow:'direct-v1',serviceKind:'consultation',consultation:service,brand:service.professionalName,dyno:false,durationMinutes:30,notes,otherHelp,pricing:{totalCents:service.totalCents,softwareGrossCents:service.totalCents,dynoGrossCents:0,country:'ES',currency:'eur'}},service};
}
async function rpc(name,body){try{return await reservations.rpc(name,body);}catch(e){if(e.status===503)fail('Falta activar la agenda de consultas: el taller debe ejecutar database/consultation-bookings.sql en Supabase.',503);throw e;}}
async function availability(day,professional,mode){reservations.instant(day,'08:00');if(!['german','joaquin'].includes(professional))fail('Profesional no válido.');const busy=await rpc('fl_consult_busy',{p_day:day,p_professional:professional,p_mode:mode});return {day,slots:policy.slots(professional).map(slot=>{let selected;try{selected=appointment(day,slot.start,professional);}catch{return {...slot,available:false};}return {...slot,available:!busy.some(row=>Date.parse(selected.start)<Date.parse(row.ends_at)&&Date.parse(selected.end)>Date.parse(row.starts_at))};})};}
module.exports={lead,appointment,availability,rpc};
