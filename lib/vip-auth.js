const {createClient}=require('@supabase/supabase-js');
const {createHash,randomBytes,timingSafeEqual}=require('node:crypto');

module.exports=function authService({db,rpc,site,sendMail,setCookies,fail}){
 const digest=v=>createHash('sha256').update(v).digest('hex');
 const generic='Si el correo puede recibir este mensaje, te enviaremos un enlace. Revisa tu bandeja de entrada y spam.';
 function emailOf(data){const email=String(data.email||'').trim().toLowerCase();if(email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))fail('Indica un correo válido.');return email;}
 function passwordOf(data){if(typeof data.password!=='string'||data.password.length<12||data.password.length>128)fail('La contraseña debe tener entre 12 y 128 caracteres.');return data.password;}
 async function guard(req,data){
  const email=emailOf(data);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY||'',response:String(data.turnstileToken||'').slice(0,2048)}),signal:AbortSignal.timeout(15000)});
  const check=await response.json();if(!check.success||check.hostname!==new URL(site()).hostname||check.action!=='vip-login')fail('Completa la verificación de seguridad.');
  for(const key of ['auth-email:'+digest(email),'auth-ip:'+digest(String(req.headers['x-forwarded-for']||'unknown').split(',')[0])])if(!await rpc('fl_vip_rate_limit',{p_key:key}))fail('Espera un minuto antes de volver a intentarlo.',429);
  return email;
 }
 async function passwordLogin(req,res,data){const email=await guard(req,data),password=data.password;if(typeof password!=='string'||!password||password.length>128)fail('Indica tu contraseña.');const {data:session,error}=await db().auth.signInWithPassword({email,password});if(error||!session?.session||!session.user?.email_confirmed_at)fail('Correo o contraseña incorrectos, o correo sin confirmar.',401);setCookies(res,session.session);return {authenticated:true};}
 async function emailLink(req,data,type){
  const email=await guard(req,data);let options={redirectTo:site()+'/mi-vip.html'},password;
  if(type==='signup'){password=passwordOf(data);if(data.accepted!==true||!String(data.name||'').trim())fail('Indica tu nombre y acepta la política de privacidad.');options.data={full_name:String(data.name).trim().slice(0,100)};}
  const {data:link,error}=await db().auth.admin.generateLink({type,email,options,...(password?{password}:{})});
  if(error){if(['user_not_found','email_exists','user_already_exists'].includes(error.code))return {message:generic};fail('No se pudo enviar el enlace. Inténtalo más tarde.',503);}
  if(!link?.properties?.hashed_token)fail('No se pudo generar el enlace.',503);
  const token=link.properties.hashed_token,url=site()+'/mi-vip.html#token_hash='+encodeURIComponent(token)+'&type='+type;
  await sendMail(email,type==='recovery'?'Restablece tu contraseña de FL VIP':'Confirma tu cuenta FL VIP',type==='recovery'?'Utiliza este enlace personal de un solo uso para elegir una contraseña nueva:\n'+url+'\n\nSi no lo has solicitado, ignora este mensaje. Tu contraseña no cambiará.':'Confirma tu correo para activar tu cuenta FL VIP:\n'+url+'\n\nNo compartas este enlace.', 'vip-'+type+'-'+digest(token));return {message:generic};
 }
 async function reset(res,data){const password=passwordOf(data),token=String(data.tokenHash||'');if(!token||token.length>1024)fail('Solicita un nuevo enlace de recuperación.');const client=db();const {data:verified,error}=await client.auth.verifyOtp({type:'recovery',token_hash:token});if(error||!verified?.session)fail('El enlace ha caducado o ya se ha utilizado. Solicita otro.',401);const updated=await client.auth.updateUser({password});if(updated.error)fail('No se pudo cambiar la contraseña. Solicita un enlace nuevo.',400);setCookies(res,null);await client.auth.signOut({scope:'global'});return {message:'Contraseña actualizada. Ya puedes iniciar sesión con tu correo y contraseña.'};}
 async function providers(){const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(15000)});if(!response.ok)fail('No se pudieron consultar los métodos de acceso.',503);const settings=await response.json();return {google:settings.external?.google===true,azure:settings.external?.azure===true};}
 function flowCookie(value){return 'fl_vip_oauth='+value+'; Path=/api/vip; HttpOnly; Secure; SameSite=Lax; Max-Age='+(value?600:0);}
 async function oauth(res,data){const provider=data.provider;if(provider!=='google')fail('Proveedor no válido.');if(data.accepted!==true)fail('Acepta la política de privacidad antes de continuar.');const available=await providers();if(!available[provider])fail('Este método de acceso todavía está pendiente de configuración. Utiliza tu correo.',503);
  const storage=new Map(),client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}}});
  const state=randomBytes(24).toString('hex');const {data:login,error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:site()+'/api/vip?action=oauth-callback&state='+state,skipBrowserRedirect:true,...(provider==='azure'?{scopes:'email'}:{})}});if(error||!login?.url)fail('No se pudo iniciar el acceso.',503);const verifier=[...storage.entries()].find(([k])=>k.endsWith('-code-verifier'))?.[1];if(!verifier)fail('No se pudo preparar el acceso seguro.',503);res.setHeader('Set-Cookie',flowCookie(Buffer.from(JSON.stringify({state,verifier})).toString('base64url')));return {url:login.url,oauth:true};
 }
 async function callback(req,res,query){const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('fl_vip_oauth='))?.slice(13);let saved;try{saved=JSON.parse(Buffer.from(raw||'','base64url').toString());}catch{}const state=query.get('state')||'';if(!saved?.state||state.length!==saved.state.length||!timingSafeEqual(Buffer.from(state),Buffer.from(saved.state))||!query.get('code'))fail('El acceso ha caducado. Vuelve a intentarlo.',401);
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:{getItem:k=>k.endsWith('-code-verifier')?saved.verifier:null,setItem(){},removeItem(){}}}});
  const {data:session,error}=await client.auth.exchangeCodeForSession(query.get('code'));if(error||!session?.session||!session.user?.email_confirmed_at)fail('No se pudo completar el acceso. Vuelve a intentarlo.',401);setCookies(res,session.session);res.setHeader('Set-Cookie',[...res.getHeader('Set-Cookie'),flowCookie('')]);
 }
 return {passwordLogin,signup:(req,data)=>emailLink(req,data,'signup'),forgot:(req,data)=>emailLink(req,data,'recovery'),reset,providers,oauth,callback};
};
