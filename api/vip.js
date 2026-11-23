const vip=require('../lib/vip-service');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');const action=new URL(req.url,'https://localhost').searchParams.get('action')||'me';try{
 if(req.method==='GET'&&action==='config')return res.status(200).json(vip.publicConfig());
 if(!vip.enabled())return res.status(503).json({error:'FL VIP está pendiente de activación. Todavía no se admiten altas ni cobros.'});
 if(req.method==='GET'&&action==='auth-options')return res.status(200).json(await vip.auth.providers());
 if(req.method==='GET'&&action==='oauth-callback'){try{await vip.auth.callback(req,res,new URL(req.url,'https://localhost').searchParams);res.setHeader('Location',vip.site()+'/mi-vip.html');}catch{res.setHeader('Location',vip.site()+'/mi-vip.html?auth=failed');}return res.status(303).end();}
 if(req.method==='GET'&&action==='admin-list')return res.status(200).json(await vip.adminList(req));
 if(req.method==='POST'){
 if(req.headers.origin!==vip.site()||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no permitido.'});
 let data=req.body;if(data===undefined){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>16384)return res.status(413).json({error:'Solicitud demasiado grande.'});parts.push(part);}data=JSON.parse(Buffer.concat(parts).toString('utf8'));}if(typeof data==='string')data=JSON.parse(data);if(!data||Buffer.byteLength(JSON.stringify(data))>16384)return res.status(400).json({error:'Solicitud no válida.'});
 if(action==='login')return res.status(200).json(await vip.login(req,data));
 if(action==='verify')return res.status(200).json(await vip.verify(res,data));
 if(action==='password-login')return res.status(200).json(await vip.auth.passwordLogin(req,res,data));
 if(action==='signup')return res.status(200).json(await vip.auth.signup(req,data));
 if(action==='forgot')return res.status(200).json(await vip.auth.forgot(req,data));
 if(action==='reset-password')return res.status(200).json(await vip.auth.reset(res,data));
 if(action==='oauth')return res.status(200).json(await vip.auth.oauth(res,data));
 if(action==='logout'){vip.setCookies(res,null);return res.status(200).json({message:'Sesión cerrada.'});}
 if(action==='admin-action')return res.status(200).json(await vip.adminAction(req,data));
 const u=await vip.user(req,res);
 if(action==='profile')return res.status(200).json(await vip.saveProfile(u,data));
 if(['car-save','car-delete'].includes(action))return res.status(200).json(await vip.car(u,{...data,action}));
 if(action==='checkout')return res.status(200).json(await vip.checkout(u,data));
 if(action==='portal')return res.status(200).json(await vip.portal(u));
 }else if(req.method==='GET'){
 const u=await vip.user(req,res);if(action==='me')return res.status(200).json(await vip.snapshot(u));
 if(action==='card'){const pdf=await vip.card(u);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="FL-VIP.pdf"');return res.status(200).send(Buffer.from(pdf));}
 }
 return res.status(405).json({error:'Operación no permitida.'});
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'No se pudo completar la operación VIP. No se ha confirmado ningún cobro nuevo.'});}};
