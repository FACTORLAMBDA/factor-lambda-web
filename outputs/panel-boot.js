(() => {
  const loader=document.getElementById('panel-loader'),main=document.getElementById('panel-main');
  if(!loader||!main)return;
  const progress=document.getElementById('panel-progress'),number=document.getElementById('loader-percentage'),fill=document.getElementById('loader-progress-fill');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ready=false,finished=false,shown=0,frame,timeout;
  const started=performance.now(),minimum=reduced?0:1500;
  loader.hidden=false;main.inert=true;main.setAttribute('aria-busy','true');document.body.classList.add('panel-is-loading');
  function paint(value){shown=Math.max(shown,Math.min(100,Math.round(value)));loader.style.setProperty('--loader-progress',shown+'%');fill.style.width=shown+'%';number.textContent=shown+'%';progress.setAttribute('aria-valuenow',String(shown));}
  function reveal(){if(finished)return;finished=true;cancelAnimationFrame(frame);clearTimeout(timeout);paint(100);requestAnimationFrame(()=>requestAnimationFrame(()=>{loader.classList.add('leaving');setTimeout(()=>{loader.hidden=true;main.inert=false;main.removeAttribute('aria-busy');document.body.classList.remove('panel-is-loading');},reduced?0:250);}));}
  function tick(now){if(finished)return;const elapsed=now-started;if(ready&&elapsed>=minimum){reveal();return;}const value=reduced?0:Math.min(ready?99:90,elapsed/Math.max(minimum,1)*100);paint(value);frame=requestAnimationFrame(tick);}
  const image=document.getElementById('loader-logo-base');
  const logoReady=image.decode?image.decode().catch(()=>{}):Promise.resolve();
  const pageReady=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  Promise.all([logoReady,pageReady]).then(()=>{ready=true;});
  // A failed or stalled external resource must never trap the login behind the intro.
  timeout=setTimeout(reveal,8000);paint(0);frame=requestAnimationFrame(tick);
})();
