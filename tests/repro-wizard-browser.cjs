const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/RubénHernándezMurill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000}});let posts=0;const errors=[];
    page.on('request',r=>{if(r.method()==='POST')posts++;});page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3000/haz-tu-repro.html');
    await page.locator('#repro-make option').nth(85).waitFor({state:'attached'});
    await page.selectOption('#repro-make','seat');await page.waitForFunction(()=>!document.getElementById('repro-model').disabled);
    await page.selectOption('#repro-model',{label:'Leon'});await page.locator('#repro-generations button').first().click();await page.locator('.engine-row input').first().check();
    await page.locator('#repro-selector button[type=submit]').click();assert.ok(await page.locator('#repro-agenda').isVisible());assert.ok(await page.locator('#repro-contact').isHidden());
    await page.selectOption('#lead-brand','REVO');assert.match(await page.locator('#repro-bank-price').innerText(),/80/);
    await page.selectOption('#lead-brand','TLR SPORT');assert.match(await page.locator('#repro-bank-price').innerText(),/100/);
    await page.locator('#repro-week-next').click();await page.locator('#repro-week button:not([disabled])').first().click();await page.locator('#repro-times input').first().check();
    assert.match(await page.locator('#repro-times').innerText(),/08:00–10:30/);
    await page.locator('#repro-agenda-form button[type=submit]').click();assert.ok(await page.locator('#repro-contact').isVisible());
    await page.fill('#lead-name','Prueba local');await page.fill('#lead-phone','600000000');await page.fill('#lead-email','test@example.com');await page.check('#lead-email-consent');
    await page.locator('#lead-send').click();assert.ok(await page.locator('#repro-payment').isVisible());assert.ok(await page.locator('#repro-direct-pay').isDisabled());
    assert.match(await page.locator('#repro-payment-summary').innerText(),/100,00/);assert.equal(posts,0);
    await page.locator('#payment-back').click();assert.equal(await page.inputValue('#lead-name'),'Prueba local');await page.locator('#lead-back').click();assert.ok(await page.locator('#repro-agenda').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    await page.screenshot({path:'work/repro-agenda-'+width+'.png',fullPage:true});await page.close();
  }console.log('PASS live-page flow: vehicle -> agenda -> contact -> payment, back preserves fields, REVO80/TLR100, valid duration, no request/email/charge, desktop/mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
