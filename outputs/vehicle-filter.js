(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.flVehicleFilter=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>({
 engines(generation,year,fuel){return generation.engines.map((engine,index)=>({engine,index})).filter(({engine})=>(!fuel||engine[0]===fuel)&&(!year||(year>=(engine[3]??generation.from)&&year<=(engine[4]??generation.to??Infinity))));}
}));
