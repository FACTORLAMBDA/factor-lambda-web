(() => {
  const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),id=params.get('id'),token=params.get('token');
  let quote,checkout,stripeLoading,pollTimer,checks=0;
  const money=value=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(value/100);
  async function request(action,body){const response=await fetch('/api/repro-quotes?'+(body?'action='+action:new URLSearchParams({action,id,token})),{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo consultar el pago.');return data;}
  function destroy(){if(checkout){checkout.destroy();checkout=null;}$('embedded-payment').hidden=true;}
  function paid(){destroy();clearTimeout(pollTimer);quote.status='paid';$('quote-pay').hidden=true;$('quote-accept').disabled=true;$('payment-refresh').hidden=true;$('payment-confirmation').hidden=false;$('quote-status').textContent='Pago de prueba confirmado por el servidor. No se ha realizado ningún cobro real.';}
  async function load(){try{
    if(!id||!token)throw Error('Abre el enlace de presupuesto que te ha enviado Factor Lambda.');
    quote=await request('');$('quote-body').hidden=false;$('quote-vehicle').textContent=[quote.vehicle.make,quote.vehicle.model,quote.vehicle.engine,quote.vehicle.year].filter(Boolean).join(' · ');$('quote-config').textContent=quote.config.brand+' · '+(quote.config.dyno?'Con banco · 2 h 30 min':'Sin banco · 1 h 30 min');$('quote-reference').textContent='Referencia: '+quote.id;
    $('quote-base').textContent=money(quote.baseCents);$('quote-dyno').textContent=quote.config.dyno?money(5000):'Sin banco';$('quote-total').textContent=money(quote.totalCents);
    if(quote.status==='paid'){paid();return;}
    $('quote-status').textContent=quote.checkoutReady?'Presupuesto preparado. Puedes realizar un pago de prueba dentro de esta página.':'El formulario de pago de prueba está pendiente de configuración. Contacta con Factor Lambda.';
    if(quote.checkoutReady){const state=await request('payment-status');if(state.status==='processing'){destroy();$('quote-pay').hidden=true;checks=0;poll();}}
  }catch(error){$('quote-status').textContent=error.message;}}
  function stripeJs(){if(window.Stripe)return Promise.resolve();if(!stripeLoading)stripeLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.stripe.com/endive/stripe.js';script.onload=()=>window.Stripe?resolve():reject(Error('No se pudo cargar el formulario seguro.'));script.onerror=()=>{script.remove();stripeLoading=null;reject(Error('No se pudo conectar con Stripe. Comprueba tu conexión o los bloqueadores del navegador.'));};document.head.append(script);});return stripeLoading;}
  async function poll(){clearTimeout(pollTimer);$('payment-refresh').hidden=true;try{const state=await request('payment-status');if(state.status==='paid'){paid();return;}if(state.status==='open'||state.status==='expired'||state.status==='not_started'){$('quote-pay').hidden=false;$('quote-pay').disabled=!$('quote-accept').checked;checks=0;$('quote-status').textContent='El pago no se ha completado. Puedes volver a intentarlo.';return;}
    $('quote-status').textContent='Stripe ha completado el formulario. Esperando la verificación del pago por el servidor…';
    if(++checks<10)pollTimer=setTimeout(poll,3000);else{$('quote-status').textContent='La verificación sigue pendiente. No repitas el pago; actualiza el estado en unos momentos.';$('payment-refresh').hidden=false;}
  }catch(error){$('quote-status').textContent=error.message;$('payment-refresh').hidden=false;}}
  $('payment-refresh').onclick=()=>{checks=0;poll();};
  $('quote-accept').onchange=()=>{$('quote-pay').disabled=!$('quote-accept').checked||!quote?.checkoutReady||quote.status==='paid';};
  $('quote-pay').onclick=async()=>{if(checkout||!$('quote-accept').checked)return;$('quote-pay').disabled=true;$('quote-status').textContent='Abriendo el formulario seguro de prueba…';
    try{const result=await request('checkout',{id,token,accepted:true});if(result.mode!=='test'||!/^pk_test_/.test(result.publishableKey)||typeof result.clientSecret!=='string')throw Error('El pago ha sido bloqueado: configuración de pruebas no válida.');
      await stripeJs();const stripe=window.Stripe(result.publishableKey);checkout=await stripe.createEmbeddedCheckoutPage({fetchClientSecret:async()=>result.clientSecret,onComplete:()=>{destroy();$('quote-pay').hidden=true;checks=0;poll();}});
      $('embedded-payment').hidden=false;checkout.mount('#stripe-checkout');$('quote-pay').hidden=true;$('quote-accept').disabled=true;$('quote-status').textContent='Modo de pruebas: no introduzcas una tarjeta real.';$('embedded-payment').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){destroy();$('quote-status').textContent=error.message;$('quote-pay').hidden=false;$('quote-pay').disabled=!$('quote-accept').checked;}
  };
  window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);destroy();});load();
})();
