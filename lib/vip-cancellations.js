const reasons={too_expensive:'Precio demasiado alto',unused:'Ya no lo necesita',missing_features:'Necesita otras ventajas',customer_service:'Atención al cliente',switched_service:'Ha elegido otro servicio',too_complex:'Dificultad de uso',low_quality:'Calidad del servicio',other:'Otro motivo'};
function reason(d={}){return reasons[d.feedback]||({payment_failed:'Baja por impago',payment_disputed:'Pago en disputa'}[d.reason])||'No indicado por el cliente';}
module.exports=async function(members,retrieve){
 const pending=members.filter(m=>m.subscription_id&&(m.cancel_at_period_end||m.status==='canceled'));
 const details=new Map();
 for(let i=0;i<pending.length;i+=5)await Promise.all(pending.slice(i,i+5).map(async m=>{
  try{
   const sub=await retrieve(m.subscription_id),customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id;
   if(sub.id!==m.subscription_id||customer!==m.customer_id)throw Error('Ownership mismatch');
   const d=sub.cancellation_details||{};
   details.set(m.user_id,{reason:reason(d),comment:typeof d.comment==='string'?d.comment.slice(0,2000):'',requestedAt:sub.canceled_at?new Date(sub.canceled_at*1000).toISOString():null,endedAt:sub.ended_at?new Date(sub.ended_at*1000).toISOString():null});
  }catch{details.set(m.user_id,{reason:'Motivo no disponible temporalmente. Pulsa Actualizar.',unavailable:true});}
 }));
 return members.map(m=>({...m,...(details.has(m.user_id)?{cancellation:details.get(m.user_id)}:{})}));
};
module.exports.reason=reason;
