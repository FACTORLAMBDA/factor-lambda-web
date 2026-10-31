const service=require('../lib/quote-service');
async function body(req){if(req.body){const size=Buffer.byteLength(JSON.stringify(req.body));if(size>16384)throw Error('SIZE');return typeof req.body==='string'?JSON.parse(req.body):req.body;}let length=0;const parts=[];for await(const chunk of req){length+=chunk.length;if(length>16384)throw Error('SIZE');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString());}
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');const url=new URL(req.url,'http://localhost');try{
 if(req.method==='GET'&&url.searchParams.get('action')==='config')return res.status(200).json({enabled:!!service.configured(),checkout:service.paymentsReady(),siteKey:service.configured()?process.env.TURNSTILE_SITE_KEY:null});
 if(!service.configured())return res.status(503).json({error:'La solicitud automática está pendiente de activación. Puedes contactar con el taller por WhatsApp.'});
 if(req.method==='GET'&&url.searchParams.get('action')==='list')return res.status(200).json(await service.listQuotes(req));
 if(req.method==='GET'&&url.searchParams.get('action')==='payment-status')return res.status(200).json(await service.checkoutStatus(url.searchParams.get('id'),url.searchParams.get('token')));
 if(req.method==='GET')return res.status(200).json(service.quoteView(await service.publicQuote(url.searchParams.get('id'),url.searchParams.get('token'))));
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido.'});
 const data=await body(req);const action=url.searchParams.get('action');
 if(action==='approve')return res.status(200).json(await service.approve(req,data));
 if(action==='checkout')return res.status(200).json(await service.checkout(data.id,data.token,data.accepted));
 return res.status(201).json(await service.createLead(data));
 }catch(e){return res.status(e.status||400).json({error:e.message==='SIZE'?'La solicitud es demasiado grande.':e.status?e.message:'No se pudo completar la solicitud. Inténtalo más tarde.'});}};
