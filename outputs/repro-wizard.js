(() => {
  const $=id=>document.getElementById(id);
  if(!$('repro-agenda'))return;
  let carLabel='',day=null,time=null,weekOffset=0;
  const clock=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
  const nowDay=()=>{const parts=Object.fromEntries(clock.formatToParts(new Date()).map(p=>[p.type,p.value]));return parts.year+'-'+parts.month+'-'+parts.day;};
  const date=value=>new Date(value+'T12:00:00Z');
  const iso=value=>value.toISOString().slice(0,10);
  const add=(value,days)=>{const result=date(value);result.setUTCDate(result.getUTCDate()+days);return iso(result);};
  const fmt=value=>new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date(value));
  const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100);
  const withDyno=()=>$('lead-dyno').value==='yes';
  const bank=()=>withDyno()?({'REVO':8000,'TLR SPORT':10000}[$('lead-brand').value]??null):0;
  function go(step){
    for(const [key,id]of Object.entries({vehicle:'repro-selector',agenda:'repro-agenda',contact:'repro-contact',payment:'repro-payment'}))$(id).hidden=key!==step;
    document.querySelectorAll('[data-repro-step]').forEach(node=>{if(node.dataset.reproStep===step)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});
    const target=step==='vehicle'?$('repro-selector'):$('repro-'+step+'-title');
    target.scrollIntoView({behavior:'smooth',block:'start'});if(target.matches('[tabindex]'))target.focus({preventScroll:true});
  }
  function renderTimes(){
    $('repro-times').replaceChildren();$('repro-day-label').textContent=day?fmt(day):'Selecciona un día';
    if(!day)return;
    const current=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
    const slots=window.FLBookingSchedule.reproSlots(withDyno()).filter(slot=>day!==nowDay()||slot.start>current);
    for(const slot of slots){const label=document.createElement('label');label.className='repro-time';const radio=document.createElement('input');radio.type='radio';radio.name='repro-time';radio.value=slot.start;radio.checked=time===slot.start;radio.onchange=()=>{time=slot.start;$('repro-agenda-status').textContent=fmt(day)+' · '+slot.start+'–'+slot.end;};const text=document.createElement('span');text.textContent=slot.start+'–'+slot.end;label.append(radio,text);$('repro-times').append(label);}
    if(!slots.length)$('repro-agenda-status').textContent='No quedan horas en este día. Selecciona otra fecha.';
  }
  function renderWeek(){
    const today=nowDay(),weekday=date(today).getUTCDay();const monday=add(today,(weekday===0?-6:1-weekday)+weekOffset*7);
    $('repro-week-label').textContent=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(date(monday));$('repro-week-back').disabled=weekOffset===0;
    $('repro-week').replaceChildren();
    for(let i=0;i<5;i++){const value=add(monday,i),button=document.createElement('button');button.type='button';button.disabled=value<today;button.setAttribute('aria-pressed',String(value===day));button.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(date(value));button.onclick=()=>{day=value;time=null;$('repro-agenda-status').textContent='';renderWeek();renderTimes();};$('repro-week').append(button);}
  }
  function serviceChanged(){time=null;$('repro-agenda-status').textContent='';const cost=bank();$('repro-bank-price').textContent=cost===null?'Suplemento de banco pendiente de confirmar según el preparador.':cost?money(cost)+' · IVA incluido':'Sin suplemento de banco';renderTimes();}
  $('repro-service-placement').append($('repro-service-fields'));
  $('lead-brand').onchange=serviceChanged;$('lead-dyno').onchange=serviceChanged;
  $('repro-week-back').onclick=()=>{weekOffset=Math.max(0,weekOffset-1);renderWeek();};$('repro-week-next').onclick=()=>{weekOffset++;renderWeek();};
  $('agenda-back').onclick=()=>go('vehicle');
  $('repro-agenda-form').onsubmit=event=>{event.preventDefault();if(!day||!time||day<nowDay()){$('repro-agenda-status').textContent='Selecciona un día y una hora.';return;}$('repro-contact-appointment').textContent=fmt(day)+' · '+time+' · '+$('lead-brand').value+' · '+(withDyno()?'2 h 30 min':'1 h 30 min');go('contact');};
  $('lead-back').onclick=()=>go('agenda');$('payment-back').onclick=()=>go('contact');
  $('repro-lead-form').onsubmit=event=>{event.preventDefault();const list=$('repro-payment-summary');list.replaceChildren();for(const [label,value]of [['Vehículo',carLabel],['Cita seleccionada',fmt(day)+' · '+time],['Preparador',$('lead-brand').value],['Duración',withDyno()?'2 h 30 min':'1 h 30 min'],['Banco de potencia',bank()===null?'Pendiente de confirmar':bank()?money(bank())+' IVA incluido':'Sin banco'],['Titular',$('lead-name').value.trim()],['Correo de confirmación',$('lead-email').value.trim()]]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);list.append(row);}go('payment');};
  window.FLReproWizard={open(label){carLabel=label;day=null;time=null;weekOffset=0;$('agenda-car-summary').textContent=label;$('repro-car-summary').textContent=label;renderWeek();serviceChanged();go('agenda');}};
})();
