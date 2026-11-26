module.exports=function(rows,subscriptionId){
 const confirmed=rows.filter(r=>!r.revoked),revoked=rows.filter(r=>r.revoked);
 return {confirmedCount:confirmed.length,currentSubscriptionCount:confirmed.filter(r=>r.subscription_id===subscriptionId).length,revokedCount:revoked.length,totalCents:confirmed.reduce((sum,r)=>sum+Number(r.amount_cents||0),0),history:[...rows].sort((a,b)=>Date.parse(b.paid_at)-Date.parse(a.paid_at)).map(r=>({id:r.id,amountCents:r.amount_cents,registeredAt:r.paid_at,revoked:!!r.revoked,subscriptionId:r.subscription_id}))};
};
