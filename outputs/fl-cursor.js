(() => {
  if (document.getElementById('fl-cursor')) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const style = document.createElement('style');
  style.textContent = `
    #fl-cursor{position:fixed;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;border:1px solid #ff7a0d;border-radius:50%;pointer-events:none;z-index:2147483647;opacity:0;box-sizing:border-box;transform:translate3d(-100px,-100px,0);transition:width .15s,height .15s,margin .15s,background-color .15s;contain:layout style}
    #fl-cursor::after{content:'';position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;background:#ff7a0d;transform:translate(-50%,-50%)}
    @media(hover:hover) and (pointer:fine){html.fl-cursor-visible,html.fl-cursor-visible *{cursor:none!important}html.fl-cursor-visible #fl-cursor{opacity:1}#fl-cursor[data-interactive=true]{width:38px;height:38px;margin:-19px 0 0 -19px;background:#ff7a0d15}#fl-cursor[data-down=true]{width:24px;height:24px;margin:-12px 0 0 -12px}}
    @media(prefers-reduced-motion:reduce){#fl-cursor{transition:none}}
    @media(forced-colors:active){#fl-cursor{display:none}html.fl-cursor-visible,html.fl-cursor-visible *{cursor:auto!important}}
  `;
  document.head.append(style);
  const cursor = document.createElement('div');
  cursor.id = 'fl-cursor'; cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);
  let frame = 0, x = 0, y = 0;
  const hide = () => {document.documentElement.classList.remove('fl-cursor-visible');cursor.dataset.down = 'false';};
  document.addEventListener('pointermove', event => {
    if (!fine.matches || event.pointerType !== 'mouse') {hide();return;}
    x = event.clientX; y = event.clientY;
    cursor.dataset.interactive = String(!!event.target.closest('a,button,input,select,textarea,label,[role="button"]'));
    if (!frame) frame = requestAnimationFrame(() => {
      cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
      document.documentElement.classList.add('fl-cursor-visible');frame = 0;
    });
  }, {passive:true});
  document.addEventListener('pointerdown', event => {if(event.pointerType === 'mouse') cursor.dataset.down = 'true';});
  document.addEventListener('pointerup', () => cursor.dataset.down = 'false');
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('pointerover', event => {if(event.target.tagName==='IFRAME')hide();});
  document.addEventListener('keydown', hide);
  document.addEventListener('visibilitychange', () => {if(document.hidden)hide();});
  window.addEventListener('blur', hide);fine.addEventListener('change', hide);
})();
