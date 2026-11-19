(() => {
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('fl-site-loading');
  let loader,frame,done=false,ready=false,shown=0,children=[],started;
  const minimum=reduced?0:1500;
  function finish(){
    if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(safety);
    root.classList.remove('fl-site-loading');
    for(const [element,inert] of children)element.inert=inert;
    if(loader){paint(100);loader.classList.add('is-leaving');setTimeout(()=>loader.remove(),reduced?0:250);}
  }
  const safety=setTimeout(finish,8000);
  function paint(value){shown=Math.max(shown,Math.min(100,Math.round(value)));loader.style.setProperty('--progress',shown+'%');loader.querySelector('[role=progressbar]').setAttribute('aria-valuenow',String(shown));loader.querySelector('.fl-site-loader-number').textContent=shown+'%';}
  function tick(now){if(done)return;const elapsed=now-started;if(ready&&elapsed>=minimum){paint(100);frame=requestAnimationFrame(()=>requestAnimationFrame(finish));return;}paint(reduced?0:Math.min(ready?99:90,elapsed/Math.max(minimum,1)*100));frame=requestAnimationFrame(tick);}
  function start(){
    if(done)return;
    loader=document.createElement('div');loader.className='fl-site-loader';
    loader.innerHTML='<div class="fl-site-loader-content"><div class="fl-site-loader-logo"><img class="fl-site-loader-base" src="/assets/panel-factor-lambda-logo.png" alt="Factor Lambda" width="885" height="266"><img class="fl-site-loader-color" src="/assets/panel-factor-lambda-logo.png" alt="" aria-hidden="true" width="885" height="266"></div><div class="fl-site-loader-progress" role="progressbar" aria-label="Cargando Factor Lambda" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="fl-site-loader-track" aria-hidden="true"><span class="fl-site-loader-fill"></span></span><span class="fl-site-loader-number" aria-hidden="true">0%</span></div></div>';
    children=[...document.body.children].filter(e=>!['SCRIPT','STYLE','LINK'].includes(e.tagName)).map(e=>[e,e.inert]);
    children.forEach(([e])=>{e.inert=true;});document.body.append(loader);started=performance.now();paint(0);
    const img=loader.querySelector('img'),logoReady=img.decode?img.decode().catch(()=>{}):Promise.resolve();
    const pageReady=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>addEventListener('load',resolve,{once:true}));
    Promise.all([logoReady,pageReady]).then(()=>{ready=true;});frame=requestAnimationFrame(tick);
  }
  addEventListener('pageshow',event=>{if(event.persisted)finish();});
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
