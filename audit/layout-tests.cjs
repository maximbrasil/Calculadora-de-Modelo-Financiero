const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},querySelector:()=>null});return elements.get(id)};
const document={documentElement:{},querySelectorAll:()=>[],getElementById:element,addEventListener:()=>{},body:{addEventListener:()=>{}}};
const ctx=vm.createContext({console,document,window:{matchMedia:()=>({matches:false})},requestAnimationFrame:()=>{},setTimeout:()=>{},clearTimeout:()=>{}});
for(const name of ['localization.js','financial-engine.js','cities.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
let code=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(code.includes('return{init}'));
code=code.replace('return{init}',`return{init,testRender(step,language,custom=false){const city=cities().find(x=>x.city==='Cruzeiro do Sul');model=FinancialEngine.calculate({...city,initialInvestment:city.initialPayment,useRecommendedValues:!custom});state={language,selectedCityId:city.id,activeScenario:{assumptions:model.assumptions}};Localization.setLanguage(language);salesFlowStep=step;renderSalesFlow();return document.getElementById('salesFlowContent').innerHTML;}}`);
vm.runInContext(code,ctx);
const app=vm.runInContext('App',ctx);
fs.mkdirSync('/tmp/small-app-layout',{recursive:true});
for(const lang of ['pt-BR','en'])for(let step=0;step<5;step++){
 const html=app.testRender(step,lang); assert(!html.includes('undefined'));assert(html.includes(`data-sales-step="${step}"`));
 if(step===0)assert(html.includes('f7-potential-grid'));
 if(step===1)assert(html.includes('revenue-summary')&&!html.includes('f7-model-kpis'));
 if(step===2){assert((html.match(/class="role-details"/g)||[]).length===2);assert(html.includes(lang==='en'?'Initial licence fee':'Taxa de licença inicial'));}
 if(step===4){assert(html.includes('business-chart-legend'));assert(html.includes('sales-icon-investment"><svg'));assert(html.includes('contact-disclosure'));}
 fs.writeFileSync(`/tmp/small-app-layout/${lang}-${step}.html`,html);
}
assert(app.testRender(4,'en',true).includes('Custom scenario'));
console.log(JSON.stringify({status:'PASS',renderedScreens:10,languages:['pt-BR','en'],responsibilityDisclosures:true,chartLegend:true,investmentIcon:true,customScenarioLabel:true,scope:'HTML generation only; no browser rendering'}));
