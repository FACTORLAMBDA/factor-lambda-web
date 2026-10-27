(() => {
  const headerStyle=document.createElement('style');
  headerStyle.textContent=`
    header .booking-header-button{display:inline-flex;align-items:center;justify-content:center;align-self:center;justify-self:center;width:156px;min-width:156px;height:48px;min-height:48px;padding:2px 20px 0;border-radius:5px;font-family:'Teko','Arial Narrow',Arial,sans-serif;font-size:24px;line-height:1;font-weight:700;text-align:center;white-space:nowrap;letter-spacing:0;box-sizing:border-box}
    @media(max-width:1050px){header .booking-header-button{align-self:center;margin:4px auto;width:160px;min-width:160px}}
  `;
  document.head.append(headerStyle);
  document.querySelectorAll('header .whatsapp-button, header .cta').forEach(a => {
    a.classList.add('booking-header-button');
    a.textContent='PEDIR CITA';a.href='/citas.html';a.removeAttribute('target');a.setAttribute('aria-label','Pedir cita');
  });
  document.querySelectorAll('.topbar .phone').forEach(e=>e.remove());
  const root=document.getElementById('appointment-page');if(!root)return;
  root.innerHTML=`
    <p class="demo-note">Vista previa · No se realizan reservas ni cobros.</p>
    <ol class="booking-progress" aria-label="Progreso"><li>1. Servicio</li><li>2. Hora</li><li>3. Detalles</li><li>4. Finalizar</li></ol>
    <form id="booking-form" novalidate>
      <section data-step="0"><h2>Elige tu consulta</h2>
        <div class="service-fields"><div><label for="booking-mode">Tipo de cita</label><select id="booking-mode"><option value="phone">Telefónica · 60,50 €</option><option value="visit">Presencial · 84,70 €</option></select></div>
        <div><label for="booking-topic">¿Cuál es el motivo?</label><select id="booking-topic" required><option value="">Selecciona el motivo</option><option value="mechanics">Mecánica · Germán</option><option value="tuning">Reprogramaciones · Joaquín</option></select></div></div>
        <p id="booking-price" class="booking-price"></p><p id="booking-description"></p><p>Lunes a viernes · Horario de España peninsular</p>
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
        <aside class="cart-totals"><h3>TOTALES DEL CARRITO</h3><div class="cart-heading"><strong>Total</strong><strong id="booking-total"></strong></div><p>IVA incluido</p>
          <div class="booking-conditions"><h3>Confirmación y condiciones de la cita</h3>
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
  const now=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const format=value=>new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value+'T12:00:00'));
  let step=0,selected=null;
  const phone=()=>get('mode').value==='phone',person=()=>get('topic').value==='mechanics'?'Germán · Mecánica':'Joaquín · Reprogramaciones',amount=()=>phone()?'60,50 €':'84,70 €';
  function show(value){
    step=value;sections.forEach((e,i)=>e.hidden=i!==step);progress.forEach((e,i)=>{e.classList.toggle('complete',i<=step);if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
    get('back').hidden=step===0;get('forward').hidden=step===3;get('error').textContent='';
    const appointment=()=>phone()?format(selected.date)+' a las '+selected.time+' · 30 minutos':'Presencial · Fecha y hora por acordar con el taller';
    if(step===1)calendar();
    if(step===2)get('chosen').textContent='Tu consulta: '+person()+' · '+appointment()+' · '+amount()+' IVA incluido';
    if(step===3){get('product').textContent=(phone()?'Consulta telefónica':'Consulta presencial')+' · '+person();get('summary').textContent=[appointment(),'Vehículo: '+get('vehicle').value,'Matrícula: '+get('plate').value,'Cliente: '+get('name').value,'Email: '+get('email').value,'Consulta: '+get('details').value].join('\n');get('total').textContent=amount();get('item-price').textContent=amount();}
    root.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function update(){selected=null;get('consent').checked=false;get('price').textContent=amount()+' IVA incluido'+(phone()?' · 30 minutos':'');get('description').textContent=phone()?'Consulta telefónica para resolver dudas y valorar posibles diagnósticos.':'Consulta presencial en nuestras instalaciones. Acordaremos contigo el día y la hora.';}
  function calendar(){
    const current=now();get('date').min=current.slice(0,10);get('prev').disabled=get('date').value<=get('date').min;
    get('professional').textContent=person()+' · '+(get('topic').value==='mechanics'?'08:00–15:30':'08:00–16:00');
    const grid=get('calendar');grid.replaceChildren();const day=new Date(get('date').value+'T12:00:00');
    for(let count=0;count<5;){
      if([0,6].includes(day.getDay())){day.setDate(day.getDate()+1);continue;}
      const date=iso(day),column=document.createElement('div'),heading=document.createElement('h3');column.className='calendar-day';heading.textContent=new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',month:'short'}).format(day);column.append(heading);
      const end=get('topic').value==='mechanics'?930:960;
      for(let m=480;m+30<=end;m+=30){
        const time=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'),label=document.createElement('label'),radio=document.createElement('input');
        label.className='calendar-slot';radio.type='radio';radio.name='slot';radio.value=date+' '+time;radio.disabled=date+' '+time<=current;radio.checked=!!selected&&selected.date===date&&selected.time===time;radio.setAttribute('aria-label',format(date)+' a las '+time);
        radio.onchange=()=>{selected={date,time};get('selection').textContent=format(date)+' · '+time+' · 30 minutos';get('error').textContent='';};label.append(radio,document.createTextNode(time));column.append(label);
      }
      grid.append(column);day.setDate(day.getDate()+1);count++;
    }
    get('selection').textContent=selected?format(selected.date)+' · '+selected.time:'Selecciona una franja de media hora. Horarios de demostración.';
  }
  get('date').value=now().slice(0,10);get('date').onchange=()=>{if(!get('date').value||get('date').value<now().slice(0,10))get('date').value=now().slice(0,10);calendar();};
  function move(direction){const day=new Date(get('date').value+'T12:00:00');day.setDate(day.getDate()+direction*7);get('date').value=iso(day)<now().slice(0,10)?now().slice(0,10):iso(day);calendar();}
  get('prev').onclick=()=>move(-1);get('next').onclick=()=>move(1);get('mode').onchange=update;get('topic').onchange=update;
  get('back').onclick=()=>show(step===2&&!phone()?0:step-1);get('edit').onclick=()=>show(0);
  get('remove').onclick=()=>{get('form').reset();selected=null;get('date').value=now().slice(0,10);get('summary').textContent='';update();show(0);};
  get('form').onsubmit=e=>{e.preventDefault();if(step===0){if(!get('topic').reportValidity())return;show(phone()?1:2);}else if(step===1){if(!selected){get('error').textContent='Selecciona un día y una hora.';return;}if(selected.date+' '+selected.time<=now()){selected=null;calendar();get('error').textContent='Esa hora ya ha pasado. Selecciona otra franja.';return;}show(2);}else if(step===2){for(const input of sections[2].querySelectorAll('input,textarea'))if(!input.reportValidity())return;show(3);}};
  update();show(0);
})();
