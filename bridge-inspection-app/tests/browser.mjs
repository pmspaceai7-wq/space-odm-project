import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {testServer,root} from './helpers.mjs';
const server=await testServer(18772,'browser');let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1050}});const page=await context.newPage();const errors=[];page.on('pageerror',err=>{errors.push(err.message);console.error('PAGE:',err.message);});page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER:',msg.text());});
 await page.goto(server.url);await page.getByRole('button',{name:/Enter as inspector/}).click();await page.getByRole('heading',{name:'Bridge inspections.'}).waitFor();
 await mkdir(resolve(root,'test-results/screenshots'),{recursive:true});await page.screenshot({path:resolve(root,'test-results/screenshots/dashboard.png'),fullPage:true});
 await page.getByRole('link',{name:/Open project/}).click();await page.locator('[data-model-status]').filter({hasText:'triangles'}).waitFor({timeout:60000});
 await page.screenshot({path:resolve(root,'test-results/screenshots/workspace.png'),fullPage:true});
 await page.getByRole('button',{name:/Find the bridges/}).click();await page.locator('#ortho-image').waitFor();await page.waitForFunction(()=>document.querySelector('#ortho-image')?.src.includes('bridge-closeup.png'));await page.getByRole('button',{name:'Photo observations',exact:true}).click();
 const photo=page.locator('#annotation-photo');await photo.waitFor();const box=await photo.boundingBox();await page.mouse.move(box.x+box.width*.45,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.57,{steps:10});await page.mouse.up();
 await page.getByLabel('Description',{exact:true}).fill('Browser acceptance test: verify the road crossing with closer imagery.');await page.getByRole('button',{name:'Save draft observation'}).click();await page.getByRole('button',{name:/Submit for review/}).waitFor();await page.reload();await page.getByRole('button',{name:/Submit for review/}).click();await page.getByText('submitted',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Sign out or switch demo role'}).click();await page.getByRole('button',{name:/Enter as reviewer/}).click();await page.getByRole('link',{name:'Review queue',exact:true}).click();await page.getByRole('button',{name:/Review evidence/}).click();await page.getByLabel('Review comment').fill('Evidence checked. This is a manual observation, not a structural diagnosis.');await page.getByRole('button',{name:'Save review decision'}).click();await page.getByRole('heading',{name:'The review queue is clear.'}).waitFor();
 await page.getByRole('link',{name:'Projects',exact:true}).click();await page.getByRole('link',{name:/Open project/}).click();await page.getByRole('button',{name:'Reports & outputs'}).click();await page.getByRole('button',{name:/Issue report/}).click();await page.getByRole('link',{name:'Open ↗',exact:true}).waitFor();const popupPromise=page.waitForEvent('popup');await page.getByRole('link',{name:'Open ↗',exact:true}).click();const report=await popupPromise;await report.waitForLoadState();assert.ok((await report.locator('body').innerText()).includes('Browser acceptance test'));await report.close();
 await page.getByRole('button',{name:/Findings/}).click();await page.screenshot({path:resolve(root,'test-results/screenshots/findings.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Photo observations',exact:true}).click();await page.screenshot({path:resolve(root,'test-results/screenshots/mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow at mobile width');
 await page.getByRole('button',{name:'3D workspace',exact:true}).click();await page.locator('[data-model-status]').filter({hasText:'triangles'}).waitFor({timeout:60000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS: login, real 3D load, bridge close-up, photo marking, persisted draft, submit, role switch, review, immutable report, mobile layout; no uncaught browser errors.');
}finally{await browser?.close();await server.close();}
