const {configured,paymentsReady,verifyWebhook,paymentEvent}=require('../lib/quote-service');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'});
  if(!configured()||!paymentsReady())return res.status(503).json({error:'Webhook pendiente de configurar.'});
  try{
    let raw;
    // Vercel restores the raw stream but exposes parsed JSON through a lazy body getter.
    const body=Object.getOwnPropertyDescriptor(req,'body')?.value;
    if(Buffer.isBuffer(body))raw=body;
    else if(typeof body==='string')raw=Buffer.from(body);
    else raw=await new Promise((resolve,reject)=>{const chunks=[];let size=0,overflow=false;req.on('data',chunk=>{if(overflow)return;const bytes=Buffer.from(chunk);size+=bytes.length;if(size>1048576){overflow=true;reject(Object.assign(Error('Payload too large'),{status:413}));return;}chunks.push(bytes);});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});
    if(raw.length>1048576)return res.status(413).json({error:'Contenido demasiado grande.'});
    if(!verifyWebhook(raw,req.headers['stripe-signature']))return res.status(400).json({error:'Firma no válida.'});
    let event;try{event=JSON.parse(raw.toString());}catch{return res.status(400).json({error:'Evento no válido.'});}
    await paymentEvent(event);await require('../lib/vip-service').paymentEvent(event);return res.status(200).json({received:true});
  }catch(error){return res.status(error.status===413?413:error.status===409?400:500).json({error:'No se pudo procesar el evento.'});}
};
module.exports.config={api:{bodyParser:false}};
