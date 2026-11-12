(() => {
  const header=document.querySelector('body > header');if(!header||header.classList.contains('fl-site-header'))return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='/mobile-nav.css';document.head.append(style);
  header.classList.add('fl-site-header');
  let nav=header.querySelector('nav');
  if(!nav){
    nav=document.createElement('nav');nav.classList.add('fl-mobile-generated-nav');nav.setAttribute('aria-label','Navegación principal');
    for(const [label,href]of [['Inicio','/'],['Coches','/#galeria'],['Equipo','/equipo.html'],['Servicios','/#equipo'],['Proyectos','/proyectos.html'],['Reprogramaciones','/reprogramaciones.html']]){const link=document.createElement('a');link.textContent=label;link.href=href;nav.append(link);}
    for(const link of header.querySelectorAll(':scope > a:not(:first-child)'))link.classList.add('fl-mobile-legacy-link');
    header.append(nav);
  }
  nav.classList.add('fl-mobile-nav');nav.id='fl-mobile-navigation';
  let booking=header.querySelector('.booking-header-button');
  if(!booking){booking=document.createElement('a');booking.href='/citas.html';booking.textContent='PEDIR CITA';booking.className='booking-header-button fl-mobile-only';header.append(booking);}
  const toggle=document.createElement('button');toggle.type='button';toggle.className='fl-mobile-menu-toggle';toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú');toggle.title='Abrir menú';
  const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent='☰';toggle.append(symbol);header.append(toggle);
  const mobile=matchMedia('(max-width: 980px)');
  function setOpen(open,restore=false){header.classList.toggle('fl-menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');toggle.title=open?'Cerrar menú':'Abrir menú';symbol.textContent=open?'×':'☰';if(open)nav.querySelector('a')?.focus();else if(restore)toggle.focus();}
  toggle.onclick=()=>setOpen(toggle.getAttribute('aria-expanded')!=='true');
  nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
  document.addEventListener('pointerdown',event=>{if(!header.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('fl-menu-open')){event.preventDefault();setOpen(false,true);}});
  header.addEventListener('focusout',event=>{if(event.relatedTarget&&!header.contains(event.relatedTarget))setOpen(false);});
  mobile.addEventListener('change',()=>setOpen(false));
})();
