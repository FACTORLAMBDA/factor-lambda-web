const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/RubénHernándezMurill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];let posts=0,paid=false,bookingBody;
  await page.exposeFunction('markMockPaid',()=>{paid=true;});
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  const pricing={softwareNetCents:40000,softwareVatCents:8400,softwareGrossCents:48400,dynoGrossCents:10000,totalCents:58400};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/repro-quotes?**',async route=>{const req=route.request(),url=new URL(req.url()),action=url.searchParams.get('action');let json;
   if(req.method()==='POST')posts++;
   if(action==='config')json={enabled:true,checkout:true,siteKey:'mock'};
   else if(action==='direct-slots')json={slots:[{start:'08:00',end:'10:30',available:true},{start:'08:30',end:'11:00',available:false}]};
   else if(action==='direct-price')json=pricing;
   else if(action==='direct-booking'){const body=req.postDataJSON();bookingBody=body;assert.equal(body.expectedTotalCents,58400);assert.equal(body.challenge,'mock');json={id:'mock',token:'mock',mode:'test',pricing};}
   else if(action==='checkout')json={clientSecret:'mock_secret',publishableKey:'pk_test_mock',mode:'test'};
   else if(action==='payment-status')json={status:paid?'paid':'open'};
   else if(action==='')json={name:'Prueba local',vehicle:{model:'Vehículo de prueba'},config:{flow:'direct-v1',brand:'TLR SPORT',dyno:true,pricing,appointment:{day:bookingBody.day,time:bookingBody.time}},status:'sent'};
   else throw Error('Unexpected API '+action);
   await route.fulfill({json});
  });
  await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'text/javascript',body:"window.turnstile={render:(s,o)=>{o.callback('mock');return 0},reset:()=>{}};window.flDirectVerification();"}));
  await page.route('https://js.stripe.com/**',route=>route.fulfill({contentType:'text/javascript',body:"window.Stripe=()=>({createEmbeddedCheckoutPage:async o=>({mount:s=>{document.querySelector(s).textContent='Stripe SIMULADO: prueba de interfaz, sin cobros';window.finishMockPayment=()=>window.markMockPaid().then(o.onComplete)},destroy:()=>{}})});"}));
  await page.goto('http://localhost:3000/haz-tu-repro.html');await page.locator('#repro-make option').nth(85).waitFor({state:'attached'});
  await page.selectOption('#repro-make','seat');await page.waitForFunction(()=>!document.getElementById('repro-model').disabled);await page.selectOption('#repro-model',{label:'Leon'});
  await page.screenshot({path:'work/direct-before-select.png',fullPage:true});
  await page.locator('#repro-generations button').first().click();await page.locator('.engine-row input').first().check();await page.locator('#repro-selector button[type=submit]').click();
  assert.ok(await page.locator('#repro-agenda').isVisible());await page.selectOption('#lead-brand','Sin preferencia');assert.match(await page.locator('#repro-bank-price').innerText(),/pendiente/);
  await page.selectOption('#lead-brand','REVO');assert.match(await page.locator('#repro-bank-price').innerText(),/80/);await page.selectOption('#lead-brand','TLR SPORT');assert.match(await page.locator('#repro-bank-price').innerText(),/100/);
  await page.locator('#repro-week-next').click();await page.locator('#repro-week button:not([disabled])').first().click();await page.locator('#repro-times input:not([disabled])').first().check();assert.equal(await page.locator('#repro-times input:disabled').count(),1);
  await page.locator('#repro-agenda-form button[type=submit]').click();await page.fill('#lead-name','Prueba local');await page.fill('#lead-phone','600000000');await page.fill('#lead-email','test@example.com');await page.check('#lead-email-consent');
  await page.locator('#lead-send').click();await page.locator('#repro-payment-summary').getByText('584,00 €',{exact:true}).waitFor();assert.equal(posts,0);
  await page.locator('#payment-back').click();assert.equal(await page.inputValue('#lead-name'),'Prueba local');await page.locator('#lead-send').click();await page.locator('#repro-payment-summary').getByText('584,00 €',{exact:true}).waitFor();
  assert.ok(await page.locator('#repro-direct-pay').isDisabled());await page.check('#repro-direct-accept');await page.locator('#repro-direct-pay').click();
  await page.locator('#repro-direct-checkout').getByText('Stripe SIMULADO: prueba de interfaz, sin cobros').waitFor();assert.equal(posts,2);
  await page.reload();await page.locator('#repro-payment-summary').getByText('584,00 €',{exact:true}).waitFor();await page.check('#repro-direct-accept');await page.locator('#repro-direct-pay').click();await page.locator('#repro-direct-checkout').getByText('Stripe SIMULADO: prueba de interfaz, sin cobros').waitFor();assert.equal(posts,3);
  await page.evaluate(()=>window.finishMockPayment());await page.waitForFunction(()=>document.getElementById('repro-payment-status').textContent.startsWith('Pago y cita confirmados'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS desktop/mobile real-page wizard with mocked services: order, actual availability, bank, VAT/total, contact back, consent, signed booking -> Embedded Checkout -> server confirmation; no real calls/payments.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
