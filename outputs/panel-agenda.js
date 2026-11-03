(() => {
  const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format((n||0)/100);
  const iso=d=>d.toISOString().slice(0,10),add=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d);};
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());
  let start=add(today,1-(new Date(today+'T12:00:00Z').getUTCDay()||7)),rows=[],call,revision=0;
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  function state(q){const b=Array.isArray(q.fl_repro_bookings)?q.fl_repro_bookings[0]:q.fl_repro_bookings;if(q.status==='paid')return 'paid';if(b?.state==='released')return 'released';return 'pending';}
  const labels={paid:'Pago confirmado',pending:'Pendiente de pago',released:'Reserva liberada'};
  function detail(q){const body=$('agenda-detail-body');body.replaceChildren();const dl=document.createElement('dl');
    const fields=[['Cliente',q.customer.name],['Teléfono',q.customer.phone],['Email',q.customer.email],['Vehículo',[q.vehicle.make,q.vehicle.model,q.vehicle.engine].filter(Boolean).join(' · ')],['Servicio','Reprogramación · '+q.config.brand],['Fecha y hora',q.config.appointment.day+' · '+q.config.appointment.time+'–'+q.config.appointment.endTime],['Duración',(q.config.durationMinutes||q.config.appointment.durationMinutes)+' minutos'],['Banco de potencia',q.config.dyno?'Sí':'No'],['Total IVA incluido',money(q.total_cents)],['Estado',labels[state(q)]],['Correo de confirmación',q.notification_status==='sent'?'Enviado':q.status==='paid'?'Pendiente de envío':'Pendiente de pago'],['Entorno',q.stripe_mode==='live'?'Real':'Prueba'],['Notas',q.config.notes||'Sin notas'],['Referencia',q.id]];
    for(const [label,value]of fields){dl.append(node('dt',label),node('dd',value||'—'));}body.append(dl);
    if(q.stripe_session_id){const a=node('a','Ver operación en Stripe');a.href='https://dashboard.stripe.com/'+(q.stripe_mode==='test'?'test/':'')+'search?query='+encodeURIComponent(q.stripe_session_id);a.target='_blank';a.rel='noopener noreferrer';body.append(a);}
    $('agenda-detail').showModal();
  }
  function render(){const mode=$('agenda-mode').value,filter=$('agenda-filter').value,search=$('agenda-search').value.toLocaleLowerCase('es');
    const selected=rows.filter(q=>q.stripe_mode===mode&&(filter==='all'||state(q)===filter)&&[q.customer.name,q.customer.email,q.customer.phone,q.vehicle.make,q.vehicle.model,q.vehicle.engine,q.id].join(' ').toLocaleLowerCase('es').includes(search));
    $('agenda-totals').textContent=selected.length+' citas · '+selected.filter(q=>state(q)==='paid').length+' pagadas · Cobrado: '+money(selected.filter(q=>state(q)==='paid').reduce((sum,q)=>sum+q.total_cents,0));
    const grid=$('agenda-grid');grid.replaceChildren();
    for(let i=0;i<7;i++){const day=add(start,i),section=node('section','');section.className='agenda-day'+(day===today?' today':'');section.append(node('h3',new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))));
      const appointments=selected.filter(q=>q.config.appointment.day===day).sort((a,b)=>a.config.appointment.time.localeCompare(b.config.appointment.time));
      for(const q of appointments){const b=node('button','');b.className='agenda-event '+state(q);b.append(node('strong',q.config.appointment.time+'–'+q.config.appointment.endTime),node('span',q.customer.name),node('small',[q.vehicle.make,q.vehicle.model].filter(Boolean).join(' ')),node('small',labels[state(q)]+' · '+money(q.total_cents)));b.onclick=()=>detail(q);section.append(b);}
      if(!appointments.length){const empty=node('p','Sin citas');empty.className='empty-day';section.append(empty);}grid.append(section);
    }
  }
  async function load(){if(!call)return;const current=++revision;$('agenda-status').textContent='Consultando agenda…';$('agenda-range').textContent=start+' — '+add(start,6);
    try{const data=await call('/api/repro-quotes?'+new URLSearchParams({action:'agenda',from:start,to:add(start,6)}));if(current!==revision)return;rows=data;render();$('agenda-status').textContent='';}catch(e){if(current!==revision)return;rows=[];render();$('agenda-status').textContent=e.message;}
  }
  window.FLAdminAgenda={load(api){call=api;load();},clear(){revision++;rows=[];call=null;$('agenda-grid').replaceChildren();$('agenda-detail').close();}};
  $('agenda-prev').onclick=()=>{start=add(start,-7);load();};$('agenda-next').onclick=()=>{start=add(start,7);load();};$('agenda-today').onclick=()=>{start=add(today,1-(new Date(today+'T12:00:00Z').getUTCDay()||7));load();};$('agenda-refresh').onclick=load;
  for(const id of ['agenda-mode','agenda-filter','agenda-search'])$(id).addEventListener('input',render);
  $('agenda-close').onclick=()=>$('agenda-detail').close();
  for(const view of ['agenda','quotes'])$('tab-'+view).onclick=()=>{for(const name of ['agenda','quotes']){$('tab-'+name).setAttribute('aria-pressed',String(name===view));$(name==='agenda'?'admin-agenda':'admin-quotes-view').hidden=name!==view;}};
})();
