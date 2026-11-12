(() => {
  const header=document.querySelector('body > header');if(!header||header.classList.contains('fl-site-header'))return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='/mobile-nav.css?v=contact-centered-2';document.head.append(style);
  header.classList.add('fl-site-header');
  let nav=header.querySelector('nav');
  if(!nav){
    nav=document.createElement('nav');nav.classList.add('fl-mobile-generated-nav');nav.setAttribute('aria-label','Navegación principal');
    for(const [label,href]of [['Inicio','/'],['Coches','/#galeria'],['Equipo','/equipo.html'],['Servicios','/#equipo'],['Proyectos','/proyectos.html'],['Reprogramaciones','/reprogramaciones.html']]){const link=document.createElement('a');link.textContent=label;link.href=href;nav.append(link);}
    for(const link of header.querySelectorAll(':scope > a:not(:first-child)'))link.classList.add('fl-mobile-legacy-link');
    header.append(nav);
  }
  nav.classList.add('fl-mobile-nav');nav.id='fl-mobile-navigation';
  const links=document.createElement('div');links.className='fl-mobile-links';while(nav.firstChild)links.append(nav.firstChild);nav.append(links);
  const masthead=document.createElement('div');masthead.className='fl-mobile-masthead';
  const brand=header.querySelector('a:first-child').cloneNode(true);brand.classList.add('fl-mobile-brand');masthead.append(brand);
  const close=document.createElement('button');close.type='button';close.className='fl-mobile-close';close.setAttribute('aria-label','Cerrar menú');close.textContent='×';masthead.append(close);nav.prepend(masthead);
  const footer=document.createElement('div');footer.className='fl-mobile-contact';
  footer.innerHTML='<a class="fl-mobile-book" href="/citas.html">PEDIR CITA</a><a href="mailto:flgarage@factorlambda.com">flgarage@factorlambda.com</a><a href="tel:+34644313664">+34 644 31 36 64</a><a class="fl-mobile-instagram" href="https://www.instagram.com/factorlambda" target="_blank" rel="noopener" aria-label="Instagram de Factor Lambda">Instagram · @factorlambda</a>';
  nav.append(footer);
  let booking=header.querySelector('.booking-header-button');
  if(!booking){booking=document.createElement('a');booking.href='/citas.html';booking.textContent='PEDIR CITA';booking.className='booking-header-button fl-mobile-only';header.append(booking);}
  const toggle=document.createElement('button');toggle.type='button';toggle.className='fl-mobile-menu-toggle';toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú');toggle.title='Abrir menú';
  const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent='☰';toggle.append(symbol);header.append(toggle);
  const mobile=matchMedia('(max-width: 980px)');
  function setOpen(open,restore=false){header.classList.toggle('fl-menu-open',open);document.documentElement.classList.toggle('fl-menu-lock',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');toggle.title=open?'Cerrar menú':'Abrir menú';symbol.textContent=open?'×':'☰';if(open)close.focus();else if(restore)toggle.focus();}
  close.onclick=()=>setOpen(false,true);
  toggle.onclick=()=>setOpen(toggle.getAttribute('aria-expanded')!=='true');
  nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
  document.addEventListener('pointerdown',event=>{if(!header.contains(event.target))setOpen(false);});
  document.addEventListener('keydown',event=>{if(!header.classList.contains('fl-menu-open'))return;if(event.key==='Escape'){event.preventDefault();setOpen(false,true);}if(event.key==='Tab'){const items=[...nav.querySelectorAll('a,button')],first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  header.addEventListener('focusout',event=>{if(event.relatedTarget&&!header.contains(event.relatedTarget))setOpen(false);});
  mobile.addEventListener('change',()=>setOpen(false));
})();
