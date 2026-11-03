(() => {
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const number=(value,unit)=>Number.isFinite(value)?new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(value)+' '+unit:'No publicado';
  function render(container,reference,prefix=''){
    container.replaceChildren();const layout=element('div','performance-layout');const summary=element('section','performance-summary');summary.append(element('h2','',reference.stage||'Preparación'));
    for(const metric of [{name:'Potencia',unit:'CV',original:reference.stockPower,modified:reference.referencePower,ids:['stock-power','reference-power','power-gain']},{name:'Par',unit:'Nm',original:reference.stockTorque,modified:reference.referenceTorque,ids:['stock-torque','reference-torque','torque-gain']}]){
      const section=element('section','performance-metric');section.append(element('h3','',metric.name));const list=element('dl');const delta=Number.isFinite(metric.original)&&Number.isFinite(metric.modified)?metric.modified-metric.original:null;
      for(const [index,label,value]of [[0,'De serie',number(metric.original,metric.unit)],[1,'Referencia de preparación',number(metric.modified,metric.unit)],[2,'Diferencia',delta===null?'No publicado':(delta>=0?'+':'')+number(delta,metric.unit)]]){const row=element('div','performance-line'+(index===1?' performance-highlight':''));const dd=element('dd','',value);dd.id=prefix+metric.ids[index];row.append(element('dt','',label),dd);list.append(row);}section.append(list);summary.append(section);
    }
    const context=element('aside','performance-context');context.append(element('h3','','Datos de referencia'),element('p','','Los valores son orientativos y dependen del vehículo. No son resultados garantizados de Factor Lambda, TLR SPORT o REVO.'));
    if(reference.notes)context.append(element('p','performance-note',reference.notes));
    context.append(element('p','performance-note','La curva medida en banco no está disponible en este catálogo.'));
    layout.append(summary,context);container.append(layout);
  }
  window.FLPerformance={render};
})();
