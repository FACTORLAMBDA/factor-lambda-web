function referralCode(value,origin){
 let code=typeof value==='string'?value.trim():'';
 if(code.length>2048)throw Object.assign(Error('El código o enlace de invitación no es válido.'),{status:400});
 if(/^https?:\/\//i.test(code)){let url;try{url=new URL(code);}catch{}if(!url||url.origin!==origin||!['/vip.html','/mi-vip.html'].includes(url.pathname))throw Object.assign(Error('Utiliza el enlace de invitación de Factor Lambda.'),{status:400});code=url.searchParams.get('ref')||'';}
 code=code.toUpperCase();if(!/^FL-[A-F0-9]{10}$/.test(code))throw Object.assign(Error('El código de invitación debe tener el formato FL- seguido de 10 caracteres.'),{status:400});return code;
}
function summary(rows){
 const reversed=new Set(rows.filter(r=>r.kind==='reversal').map(r=>String(r.source||'').replace(/^reversal:/,'')));
 const credits=rows.filter(r=>!reversed.has(r.id)&&Number(r.delta)>0);
 const welcome=credits.filter(r=>r.kind==='welcome').reduce((n,r)=>n+Number(r.delta),0);
 const referrals=credits.filter(r=>r.kind==='referral');
 const earnedReferrals=referrals.reduce((n,r)=>n+Number(r.delta),0);
 const used=rows.filter(r=>r.kind==='redemption').reduce((n,r)=>n-Number(r.delta),0);
 const balance=rows.reduce((n,r)=>n+Number(r.delta),0);
 const available=Math.max(0,balance),welcomeAvailable=Math.min(available,Math.max(0,welcome-used));
 return {welcomeGranted:welcome,referralCount:new Set(referrals.map(r=>r.source||r.id)).size,referralEarned:earnedReferrals,used,available,welcomeAvailable,referralAvailable:Math.max(0,available-welcomeAvailable)};
}
module.exports={referralCode,summary};
