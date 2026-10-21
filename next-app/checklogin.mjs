import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true,args:["--no-sandbox"]});
const p = await b.newPage();
await p.setViewport({width:360,height:740,isMobile:true,hasTouch:true});
await p.goto("http://127.0.0.1:3100/login/",{waitUntil:"domcontentloaded"});
await p.waitForNetworkIdle({idleTime:500}).catch(()=>{});
const r = await p.evaluate(()=>[...document.querySelectorAll("button,a,[role=button],.page-hero-chip")].map(e=>{const b=e.getBoundingClientRect();const s=getComputedStyle(e);return {c:e.className||"(none)",txt:e.textContent.slice(0,40),w:Math.round(b.width),h:b.height,disp:s.display,html:e.outerHTML.slice(0,140)};}).filter(x=>x.disp!=="none"&&x.w<=320&&x.h<44&&x.h>1&&x.w>150));
console.log(JSON.stringify(r,null,1));
await b.close();
