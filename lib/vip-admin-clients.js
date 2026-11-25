const plans=new Set(['essential','performance','elite']);
module.exports=function({admin,db,result,mode,fail,onGift}){
 return async function(req,data){
  admin(req);
  if(data.confirmed!==true||!(/^[a-f0-9-]{36}$/i.test(data.userId||'')))fail('Confirma el cliente y la operación.');
  const p=await result(db().from('fl_vip_profiles').select('id').eq('id',data.userId).single());
  if(data.action==='edit-client'){
   const name=String(data.name||'').trim(),phone=String(data.phone||'').trim();
   if(!name||name.length>100||phone.length>30)fail('Revisa el nombre y teléfono.');
   await result(db().from('fl_vip_profiles').update({name,phone}).eq('id',p.id));
   return {message:'Cliente actualizado. El correo de acceso no se modifica.'};
  }
  if(data.action==='gift-revoke'){
   await result(db().from('fl_vip_gifts').update({revoked:true,updated_at:new Date().toISOString()}).eq('user_id',p.id).eq('mode',mode()));
   return {message:'Acceso gratuito retirado. No se modifica Stripe.'};
  }
  const end=Date.parse(data.expiresAt),note=String(data.note||'').trim();
  if(data.action!=='gift-grant'||!plans.has(data.plan)||!Number.isFinite(end)||end<=Date.now()||end>Date.now()+3660*86400000||note.length<3||note.length>500)fail('Indica plan, caducidad futura y motivo del regalo.');
  await result(db().rpc('fl_vip_gift_grant',{p_user:p.id,p_mode:mode(),p_plan:data.plan,p_until:new Date(end).toISOString(),p_note:note}));
  try{await onGift(p.id,data.plan,new Date(end).toISOString());}
  catch{return {message:'VIP gratuito activado, pero no se pudo enviar la bienvenida. Vuelve a activar el mismo plan y fecha para reintentar el correo. No se ha realizado ningún cobro.',emailSent:false};}
  return {message:'Plan gratuito activado y bienvenida enviada con el carnet virtual adjunto.',emailSent:true};
 };
};
