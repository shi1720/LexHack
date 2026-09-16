import assert from 'node:assert/strict';
import { verifyLedgerAgainstResults } from '@annex/engine';

const base = process.argv[2] || 'http://localhost:3320';
let checks = 0;
function ok(v, label) { assert(v, label); checks++; console.log(`PASS ${label}`); }
async function visitor() {
  const html = await (await fetch(`${base}/login`)).text();
  const action = html.match(/name="(\$ACTION_ID_[^"]+)"/)[1];
  const body = new FormData(); body.set(action, '');
  const res = await fetch(`${base}/login`, { method:'POST', body, headers:{Origin:base}, redirect:'manual' });
  ok(res.status === 303, 'demo login redirects');
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  ok(cookie?.startsWith('__session='), 'Firebase-compatible session cookie');
  const request = (path, options={}) => fetch(base+path, {...options,headers:{cookie,...options.headers}});
  await (await request('/app')).text();
  const account = await (await request('/api/account/export')).json();
  return {cookie,request,account};
}
const health = await (await fetch(base+'/api/health')).json(); ok(health.status === 'ok','health');
const a = await visitor(), b = await visitor();
ok(a.account.user.id !== b.account.user.id,'visitors have separate identities');
ok(a.account.systems.length === 4 && b.account.systems.length === 4,'each visitor has four samples');
async function settings(visitor, turnover, employees) {
 const html=await (await visitor.request('/app/settings')).text();
 const form=[...html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)].find(m=>m[1].includes('name="turnover"'))[1];
 const action=form.match(/name="(\$ACTION_ID_[^"]+)"/)[1];
 const body=new FormData(); for(const [k,v] of Object.entries({[action]:'',name:'API reviewer',org:'API test',turnover,employees}))body.set(k,v);
 return visitor.request('/app/settings',{method:'POST',body,headers:{Origin:base},redirect:'manual'});
}
ok((await settings(a,'0','0')).status===303,'zero settings accepted');
let saved=await (await a.request('/api/account/export')).json();ok(saved.user.turnover_eur===0 && saved.user.employees===0,'zero settings persisted');
ok((await settings(a,'','')).status===303,'empty settings accepted');
saved=await (await a.request('/api/account/export')).json();ok(saved.user.turnover_eur===null && saved.user.employees===null,'settings can be cleared');
const bad=await settings(a,'-20','3');ok(bad.headers.get('location')?.includes('error='),'negative settings rejected');
const hire = a.account.systems.find(s=>s.source==='hireflow');
const fixed = a.account.systems.find(s=>s.source==='hireflow-remediated');
for (const path of [`/app/s/${hire.id}`,...['evidence','dossier','remediation','history','share'].map(t=>`/app/s/${hire.id}/${t}`), '/app/new','/app/settings']) {
 const r=await a.request(path); const html=await r.text();ok(r.ok && !html.includes('Application error'),`page ${path.replace(hire.id,'hireflow')}`);
}
for (const route of ['export','dossier','patch','explain']) {
 const opts=route==='explain'?{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}:{};
 ok((await b.request(`/api/systems/${hire.id}/${route}`,opts)).status===404,`cross-workspace ${route} blocked`);
}
for (const format of ['json','sarif','cdxa','mlbom']) {
 const r=await a.request(`/api/systems/${hire.id}/export?format=${format}`);const d=await r.json();ok(r.ok && !!d,`${format} download`);
 if(format==='json') {ok(d.classification.tier==='prohibited','HireFlow flags prohibited practice');ok(d.ledger.entries.length>0,'report includes ledger');ok(verifyLedgerAgainstResults(d.ledger,d.controls,Object.fromEntries(d.packs.map(p=>[p.packId,p.version]))).valid,'downloaded ledger verifies');const changed=structuredClone(d.controls);changed[0].score=changed[0].score===1?0:1;ok(!verifyLedgerAgainstResults(d.ledger,changed,Object.fromEntries(d.packs.map(p=>[p.packId,p.version]))).valid,'tampered report fails verification');}
 if(format==='sarif')ok(d.version==='2.1.0' && d.runs[0].results.length>0,'SARIF results');
}
const f=await (await a.request(`/api/systems/${fixed.id}/export`)).json();ok(f.classification.tier==='high','remediated sample remains high risk');
for(const locale of ['en','de','fr']){const r=await a.request(`/api/systems/${hire.id}/dossier?locale=${locale}`);const t=await r.text();ok(r.ok && t.includes('- [ ]'),`${locale} dossier keeps unresolved fields explicit`);}
const pr=await a.request(`/api/systems/${hire.id}/patch`);const patch=await pr.text();ok(pr.ok && patch.includes('diff --git'),`patch download contains a diff (HTTP ${pr.status}, ${patch.slice(0,100)})`);
ok((await fetch(`${base}/api/systems/${hire.id}/export`)).status===401,'anonymous private export blocked');
ok((await a.request(`/api/systems/${hire.id}/export?format=invalid`)).status===400,'invalid export format rejected');
const trust=await fetch(`${base}/trust/${fixed.trust_slug}`);const t=await trust.text();ok(trust.ok && t.includes('HireFlow v3'),'published trust page visible signed out');
ok(!t.includes('detectEmotion') && !t.includes('candidateScore'),'trust page does not expose source snippets');
ok((await fetch(`${base}/trust/${hire.trust_slug}`)).status===404,'unpublished trust page hidden');
const explain=await a.request(`/api/systems/${hire.id}/explain`,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({controlId:'eu-ai-act.art5.emotion-workplace',audience:'executive'})}); const e=await explain.json();ok(explain.ok && e.text?.length>80,'plain language explanation or explicit fallback');console.log('AI available:',e.available,'model:',e.model || 'rule-based fallback');
ok((await a.request(`/api/systems/${hire.id}/explain`,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status===403,'cross-origin AI request blocked');
console.log(`${checks} API and integration checks passed at ${base}`);
