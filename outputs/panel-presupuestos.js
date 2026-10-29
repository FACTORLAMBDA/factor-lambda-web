(() => {
  const $=id=>document.getElementById(id);
  let password='';
  const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
  async function call(url,options={}){
    const response=await fetch(url,{...options,headers:{Authorization:'Bearer '+password,'Content-Type':'application/json'}});
    const result=await response.json();if(!response.ok)throw Error(result.error);return result;
  }
  function renderQuote(q){
    const item=document.createElement('article');item.className='quote-admin-item';
    const heading=document.createElement('h2');heading.textContent=q.customer.name+' · '+q.status;
    const details=document.createElement('p');
    details.textContent=['Referencia: '+q.id,new Date(q.created_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}),[q.vehicle.make,q.vehicle.model,q.vehicle.engine,q.vehicle.year].filter(Boolean).join(' · '),'Preferencia: '+q.config.brand,q.config.dyno?'Banco +50 € IVA incluido':'Sin banco','Email: '+q.customer.email,'Teléfono: '+q.customer.phone,q.customer.whatsappConsent?'Ha solicitado presupuesto por email y WhatsApp':'Ha solicitado presupuesto por email','Consulta: '+q.config.notes].join('\n');
    item.append(heading,details);
    if(!['pending','send_failed'].includes(q.status)){
      if(q.total_cents){const total=document.createElement('p');total.textContent='Total aprobado: '+money(q.total_cents)+' IVA incluido';item.append(total);}return item;
    }
    const brand=document.createElement('select');brand.id='brand-'+q.id;brand.required=true;
    brand.append(new Option('Selecciona preparador',''),new Option('TLR SPORT','TLR SPORT'),new Option('REVO','REVO'));
    brand.value=['TLR SPORT','REVO'].includes(q.config.brand)?q.config.brand:'';
    const brandLabel=document.createElement('label');brandLabel.htmlFor=brand.id;brandLabel.textContent='Preparador confirmado';
    const input=document.createElement('input');input.type='number';input.min='.01';input.max='100000';input.step='.01';input.required=true;input.id='base-'+q.id;input.placeholder='Precio base con IVA';
    if(q.base_cents)input.value=(q.base_cents/100).toFixed(2);
    const label=document.createElement('label');label.htmlFor=input.id;label.textContent='Precio base de la reprogramación · IVA incluido';
    const total=document.createElement('p');const update=()=>total.textContent='Total a enviar: '+money(Math.round(Number(input.value||0)*100)+(q.config.dyno?5000:0))+(q.config.dyno?' (incluye 50 € de banco)':'');input.oninput=update;update();
    const send=document.createElement('button');send.type='button';send.textContent=q.status==='send_failed'?'REINTENTAR ENVÍO PENDIENTE':'ENVIAR PRESUPUESTO';
    send.onclick=async()=>{
      if(!brand.reportValidity()||!input.reportValidity())return;
      const cents=Math.round(Number(input.value)*100);if(!Number.isSafeInteger(cents)||cents<1)return;
      send.disabled=true;
      try{const result=await call('/api/repro-quotes?action=approve',{method:'POST',body:JSON.stringify({id:q.id,baseCents:cents,brand:brand.value})});await refresh();$('admin-status').textContent='Presupuesto '+result.status+' · '+q.id;}
      catch(e){$('admin-status').textContent=e.message;send.disabled=false;}
    };
    item.append(brandLabel,brand,label,input,total,send);return item;
  }
  async function refresh(){
    try{
      $('admin-status').textContent='Consultando solicitudes…';
      const quotes=await call('/api/repro-quotes?action=list');
      $('admin-login').hidden=true;$('admin-refresh').hidden=false;$('admin-logout').hidden=false;$('admin-password').value='';
      $('admin-quotes').replaceChildren(...quotes.map(renderQuote));$('admin-status').textContent=quotes.length+' solicitudes cargadas. Revisa el importe antes de enviar.';
    }catch(e){$('admin-status').textContent=e.message;}
  }
  $('admin-login').onsubmit=e=>{e.preventDefault();password=$('admin-password').value;refresh();};$('admin-refresh').onclick=refresh;
  $('admin-logout').onclick=()=>{password='';$('admin-quotes').replaceChildren();$('admin-login').hidden=false;$('admin-refresh').hidden=true;$('admin-logout').hidden=true;$('admin-status').textContent='Sesión cerrada.';};
})();
