(() => {
  const style = document.createElement('style');
  style.textContent = `
    .appointment-dialog{width:min(620px,calc(100% - 28px));max-height:90dvh;padding:28px;border:1px solid #444;border-radius:8px;background:#141414;color:#fff;font-family:Arial,sans-serif;box-sizing:border-box;overflow:auto}
    .appointment-dialog::backdrop{background:#000b}.appointment-dialog *{box-sizing:border-box}.appointment-dialog h2{font:700 28px Arial,sans-serif;margin:0 40px 20px 0}.appointment-dialog p{color:#ccc;line-height:1.5}.appointment-close{position:absolute;right:16px;top:12px;background:none;border:0;color:white;font-size:30px;cursor:pointer}.appointment-dialog label{display:block;margin:16px 0 6px;font-weight:bold}.appointment-dialog select,.appointment-dialog input,.appointment-dialog textarea{width:100%;background:#222;color:#fff;border:1px solid #666;border-radius:4px;padding:12px;font:16px Arial,sans-serif}.appointment-dialog textarea{min-height:80px}.appointment-dialog button[type=submit]{width:100%;margin-top:22px;padding:14px;background:#ff8015;color:#111;border:0;font-weight:bold;font-size:16px;cursor:pointer}.appointment-price{padding:14px 0;border-bottom:1px solid #444;color:#ffad46!important;font-weight:bold}.appointment-dialog [hidden]{display:none}.appointment-note{font-size:13px}.appointment-dialog .appointment-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:480px){.appointment-dialog .appointment-row{grid-template-columns:1fr;gap:0}.appointment-dialog{padding:22px}}
  `;
  style.textContent += `
    .appointment-calendar{margin-top:18px;border:1px solid #454545;border-radius:8px;overflow:hidden;background:#1c1c1e;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .appointment-calendar-head{display:grid;grid-template-columns:40px 1fr 40px;align-items:center;gap:8px;padding:16px 10px;border-bottom:1px solid #444;text-align:center}
    .appointment-calendar-head button{height:38px;border:0;background:transparent;color:#ff8015;font-size:26px;cursor:pointer}.appointment-calendar-head button:disabled{opacity:.3;cursor:default}
    .appointment-calendar-head strong{display:block;font-size:18px;text-transform:capitalize}.appointment-calendar-head input{margin-top:8px;padding:6px;font-size:14px;color-scheme:dark}
    .appointment-agenda{max-height:330px;overflow:auto;overscroll-behavior:contain;padding:12px 12px 12px 0}
    .appointment-dialog .appointment-slot{display:grid;grid-template-columns:62px minmax(0,1fr);align-items:stretch;margin:0;font-weight:normal;min-height:54px;cursor:pointer}
    .appointment-slot time{font-size:12px;color:#aaa;text-align:right;padding:10px 10px 0 0;font-variant-numeric:tabular-nums}
    .appointment-slot span{display:flex;align-items:center;gap:8px;border-top:1px solid #3a3a3c;padding:10px 12px;font-size:14px;color:#ddd}
    .appointment-dialog .appointment-slot input{width:16px;height:16px;margin:0;accent-color:#ff8015;flex-shrink:0}
    .appointment-slot:has(input:checked) span{background:#64320d;color:#fff;border-left:3px solid #ff8015}.appointment-slot:has(input:focus-visible) span{outline:2px solid white;outline-offset:-2px}.appointment-slot:hover span{background:#35302b}
    .appointment-calendar-selection{margin:0!important;padding:12px;border-top:1px solid #444;font-size:14px;color:#ffad46!important}
  `;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.className = 'appointment-dialog';
  dialog.setAttribute('aria-labelledby', 'appointment-title');
  dialog.innerHTML = `
    <button type="button" class="appointment-close" aria-label="Cerrar">&times;</button>
    <h2 id="appointment-title">PEDIR CITA</h2>
    <p class="appointment-note">Vista previa · No se realizan reservas ni cobros.</p>
    <form>
      <label for="appointment-mode">Tipo de cita</label>
      <select id="appointment-mode" required><option value="phone">Telefónica</option><option value="visit">Presencial</option></select>
      <p class="appointment-price" id="appointment-price"></p>
      <p id="appointment-description"></p>
      <label for="appointment-topic">¿Cuál es el motivo de la consulta?</label>
      <select id="appointment-topic" required><option value="">Selecciona el motivo</option><option value="mechanics">Mecánica / posibles diagnósticos</option><option value="tuning">Reprogramaciones</option></select>
      <label for="appointment-details">Cuéntanos tu consulta y el vehículo</label>
      <textarea id="appointment-details" required maxlength="1500" placeholder="Modelo, motor y dudas que quieres resolver"></textarea>
      <div id="appointment-schedule" hidden>
        <p id="appointment-professional" aria-live="polite"></p>
        <div class="appointment-calendar">
          <div class="appointment-calendar-head">
            <button type="button" id="appointment-prev" aria-label="Día laborable anterior">&#8249;</button>
            <div><strong id="appointment-day"></strong><input id="appointment-date" type="date" aria-label="Elegir fecha"></div>
            <button type="button" id="appointment-next" aria-label="Día laborable siguiente">&#8250;</button>
          </div>
          <div id="appointment-agenda" class="appointment-agenda" role="group" aria-label="Franjas de media hora"></div>
          <p id="appointment-selection" class="appointment-calendar-selection" aria-live="polite">Selecciona una franja</p>
        </div>
        <input id="appointment-time" type="hidden">
        <p class="appointment-note">Horario de España peninsular. Solicitud sujeta a disponibilidad y confirmación del taller.</p>
      </div>
      <p id="appointment-visit" hidden>Solicita tu cita presencial y acordaremos contigo el día y la hora.</p>
      <label for="appointment-name">Nombre</label><input id="appointment-name" autocomplete="name" required maxlength="100">
      <label for="appointment-phone">Tu teléfono de contacto</label><input id="appointment-phone" type="tel" autocomplete="tel" required maxlength="30">
      <label for="appointment-email">Email de confirmación</label><input id="appointment-email" type="email" autocomplete="email" required maxlength="254">
      <button type="submit">CONTINUAR AL RESUMEN</button>
    </form>
    <section id="appointment-review" hidden aria-live="polite">
      <h3>Resumen de tu cita</h3>
      <p id="appointment-summary" style="white-space:pre-line"></p>
      <p class="appointment-price" id="appointment-total"></p>
      <p>Tarjeta Visa / Mastercard · Apple Pay · Google Pay</p>
      <button type="button" disabled style="width:100%;padding:14px;border:1px solid #666;background:#333;color:#bbb;border-radius:4px">PAGO PRÓXIMAMENTE</button>
      <p class="appointment-note">Pago pendiente de activación. Las citas se confirmarán tras verificar el pago y la disponibilidad. No se han guardado ni enviado tus datos.</p>
      <button type="button" id="appointment-back" style="padding:12px;background:transparent;border:1px solid #777;color:white;cursor:pointer">Volver a los datos</button>
    </section>`;
  document.body.append(dialog);
  const get = id => dialog.querySelector('#appointment-' + id);
  const mode = get('mode'), topic = get('topic'), date = get('date'), time = get('time');
  const madridNow = () => new Intl.DateTimeFormat('sv-SE', { timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date());
  function slots() {
    const now = madridNow();
    date.min = now.slice(0,10);
    time.value = '';
    get('agenda').replaceChildren();
    get('selection').textContent = 'Selecciona una franja';
    get('prev').disabled = date.value <= date.min;
    get('day').textContent = date.value ? new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date(date.value + 'T12:00:00')) : 'Elige una fecha';
    const weekday = date.value ? new Date(date.value + 'T12:00:00').getDay() : null;
    date.setCustomValidity(weekday === 0 || weekday === 6 ? 'Atendemos de lunes a viernes. Selecciona otro día.' : '');
    if(weekday === 0 || weekday === 6 || !date.value || date.value < date.min) {
      get('selection').textContent = 'Selecciona una fecha laborable a partir de hoy';
      return;
    }
    const end = topic.value === 'mechanics' ? 930 : 960;
    for(let minutes=480; minutes+30<=end; minutes+=30) {
      const start = String(Math.floor(minutes/60)).padStart(2,'0') + ':' + String(minutes%60).padStart(2,'0');
      const finish = String(Math.floor((minutes+30)/60)).padStart(2,'0') + ':' + String((minutes+30)%60).padStart(2,'0');
      if(date.value === now.slice(0,10) && start <= now.slice(11,16)) continue;
      const row = document.createElement('label');
      row.className = 'appointment-slot';
      const hour = document.createElement('time');
      hour.textContent = start;
      const space = document.createElement('span');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'appointment-slot'; radio.value = start;
      radio.required = mode.value === 'phone'; radio.disabled = mode.value !== 'phone';
      radio.setAttribute('aria-label', start + ' a ' + finish);
      radio.addEventListener('change', () => {
        time.value = start;
        get('selection').textContent = start + ' – ' + finish + ' · 30 minutos';
      });
      space.append(radio, document.createTextNode(start + ' – ' + finish));
      row.append(hour, space); get('agenda').append(row);
    }
    if(!get('agenda').children.length) get('selection').textContent = 'No quedan franjas para este día. Elige otro día.';
  }
  function update() {
    const phone = mode.value === 'phone';
    get('price').textContent = phone ? '60,50 € IVA incluido · 30 minutos' : '84,70 € IVA incluido';
    get('description').textContent = phone ? 'Media hora de consulta telefónica para resolver dudas y valorar posibles diagnósticos.' : 'Consulta presencial en nuestras instalaciones.';
    get('schedule').hidden = !phone || !topic.value;
    get('visit').hidden = phone;
    date.required = time.required = phone && !!topic.value;
    date.disabled = time.disabled = !phone || !topic.value;
    get('professional').textContent = topic.value === 'mechanics' ? 'Germán · Mecánica · Lunes a viernes · 08:00–15:30' : 'Joaquín · Reprogramaciones · Lunes a viernes · 08:00–16:00';
    slots();
  }
  mode.addEventListener('change',update); topic.addEventListener('change',update); date.addEventListener('change',slots);
  function moveDay(direction) {
    const next = new Date((date.value || madridNow().slice(0,10)) + 'T12:00:00');
    do { next.setDate(next.getDate()+direction); } while(next.getDay() === 0 || next.getDay() === 6);
    const value = next.getFullYear() + '-' + String(next.getMonth()+1).padStart(2,'0') + '-' + String(next.getDate()).padStart(2,'0');
    if(value < madridNow().slice(0,10)) return;
    date.value = value; slots();
  }
  get('prev').onclick = () => moveDay(-1);
  get('next').onclick = () => moveDay(1);
  date.value = madridNow().slice(0,10);
  if([0,6].includes(new Date(date.value+'T12:00:00').getDay())) moveDay(1);
  dialog.querySelector('.appointment-close').onclick = () => dialog.close();
  document.querySelectorAll('header .whatsapp-button, header .cta').forEach(link => {
    link.textContent = 'PEDIR CITA'; link.href = '#pedir-cita'; link.removeAttribute('target'); link.setAttribute('aria-label','Pedir cita');
    link.addEventListener('click',e => {e.preventDefault(); update(); dialog.showModal();});
  });
  document.querySelectorAll('.topbar .phone').forEach(item => item.remove());
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if(mode.value === 'phone' && !time.value) { get('selection').textContent = 'Selecciona una franja para continuar'; get('agenda').scrollIntoView({block:'center'}); return; }
    if(mode.value === 'phone' && (date.value < madridNow().slice(0,10) || (date.value === madridNow().slice(0,10) && time.value <= madridNow().slice(11,16)))) { slots(); date.reportValidity(); return; }
    const professional = topic.value === 'mechanics' ? 'Germán (mecánica)' : 'Joaquín (reprogramaciones)';
    get('summary').textContent = [mode.value === 'phone' ? 'Consulta telefónica · 30 minutos' : 'Consulta presencial',professional,mode.value === 'phone' ? 'Fecha: ' + date.value + ' a las ' + time.value + ' (España peninsular)' : 'Fecha y hora por acordar con el taller','Motivo: ' + get('details').value,'Nombre: ' + get('name').value,'Teléfono: ' + get('phone').value,'Email: ' + get('email').value].join('\n');
    get('total').textContent = 'Total: ' + (mode.value === 'phone' ? '60,50 €' : '84,70 €') + ' · IVA incluido';
    dialog.querySelector('form').hidden = true;
    get('review').hidden = false;
    dialog.scrollTop = 0;
    get('back').focus();
  });
  get('back').onclick = () => {
    get('review').hidden = true;
    dialog.querySelector('form').hidden = false;
    mode.focus();
  };
  update();
})();
