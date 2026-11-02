const API_VERSION = '2026-10-28.endive';
const setting = name => (process.env[name] || '').trim();
function configuration() {
  const missing = ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'].filter(key=>!process.env[key]);
  const mode=setting('STRIPE_MODE')||'test';
  const keysMatch=['test','live'].includes(mode)&&new RegExp('^(sk|rk)_'+mode+'_').test(process.env.STRIPE_SECRET_KEY||'')&&new RegExp('^pk_'+mode+'_').test(process.env.STRIPE_PUBLISHABLE_KEY||'');
  const approved=mode==='test'||setting('STRIPE_LIVE_APPROVED')==='true';
  const checks={checkoutRequested:setting('STRIPE_CHECKOUT_ENABLED')==='true',validMode:['test','live'].includes(mode),liveApproved:approved,secretKeyMatches:new RegExp('^(sk|rk)_'+mode+'_').test(process.env.STRIPE_SECRET_KEY||''),publishableKeyMatches:new RegExp('^pk_'+mode+'_').test(process.env.STRIPE_PUBLISHABLE_KEY||''),webhookConfigured:!!setting('STRIPE_WEBHOOK_SECRET')};
  return {mode,enabled:checks.checkoutRequested&&keysMatch&&approved&&!missing.length&&checks.webhookConfigured,missing,testOnly:mode==='test'&&keysMatch,checks};
}
function requireEnabled() {
  if (!configuration().enabled) {const error=new Error('Pago pendiente de configuración y autorización del entorno.');error.status=503;throw error;}
}
async function request(path, options={}) {
  requireEnabled();
  const response=await fetch('https://api.stripe.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+process.env.STRIPE_SECRET_KEY,'Stripe-Version':API_VERSION,...options.headers},signal:AbortSignal.timeout(20000)});
  if(!response.ok){const error=new Error('No se pudo consultar Stripe. Comprueba las claves y permisos del entorno y vuelve a intentarlo.');error.status=502;throw error;}
  const result=await response.json();
  if(result.livemode!==(configuration().mode==='live')){const error=new Error('Stripe ha respondido desde un entorno diferente al configurado.');error.status=409;throw error;}
  return result;
}
module.exports={configuration,requireEnabled,request,API_VERSION};
