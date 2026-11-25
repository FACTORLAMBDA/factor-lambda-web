const plans=new Set(['essential','performance','elite']);
const identity=require('./vip-identity');
module.exports=function({admin,db,result,mode,fail,onGift,onEmailChange,onResend,onRevoke}){
 return async function(req,data){
  admin(req);
  if(data.confirmed!==true||!(/^[a-f0-9-]{36}$/i.test(data.userId||'')))fail('Confirma el cliente y la operación.');
  const p=await result(db().from('fl_vip_profiles').select('*').eq('id',data.userId).single());
  if(data.action==='resend-welcome'){
   if(!/^[a-f0-9-]{36}$/i.test(data.operation||''))fail('Confirma el reenvío del correo.');
   await onResend(p.id,data.operation);
   return {message:'Bienvenida reenviada al correo del cliente con su carnet virtual adjunto.'};
  }
  if(data.action==='edit-client'){
   const name=String(data.name||'').trim(),phone=String(data.phone||'').trim();
   if(!name||name.length>100||phone.length>30)fail('Revisa el nombre y teléfono.');
   const dni=String(data.dni||'').trim(),protectedDni=dni?identity.protect(dni):{};
   const email=data.email===undefined?p.email:String(data.email).trim().toLowerCase();
   if(email!==p.email){
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>254||email!==String(data.emailConfirm||'').trim().toLowerCase()||data.expectedEmail!==p.email)fail('Revisa y repite el nuevo correo. Actualiza el panel si los datos han cambiado.');
    await onEmailChange(p.id,p.email,email);
   }
   await result(db().from('fl_vip_profiles').update({name,phone,...protectedDni,...(email!==p.email?{email}:{})}).eq('id',p.id));
   return {message:email!==p.email?'Datos guardados. El cliente debe usar el nuevo correo para acceder.':'Datos del cliente guardados.'};
  }
  if(data.action==='gift-revoke'){
   if(onRevoke)await onRevoke(p.id);
   await result(db().from('fl_vip_gifts').update({revoked:true,updated_at:new Date().toISOString()}).eq('user_id',p.id).eq('mode',mode()));
   return {message:'Acceso gratuito retirado. No se modifica Stripe.'};
  }
  const end=Date.parse(data.expiresAt),note=String(data.note||'').trim();
  if(data.action!=='gift-grant'||!plans.has(data.plan)||!Number.isFinite(end)||end<=Date.now()||end>Date.now()+3660*86400000||note.length<3||note.length>500)fail('Indica plan, caducidad futura y motivo del regalo.');
  await result(db().rpc('fl_vip_gift_grant',{p_user:p.id,p_mode:mode(),p_plan:data.plan,p_until:new Date(end).toISOString(),p_note:note}));
  try{await onGift(p.id,data.plan,new Date(end).toISOString());}
  catch(e){return {message:e.status===400?'VIP gratuito activado. '+e.message:'VIP gratuito activado, pero no se pudo enviar la bienvenida. Usa Reenviar bienvenida para reintentar el correo. No se ha realizado ningún cobro.',emailSent:false};}
  return {message:'Plan gratuito activado y bienvenida enviada con el carnet virtual adjunto.',emailSent:true};
 };
};
