const API_VERSION = '2026-10-28.endive';
function configuration() {
  const missing = ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'].filter(key=>!process.env[key]);
  const testOnly = (process.env.STRIPE_MODE || 'test') === 'test' && /^sk_test_/.test(process.env.STRIPE_SECRET_KEY || '') && /^pk_test_/.test(process.env.STRIPE_PUBLISHABLE_KEY || '');
  return {mode:'test',enabled:process.env.STRIPE_CHECKOUT_ENABLED==='true'&&testOnly&&!missing.length,missing,testOnly};
}
function requireTestMode() {
  if (!configuration().enabled) {const error=new Error('Pago de prueba pendiente de configuración. Las claves de producción están bloqueadas.');error.status=503;throw error;}
}
async function request(path, options={}) {
  requireTestMode();
  const response=await fetch('https://api.stripe.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Stripe-Version':API_VERSION,...options.headers},signal:AbortSignal.timeout(20000)});
  if(!response.ok){const error=new Error('No se pudo consultar Stripe. Comprueba las claves de prueba y vuelve a intentarlo.');error.status=502;throw error;}
  const result=await response.json();
  if(result.livemode!==false){const error=new Error('Se ha bloqueado una respuesta que no pertenece al modo de pruebas.');error.status=409;throw error;}
  return result;
}
module.exports={configuration,requireTestMode,request,API_VERSION};
