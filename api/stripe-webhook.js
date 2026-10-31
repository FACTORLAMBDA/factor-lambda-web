const {configured,paymentsReady,verifyWebhook,paymentEvent}=require('../lib/quote-service');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'});
  if(!configured()||!paymentsReady())return res.status(503).json({error:'Webhook de prueba pendiente de configurar.'});
  try{
    let raw;
    if(Buffer.isBuffer(req.body))raw=req.body;
    else if(typeof req.body==='string')raw=Buffer.from(req.body);
    else if(req.body)return res.status(400).json({error:'El webhook necesita el cuerpo original sin analizar.'});
    else{const chunks=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>1048576)return res.status(413).json({error:'Contenido demasiado grande.'});chunks.push(bytes);}raw=Buffer.concat(chunks);}
    if(raw.length>1048576)return res.status(413).json({error:'Contenido demasiado grande.'});
    if(!verifyWebhook(raw,req.headers['stripe-signature']))return res.status(400).json({error:'Firma no válida.'});
    let event;try{event=JSON.parse(raw.toString());}catch{return res.status(400).json({error:'Evento no válido.'});}
    await paymentEvent(event);return res.status(200).json({received:true});
  }catch(error){return res.status(error.status===409?400:500).json({error:'No se pudo procesar el evento de prueba.'});}
};
module.exports.config={api:{bodyParser:false}};
