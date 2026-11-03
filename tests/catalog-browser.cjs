const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/RubénHernándezMurill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3000/haz-tu-repro.html');
    await page.locator('#repro-make option').nth(85).waitFor({state:'attached'});
    const brands=await page.locator('#repro-make option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));
    assert.equal(brands.length,85);
    for(const brand of brands){
      await page.selectOption('#repro-make',brand);
      await page.waitForFunction(()=>!document.getElementById('repro-model').disabled);
      const models=await page.locator('#repro-model option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));
      assert.ok(models.length,brand);
      await page.selectOption('#repro-model',models[0]);
      await page.locator('#repro-generations button').first().click();
      await page.locator('.engine-row input').first().check();
      assert.ok(await page.locator('#repro-results').isVisible(),brand);
      assert.ok((await page.locator('#stock-power').innerText()).includes('CV'),brand);
    }
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      fs.mkdirSync('work',{recursive:true});
      await page.screenshot({path:'work/catalog-'+width+'.png',fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS browser: all 85 brand files load, models/generations/engines selectable, performance shown; desktop/mobile no horizontal overflow or JS errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
