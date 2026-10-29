(function(root){
  function reproSlots(withDyno){
    const duration=withDyno?150:90;
    const format=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    return [[480,780],[840,1020]].flatMap(([open,close])=>{
      const slots=[];
      for(let start=open;start+duration<=close;start+=30)slots.push({start:format(start),end:format(start+duration),duration});
      return slots;
    });
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={reproSlots};
  else root.FLBookingSchedule={reproSlots};
})(typeof window!=='undefined'?window:globalThis);
