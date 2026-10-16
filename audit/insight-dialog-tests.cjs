const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const list={innerHTML:'',removeAttribute(){}};
const ctx=vm.createContext({console,window:{},document:{documentElement:{},querySelectorAll:()=>[],addEventListener(){},getElementById:id=>id==='insightsList'?list:null}});
for(const name of ['localization.js','financial-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
let source=fs.readFileSync(path.join(root,'ui-renderer.js'),'utf8');
assert(source.includes('return{renderAll,'));
source=source.replace('return{renderAll,','return{renderInsights,renderAll,');
vm.runInContext(source,ctx);
const E=vm.runInContext('FinancialEngine',ctx),U=vm.runInContext('UIRenderer',ctx),L=vm.runInContext('Localization',ctx);
let cases=0;
for(const lang of ['pt-BR','en'])for(const budget of [0,1000,129000,1000000]){
 L.setLanguage(lang);const model=E.calculate({population:98916,marketingBudget:budget,useRecommendedValues:false,initialInvestment:25000});
 U.renderInsights(model);const rows=U.getInsightRows(model);
 const templates=[...list.innerHTML.matchAll(/<template class="insight-full"><p>(.*?)<\/p><\/template>/g)].map(x=>x[1]);
 assert.equal(templates.length,rows.length);
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 rows.forEach((r,i)=>assert.equal(templates[i],esc(L.t(r.text,r.vars||{}))));
 assert.equal((list.innerHTML.match(/data-insight-detail/g)||[]).length,rows.length);
 assert(!list.innerHTML.includes('undefined'));cases++;
}
console.log(JSON.stringify({status:'PASS',cases,fullInsightTextPreserved:true,detailButtonForEveryInsight:true,scope:'HTML generation; not browser interaction'}));
