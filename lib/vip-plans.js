const plans={
 essential:{name:'FL Essential',monthly:599,annual:6999,discount:5,services:['Mantenimiento de motor','Mantenimiento de caja de cambios','Líquido de frenos']},
 performance:{name:'FL Performance',monthly:999,annual:11699,discount:10,services:['Mantenimiento de motor','Mantenimiento de caja de cambios','Líquido de frenos','Electrónica']},
 elite:{name:'FL Élite',monthly:1420,annual:16499,discount:15,services:['Mantenimiento de motor','Mantenimiento de caja de cambios','Líquido de frenos','Electrónica','Diagnóstico de averías'],extras:['Tarjeta VIP física gratis','Una inspección gratis cada año']}
};
function selected(plan,period){if(!plans[plan]||!['monthly','annual'].includes(period))throw Object.assign(Error('Selecciona un plan y una periodicidad válidos.'),{status:400});return plans[plan];}
module.exports={plans,selected};
