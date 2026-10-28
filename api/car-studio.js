const { createHmac, timingSafeEqual } = require('node:crypto');
const BASE = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d';
const LIMIT = 3 * 1024 * 1024;
function signature(value) { return createHmac('sha256', process.env.STUDIO_SIGNING_SECRET).update(value).digest('base64url'); }
function receipt(id) { const value=Buffer.from(JSON.stringify({id,expires:Date.now()+6*60*60*1000})).toString('base64url');return value+'.'+signature(value); }
function verify(value) {
  try {const [body,sig]=value.split('.'),expected=signature(body);if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(body,'base64url'));return data.expires>Date.now()&&typeof data.id==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(data.id)?data.id:null;} catch{return null;}
}
async function readBody(req) {
  if(req.body){const size=Buffer.byteLength(JSON.stringify(req.body));if(size>LIMIT)throw new Error('SIZE');return typeof req.body==='string'?JSON.parse(req.body):req.body;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw new Error('SIZE');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());
}
module.exports = async function carStudio(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost');
  const ready=process.env.ENABLE_3D_GENERATION==='true'&&!!process.env.MESHY_API_KEY&&!!process.env.STUDIO_SIGNING_SECRET&&!!process.env.TURNSTILE_SECRET_KEY&&!!process.env.TURNSTILE_SITE_KEY;
  if(req.method==='GET'&&!url.searchParams.has('receipt'))return res.status(200).json({enabled:ready,siteKey:ready?process.env.TURNSTILE_SITE_KEY:null});
  if(!ready)return res.status(503).json({error:'La generación desde fotos está pendiente de activación. Puedes importar un modelo GLB.'});
  try {
    if(req.method==='GET') {
      const id=verify(url.searchParams.get('receipt')||'');if(!id)return res.status(403).json({error:'La sesión de generación ha caducado o no es válida.'});
      const result=await fetch(BASE+'/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+process.env.MESHY_API_KEY},signal:AbortSignal.timeout(20000)});
      if(!result.ok)return res.status(502).json({error:'No se pudo consultar la generación. Inténtalo de nuevo.'});
      const task=await result.json();let model=null;
      if(task.model_urls?.glb){const asset=new URL(task.model_urls.glb);if(asset.protocol==='https:'&&(asset.hostname==='assets.meshy.ai'||asset.hostname.endsWith('.meshy.ai')))model=asset.href;}
      return res.status(200).json({status:task.status,progress:task.progress||0,modelUrl:model,error:task.status==='FAILED'?'No se ha podido reconstruir el objeto. Prueba con fotos más claras.':null});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método no permitido.'});}
    if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Formato no admitido.'});
    const data=await readBody(req);
    if(!Array.isArray(data.images)||data.images.length<1||data.images.length>4||data.images.some(x=>typeof x!=='string'||!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(x)))return res.status(400).json({error:'Adjunta entre una y cuatro fotos JPG, PNG o WebP.'});
    if(typeof data.token!=='string'||!data.token||data.token.length>2048)return res.status(400).json({error:'Completa la verificación antes de generar.'});
    const challenge=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:process.env.TURNSTILE_SECRET_KEY,response:data.token}),signal:AbortSignal.timeout(15000)});
    const validation=await challenge.json();
    if(!validation.success)return res.status(403).json({error:'Verificación caducada. Vuelve a verificarte.'});
    const result=await fetch(BASE,{method:'POST',headers:{Authorization:'Bearer '+process.env.MESHY_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({image_urls:data.images,ai_model:'meshy-7.1',should_texture:true,enable_pbr:true,target_formats:['glb']}),signal:AbortSignal.timeout(25000)});
    if(!result.ok)return res.status(502).json({error:result.status===402?'El servicio de generación no tiene créditos disponibles.':'El servicio no pudo iniciar la generación. Inténtalo más tarde.'});
    const task=await result.json();if(typeof task.result!=='string')throw new Error('PROVIDER');return res.status(202).json({receipt:receipt(task.result)});
  } catch(error) {return res.status(error.message==='SIZE'?413:502).json({error:error.message==='SIZE'?'Las fotos son demasiado grandes. Reduce su tamaño.':'No se pudo completar la petición al servicio 3D.'});}
};
