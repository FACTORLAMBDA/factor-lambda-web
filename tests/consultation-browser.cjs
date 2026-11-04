const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/RubénHernándezMurill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
(async()=>{const root=path.resolve(__dirname,'../outputs'),server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true});for(const [width,mode,topic,total]of [[1440,'phone','mechanics',2500],[390,'visit','exhausts',3000]]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let paid=false,bookings=0,checkouts=0,lead;
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());await page.route('**/fl-agent.js',r=>r.fulfill({body:''}));
 await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.turnstile={render:(selector,options)=>{options.callback("mock");return 1;},reset:()=>{}};window.flConsultVerification();'}));
 await page.exposeFunction('mockConsultPaid',()=>{paid=true;});
 await page.route('https://js.stripe.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.Stripe=()=>({createEmbeddedCheckoutPage:async options=>({mount:selector=>{document.querySelector(selector).textContent="Stripe simulado · Sin cobros";window.finishConsultMock=async()=>{await window.mockConsultPaid();options.onComplete();};},destroy:()=>{}})});'}));
 await page.route('**/api/repro-quotes?**',async r=>{const req=r.request(),action=new URL(req.url()).searchParams.get('action');let json;
  if(action==='config')json={enabled:true,checkout:true,siteKey:'mock'};
  else if(action==='consult-slots')json={slots:[{start:'08:00',end:'08:30',available:true},{start:'08:30',end:'09:00',available:false}]};
  else if(action==='consult-booking'){lead=req.postDataJSON();assert.equal(lead.mode,mode);assert.equal(lead.topic,topic);assert.ok(lead.accepted);assert.equal(lead.challenge,'mock');bookings++;json={id:'mock-id',token:'mock-token',mode:'test',totalCents:total};}
  else if(action==='checkout'){checkouts++;json={mode:'test',publishableKey:'pk_test_mock',clientSecret:'mock_secret'};}
  else if(action==='payment-status')json={status:paid?'paid':'open'};
  else if(action==='')json={name:'Test',vehicle:{model:'SEAT Leon',plate:'TEST'},config:{serviceKind:'consultation',notes:'Consulta',consultation:{mode,topic},appointment:{day:lead.day,time:lead.time,endTime:'08:30'}},status:'sent'};
  else throw Error('Unexpected action '+action);
  await r.fulfill({json});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/citas.html');await page.locator('#consult-topic').waitFor();await page.selectOption('#consult-mode',mode);await page.selectOption('#consult-topic',topic);assert.match(await page.locator('#consult-price').innerText(),new RegExp(String(total/100)));
 await page.locator('#consult-forward').click();await page.locator('#consult-next').click();await page.locator('#consult-calendar input:not([disabled])').first().waitFor();await page.locator('#consult-calendar input:not([disabled])').first().check();await page.locator('#consult-forward').click();
 for(const [id,value]of Object.entries({name:'Test',phone:'600000000',email:'test@example.com',vehicle:'SEAT Leon',plate:'TEST',notes:'Consulta mecánica'}))await page.locator('#consult-'+id).fill(value);
 await page.locator('#consult-forward').click();await page.locator('#consult-accept').check();await page.locator('#consult-forward').click();await page.locator('#consult-checkout').getByText('Stripe simulado').waitFor();assert.equal(bookings,1);assert.equal(checkouts,1);assert.ok(!paid);await page.screenshot({path:path.resolve('work/consultation-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.reload();await page.locator('#consult-accept').check();await page.locator('#consult-forward').click();await page.locator('#consult-checkout').getByText('Stripe simulado').waitFor();assert.equal(bookings,1);assert.equal(checkouts,2);
 await page.evaluate(()=>window.finishConsultMock());await page.waitForFunction(()=>document.getElementById('consult-status').textContent.includes('Pago y cita confirmados'));assert.equal(errors.length,0,errors.join('\n'));await page.close();
 }console.log('PASS consultation desktop/mobile: phone/visit, calendar availability, consent, fixed-price checkout, resume without duplicate booking, webhook-backed confirmation. All providers mocked.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
