(function(root){
  const topics={mechanics:'Mecánica',tuning:'Reprogramaciones','online-quote':'Presupuesto online','quick-mechanics':'Mecánica rápida','dynamic-test':'Prueba dinámica',exhausts:'Escapes','other-help':'Otra ayuda'};
  function service(mode,topic){
    if(!['phone','visit'].includes(mode)||!Object.hasOwn(topics,topic))throw Error('Selecciona un tipo de cita y un motivo válidos.');
    const professional=['tuning','exhausts'].includes(topic)?'joaquin':'german';
    return {mode,topic,topicLabel:topics[topic],professional,professionalName:professional==='joaquin'?'Joaquín':'Germán',durationMinutes:30,totalCents:topic==='online-quote'||mode==='visit'?3000:2500,label:topic==='online-quote'?'Presupuesto online':mode==='phone'?'Consulta telefónica':'Consulta presencial'};
  }
  function slots(professional){const count=professional==='joaquin'?16:15;return Array.from({length:count},(_,i)=>{const mins=480+i*30,fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');return {start:fmt(mins),end:fmt(mins+30),duration:30};});}
  const api={topics,service,slots};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FLConsultation=api;
})(typeof window!=='undefined'?window:globalThis);
