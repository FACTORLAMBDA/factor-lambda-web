(() => {
  const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format((n||0)/100);
  const iso=d=>d.toISOString().slice(0,10),add=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d);};
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());
  let start=add(today,1-(new Date(today+'T12:00:00Z').getUTCDay()||7)),rows=[],call,revision=0;
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  function state(q){const b=Array.isArray(q.fl_repro_bookings)?q.fl_repro_bookings[0]:q.fl_repro_bookings;if(q.config.adminCancelled)return 'cancelled';if(q.status==='paid'&&b?.state==='confirmed')return 'paid';if(b?.state==='released')return 'released';return 'pending';}
  const labels={paid:'Pago confirmado · Cita confirmada',pending:'Retención provisional · Sin cita confirmada',released:'Reserva liberada',cancelled:'Cita anulada'};
  function detail(q){const body=$('agenda-detail-body');body.replaceChildren();const dl=document.createElement('dl');
    const fields=[['Cliente',q.customer.name],['Teléfono',q.customer.phone],['Email',q.customer.email],['Vehículo',[q.vehicle.make,q.vehicle.model,q.vehicle.engine].filter(Boolean).join(' · ')],['Servicio','Reprogramación · '+q.config.brand],['Fecha y hora',q.config.appointment.day+' · '+q.config.appointment.time+'–'+q.config.appointment.endTime],['Duración',(q.config.durationMinutes||q.config.appointment.durationMinutes)+' minutos'],['Banco de potencia',q.config.dyno?'Sí':'No'],['Total IVA incluido',money(q.total_cents)],['Estado',labels[state(q)]],['Correo de confirmación',q.notification_status==='sent'?'Enviado':q.status==='paid'?'Pendiente de envío':'Pendiente de pago'],['Entorno',q.stripe_mode==='live'?'Real':'Prueba'],['Notas',q.config.notes||'Sin notas'],['Referencia',q.id]];
    if(q.config.serviceKind==='consultation'){const s=q.config.consultation;fields[4][1]=s.label+' · '+s.professionalName;fields[7][1]='No aplica';fields.push(['Motivo',s.topicLabel],['Matrícula',q.vehicle.plate]);}
    for(const [label,value]of fields){dl.append(node('dt',label),node('dd',value||'—'));}body.append(dl);
    if(q.stripe_session_id){const a=node('a','Ver operación en Stripe');a.href='https://dashboard.stripe.com/'+(q.stripe_mode==='test'?'test/':'')+'search?query='+encodeURIComponent(q.stripe_session_id);a.target='_blank';a.rel='noopener noreferrer';body.append(a);}
    const contact=node('div','');contact.className='booking-navigation';
    for(const [label,href]of [['Llamar','tel:+'+String(q.customer.phone||'').replace(/\D/g,'')],['WhatsApp','https://wa.me/'+String(q.customer.phone||'').replace(/\D/g,'')+'?text='+encodeURIComponent('Hola '+q.customer.name+', te contactamos de Factor Lambda por tu solicitud de reprogramación. Referencia: '+q.id)],['Email','mailto:'+encodeURIComponent(q.customer.email||'')+'?subject='+encodeURIComponent('Tu solicitud en Factor Lambda · '+q.id)]]){const a=node('a',label);a.href=href;a.rel='noopener noreferrer';if(label==='WhatsApp')a.target='_blank';contact.append(a);}body.append(contact);
    const actions=node('div','');actions.className='booking-navigation';const message=node('p','');message.setAttribute('role','status');
    async function submit(action,extra={}){const reason=prompt('Motivo del cambio:');if(!reason?.trim())return;if(!confirm(action==='cancel'?'¿Anular la cita? No se realizará ningún reembolso automático.':'¿Guardar el cambio de cita?'))return;
      for(const b of actions.querySelectorAll('button'))b.disabled=true;
      try{const result=await call('/api/repro-quotes?action=admin-action',{method:'POST',body:JSON.stringify({id:q.id,action,confirmed:true,reason,...extra})});message.textContent=result.message+' '+result.notification;await load();}catch(e){message.textContent=e.message;for(const b of actions.querySelectorAll('button'))b.disabled=false;}}
    if(state(q)==='paid'){
      const dateInput=document.createElement('input');dateInput.type='date';dateInput.min=today;dateInput.value=q.config.appointment.day;dateInput.setAttribute('aria-label','Nueva fecha');
      const timeInput=document.createElement('select');timeInput.setAttribute('aria-label','Nueva hora');const slots=q.config.serviceKind==='consultation'?window.FLConsultation.slots(q.config.consultation.professional):window.FLBookingSchedule.reproSlots(q.config.dyno);for(const slot of slots)timeInput.add(new Option(slot.start+'–'+slot.end,slot.start));
      const move=node('button','Mover cita');move.onclick=()=>submit('move',{day:dateInput.value,time:timeInput.value});body.append(node('h3','Cambiar fecha y hora'),dateInput,timeInput);actions.append(move);
    }
    if(['paid','pending'].includes(state(q))){const cancel=node('button','Anular cita');cancel.onclick=()=>submit('cancel');actions.append(cancel);}body.append(actions,message);
    $('agenda-detail').showModal();
  }
  function render(){const mode=$('agenda-mode').value,filter=$('agenda-filter').value,search=$('agenda-search').value.toLocaleLowerCase('es');
    const selected=rows.filter(q=>q.stripe_mode===mode&&(filter==='all'||state(q)===filter||(filter==='unpaid'&&q.status!=='paid'&&!q.config.adminCancelled))&&[q.customer.name,q.customer.email,q.customer.phone,q.vehicle.make,q.vehicle.model,q.vehicle.engine,q.id].join(' ').toLocaleLowerCase('es').includes(search));
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
