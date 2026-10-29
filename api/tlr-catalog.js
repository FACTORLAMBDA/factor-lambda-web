const {load} = require('../lib/tlr-catalog');
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','public, s-maxage=3600');
  if(req.method !== 'GET') return res.status(405).json({error:'Método no permitido.'});
  try {return res.status(200).json(await load(new URL(req.url,'http://localhost').searchParams));}
  catch(error){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'No se pudo consultar TLR SPORT. Indica tu vehículo manualmente para solicitar presupuesto.'});}
};
