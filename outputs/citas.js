(() => {
  if(!document.querySelector('script[data-fl-agent]')){const agent=document.createElement('script');agent.src='/fl-agent.js';agent.dataset.flAgent='true';document.head.append(agent);}
  const headerStyle=document.createElement('style');
  headerStyle.textContent=`
    header nav{flex-wrap:wrap;row-gap:0}
    header .booking-header-button{display:inline-flex;align-items:center;justify-content:center;align-self:center;justify-self:center;width:156px;min-width:156px;height:48px;min-height:48px;padding:2px 20px 0;border-radius:5px;font-family:'Teko','Arial Narrow',Arial,sans-serif;font-size:24px;line-height:1;font-weight:700;text-align:center;white-space:nowrap;letter-spacing:0;box-sizing:border-box}
    @media(max-width:1050px){header .booking-header-button{align-self:center;margin:4px auto;width:160px;min-width:160px}}
  `;
  document.head.append(headerStyle);
  document.querySelectorAll('.floating-whatsapp .whatsapp-logo').forEach(icon=>{
    const img=document.createElement('img');img.src='/assets/whatsapp-logo-transparente.png';img.alt='';
    img.width=30;img.height=28;img.style.cssText='width:30px;height:28px;object-fit:contain;display:block;flex:0 0 auto;border-radius:4px';icon.replaceWith(img);
  });
  document.querySelectorAll('header .whatsapp-button, header .cta').forEach(a => {
    a.classList.add('booking-header-button');
    a.textContent='PEDIR CITA';a.href='/citas.html';a.removeAttribute('target');a.setAttribute('aria-label','Pedir cita');
  });
  document.querySelectorAll('.topbar .phone').forEach(e=>e.remove());
  const root=document.getElementById('appointment-page');if(!root)return;
  const isRepro=root.dataset.flow==='repro';
  root.innerHTML=`
    <p class="demo-note">Vista previa · No se realizan reservas ni cobros.</p>
    <ol class="booking-progress" aria-label="Progreso"><li>1. Servicio</li><li>2. Hora</li><li>3. Detalles</li><li>4. Finalizar</li></ol>
    <form id="booking-form" novalidate>
      <section data-step="0"><h2>Elige tu consulta</h2>
        <div class="service-fields"><div><label for="booking-mode">Tipo de cita</label><select id="booking-mode"><option value="phone">Telefónica · 25 € IVA incluido</option><option value="visit">Presencial · 30 € IVA incluido</option></select></div>
        <div><label for="booking-topic">¿Cuál es el motivo?</label><select id="booking-topic" required><option value="">Selecciona el motivo</option><option value="mechanics">Mecánica · Germán</option><option value="tuning">Reprogramaciones · Joaquín</option><option value="online-quote">Presupuesto online · 30 € IVA incluido</option><option value="quick-mechanics">Mecánica rápida</option><option value="dynamic-test">Prueba dinámica</option><option value="exhausts">Escapes</option><option value="other-help">Otra ayuda</option></select>
        <div id="booking-other-wrap" hidden><label for="booking-other">¿Qué necesitas?</label><textarea id="booking-other" maxlength="1500" placeholder="Cuéntanos qué ayuda necesitas" disabled></textarea></div></div></div>
        <div id="booking-repro-options" class="service-fields" hidden><div><label for="booking-brand">Marca de la reprogramación</label><select id="booking-brand"><option value="">Elige marca</option><option value="TLR SPORT">TLR SPORT</option><option value="REVO">REVO</option></select></div><div><label for="booking-dyno">Banco de potencia</label><select id="booking-dyno"><option value="yes">Con banco · 2 h 30 min</option><option value="no">Sin banco · 1 h 30 min</option></select></div></div>
        <p id="booking-price" class="booking-price"></p><p id="booking-description"></p><p class="consult-credit">El importe abonado por la consulta se descontará del presupuesto asignado si la reparación se realiza con nosotros.</p><p>Lunes a viernes · Horario de España peninsular</p>
      </section>
      <section data-step="1" hidden><h2>Elige día y hora</h2><p id="booking-professional"></p>
        <div class="calendar-navigation"><button type="button" id="booking-prev" aria-label="Semana anterior">&#8249;</button><label>Desde<input type="date" id="booking-date" aria-label="Fecha inicial de la agenda"></label><button type="button" id="booking-next" aria-label="Semana siguiente">&#8250;</button></div>
        <div id="booking-calendar" class="booking-calendar" aria-label="Agenda de citas"></div><p id="booking-selection" aria-live="polite"></p>
      </section>
      <section data-step="2" hidden><p id="booking-chosen"></p>
        <div class="contact-fields"><div><label for="booking-name">Nombre completo</label><input id="booking-name" autocomplete="name" required maxlength="100"></div><div><label for="booking-phone">Teléfono</label><input id="booking-phone" type="tel" autocomplete="tel" required maxlength="30" placeholder="+34 612 34 56 78"></div><div><label for="booking-email">Email</label><input id="booking-email" type="email" autocomplete="email" required maxlength="254"></div></div>
        <label for="booking-vehicle">Marca y modelo del vehículo</label><input id="booking-vehicle" required maxlength="150">
        <label for="booking-plate">Matrícula</label><input id="booking-plate" required maxlength="20">
        <label for="booking-dni">DNI / NIE (opcional)</label><input id="booking-dni" maxlength="30" autocomplete="off">
        <label for="booking-details">¿Qué vamos a comprobar?</label><textarea id="booking-details" required maxlength="1500"></textarea>
      </section>
      <section data-step="3" hidden><h2>Carrito</h2><div class="cart-layout">
        <div><div class="cart-heading"><span>PRODUCTO</span><span>TOTAL</span></div>
          <div class="cart-item"><img src="/assets/favicon-factor-lambda.png" alt="Factor Lambda" width="80" height="80"><div><h3 id="booking-product"></h3><p id="booking-summary" class="booking-summary"></p><p>Cantidad: 1 cita</p><button type="button" id="booking-edit" class="text-action">Editar cita</button> <button type="button" id="booking-remove" class="text-action">Eliminar</button></div><strong id="booking-item-price"></strong></div>
        </div>
        <aside class="cart-totals"><h3>TOTALES DEL CARRITO</h3><div class="cart-heading"><strong>Total</strong><strong id="booking-total"></strong></div><p id="booking-tax-note">IVA incluido</p>
          <div class="booking-conditions"><h3>Confirmación y condiciones de la cita</h3>
            <p>El importe abonado por la consulta se descontará del presupuesto asignado si la reparación se realiza con nosotros.</p>
            <p>Tras verificar el pago y confirmar la reserva, recibirás un correo en la dirección que has indicado con el justificante de pago y los detalles de tu cita.</p>
            <p>Para modificar o anular tu cita, escribe a <a href="mailto:flgarage@factorlambda.com">flgarage@factorlambda.com</a> indicando tus datos, la fecha de la cita y explicando la situación.</p>
            <p>En caso de anulación sin justificación, inasistencia o falta de respuesta del cliente a la hora acordada sin justificación, no se devolverá el importe abonado, sin perjuicio de los derechos que legalmente correspondan.</p>
            <label class="booking-consent"><input type="checkbox" id="booking-consent" required><span>He leído y acepto las condiciones de modificación, anulación y no devolución indicadas.</span></label>
          </div>
          <div class="payment-preview" aria-label="Métodos de pago pendientes de activación"><button type="button" disabled>Apple Pay</button><button type="button" disabled>Google Pay</button><button type="button" disabled>Visa / Mastercard</button></div>
          <p class="demo-note">Pago pendiente de activación</p><button type="button" class="booking-pay" disabled>FINALIZAR COMPRA</button><p class="demo-note">No se ha reservado ninguna hora ni enviado ningún correo. Tus datos no se guardan en esta demostración.</p>
        </aside></div>
      </section>
      <p id="booking-error" role="alert"></p><div class="booking-navigation"><button type="button" id="booking-back">ATRÁS</button><button type="submit" id="booking-forward">SIGUIENTE &#8594;</button></div>
    </form>`;
  const get=id=>document.getElementById('booking-'+id),sections=[...root.querySelectorAll('[data-step]')],progress=[...root.querySelectorAll('.booking-progress li')];
  if(isRepro){
    get('mode').value='visit';get('topic').value='tuning';
    root.querySelector('.service-fields').hidden=true;get('repro-options').hidden=false;get('brand').required=true;
    root.querySelector('[data-step="0"] h2').textContent='Configura tu reprogramación';
    root.querySelectorAll('.consult-credit,.booking-conditions,.payment-preview').forEach(e=>e.hidden=true);
    root.querySelector('.cart-totals h3').textContent='TU REPROGRAMACIÓN';
    get('consent').required=false;
    get('tax-note').textContent='Precio a confirmar según vehículo y configuración. Esta vista previa no realiza cobros.';
  }
  const now=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const format=value=>new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00'));
  let step=0,selected=null;
  const joaquin=()=>['tuning','exhausts'].includes(get('topic').value);
  const phone=()=>get('mode').value==='phone',person=()=>joaquin()?(get('topic').value==='exhausts'?'Joaquín · Escapes':'Joaquín · Reprogramaciones'):'Germán · Mecánica',amount=()=>isRepro?'A confirmar':get('topic').value==='online-quote'?'30 €':phone()?'25 €':'30 €';
  const duration=()=>isRepro?(get('dyno').value==='yes'?'2 h 30 min':'1 h 30 min'):'30 minutos';
  const scheduled=()=>isRepro||phone();
  const reason=()=>get('topic').selectedOptions[0].textContent+(get('topic').value==='other-help'?' · '+get('other').value:'');
  function show(value){
    step=value;sections.forEach((e,i)=>e.hidden=i!==step);progress.forEach((e,i)=>{e.classList.toggle('complete',i<=step);if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
    get('back').hidden=step===0;get('forward').hidden=step===3;get('error').textContent='';
    const appointment=()=>scheduled()?format(selected.date)+' · '+selected.time+(isRepro?'–'+selected.end:'')+' · '+duration():'Presencial · Fecha y hora por acordar con el taller';
    if(step===1)calendar();
    if(step===2)get('chosen').textContent=(isRepro?'Tu reprogramación: ':'Tu consulta: ')+person()+' · '+appointment()+' · '+amount()+(isRepro?'':' IVA incluido');
    if(step===3){get('product').textContent=(isRepro?'Reprogramación '+get('brand').value:phone()?'Consulta telefónica':'Consulta presencial')+' · '+person();get('summary').textContent=[appointment(),isRepro?(get('dyno').value==='yes'?'Con banco de potencia':'Sin banco de potencia'):'Motivo: '+reason(),'Vehículo: '+get('vehicle').value,'Matrícula: '+get('plate').value,'Cliente: '+get('name').value,'Email: '+get('email').value,'Consulta: '+get('details').value].join('\n');get('total').textContent=amount();get('item-price').textContent=amount();}
    root.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function update(){selected=null;get('consent').checked=false;const quote=get('topic').value==='online-quote';get('mode').options[0].textContent='Telefónica · '+(quote?'30':'25')+' € IVA incluido';get('mode').options[1].textContent='Presencial · 30 € IVA incluido';const other=get('topic').value==='other-help';get('other-wrap').hidden=!other;get('other').disabled=!other;get('other').required=other;get('price').textContent=isRepro?duration()+' · Precio a confirmar':amount()+' IVA incluido'+(phone()?' · 30 minutos':'');get('description').textContent=isRepro?'TLR SPORT o REVO · 08:00–13:00 y 14:00–17:00. La cita debe completarse dentro del tramo elegido.':phone()?'Consulta telefónica para resolver dudas y valorar posibles diagnósticos.':'Consulta presencial en nuestras instalaciones. Acordaremos contigo el día y la hora.';}
  function calendar(){
    const current=now();get('date').min=current.slice(0,10);get('prev').disabled=get('date').value<=get('date').min;
    get('professional').textContent=isRepro?get('brand').value+' · '+(get('dyno').value==='yes'?'Con banco de potencia':'Sin banco de potencia')+' · '+duration()+' · 08:00–13:00 / 14:00–17:00':reason()+' · '+person()+' · '+(joaquin()?'08:00–16:00':'08:00–15:30');
    const grid=get('calendar');grid.replaceChildren();const day=new Date(get('date').value+'T12:00:00');
    for(let count=0;count<5;){
      if([0,6].includes(day.getDay())){day.setDate(day.getDate()+1);continue;}
      const date=iso(day),column=document.createElement('div'),heading=document.createElement('h3');column.className='calendar-day';heading.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',month:'short'}).format(day);column.append(heading);
      const slots=isRepro?window.FLBookingSchedule.reproSlots(get('dyno').value==='yes'):Array.from({length:joaquin()?16:15},(_,i)=>({start:String(8+Math.floor(i/2)).padStart(2,'0')+':'+(i%2?'30':'00')}));
      for(const slot of slots){
        const time=slot.start,label=document.createElement('label'),radio=document.createElement('input');
        label.className='calendar-slot';radio.type='radio';radio.name='slot';radio.value=date+' '+time;radio.disabled=date+' '+time<=current;radio.checked=!!selected&&selected.date===date&&selected.time===time;radio.setAttribute('aria-label',format(date)+' a las '+time);
        radio.onchange=()=>{selected={date,time,end:slot.end};get('selection').textContent=format(date)+' · '+time+(isRepro?'–'+slot.end:'')+' · '+duration();get('error').textContent='';};label.append(radio,document.createTextNode(time+(isRepro?'–'+slot.end:'')));column.append(label);
      }
      grid.append(column);day.setDate(day.getDate()+1);count++;
    }
    get('selection').textContent=selected?format(selected.date)+' · '+selected.time:'Selecciona '+(isRepro?'una cita de '+duration():'una franja de media hora')+'. Horarios de demostración.';
  }
  get('date').value=now().slice(0,10);get('date').onchange=()=>{if(!get('date').value||get('date').value<now().slice(0,10))get('date').value=now().slice(0,10);calendar();};
  function move(direction){const day=new Date(get('date').value+'T12:00:00');day.setDate(day.getDate()+direction*7);get('date').value=iso(day)<now().slice(0,10)?now().slice(0,10):iso(day);calendar();}
  get('prev').onclick=()=>move(-1);get('next').onclick=()=>move(1);get('mode').onchange=update;get('topic').onchange=update;get('brand').onchange=update;get('dyno').onchange=update;
  get('back').onclick=()=>show(step===2&&!scheduled()?0:step-1);get('edit').onclick=()=>show(0);
  get('remove').onclick=()=>{get('form').reset();if(isRepro){get('mode').value='visit';get('topic').value='tuning';}selected=null;get('date').value=now().slice(0,10);get('summary').textContent='';update();show(0);};
  get('form').onsubmit=e=>{e.preventDefault();if(step===0){if(!get('topic').reportValidity()||!get('other').reportValidity()||(isRepro&&!get('brand').reportValidity()))return;show(scheduled()?1:2);}else if(step===1){if(!selected){get('error').textContent='Selecciona un día y una hora.';return;}if(selected.date+' '+selected.time<=now()){selected=null;calendar();get('error').textContent='Esa hora ya ha pasado. Selecciona otra franja.';return;}show(2);}else if(step===2){for(const input of sections[2].querySelectorAll('input,textarea'))if(!input.reportValidity())return;show(3);}};
  update();show(0);
})();
