const fs=require('fs'), vm=require('vm'), assert=require('assert');
const path=require('path');
const root=path.resolve(process.argv[2]||require('path').join(__dirname,'..'));
const ctx=vm.createContext({console,window:{},Localization:{t:x=>x}});
for(const f of ['financial-engine.js','cities.js','validation.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const E=vm.runInContext('FinancialEngine',ctx), cities=vm.runInContext('CityData',ctx), V=vm.runInContext('Validation',ctx);
let checks=0;
function close(a,b,n){assert(Number.isFinite(a)&&Math.abs(a-b)<1e-6,`${n}: ${a} != ${b}`);checks++;}
function invariant(m){
 const a=m.assumptions,s=m.summary,months=m.months.slice(2);
 close(months.reduce((t,m)=>t+m.marketingInvestment,0),a.marketingBudget,'annual marketing');
 close(s.totalInvestment,a.initialInvestment+a.marketingBudget,'investment');
 close(s.netProfit,m.months.at(-1).accumulated,'annual result vs cumulative cash');
 close(s.netProfit,s.totalGrossRevenue-s.totalInvestment-s.totalOperatingExpenses,'annual net');
 close(s.totalOperatingExpenses,months.reduce((t,m)=>t+m.opEx,0),'operating total');
 close(m.months[0].netCashFlow,-a.initialInvestment,'pre-opening');
 close(m.months[1].netCashFlow,0,'preparation');
 for(const x of months){
  close(x.ridesPerMonth,x.ridesPerDay*30,'rides per month');
  close(x.commissionFromRides,x.ridesPerMonth*a.averageFare*a.commission/100,'commission');
  close(x.opEx,Object.values(x.fixedExpenses).reduce((x,y)=>x+y,0)+x.smsExpense+x.maximRevenue,'opex components');
  close(x.netProfit,x.commissionFromRides-x.opEx-x.marketingInvestment,'monthly net');
  assert(x.ridesPerDay>=0&&x.marketingInvestment>=0);checks++;
 }
 for(const x of Object.values(s))if(typeof x==='number'){assert(Number.isFinite(x));checks++;}
 assert(V.validateAssumptions(a).valid,'normalized model validation');checks++;
}
for(const c of cities)invariant(E.calculate({...c,initialInvestment:c.initialPayment}));
let profiles=0;
for(const population of [1,4182,4183,5000,19999,20000,100000,1000000])
for(const marketingBudget of [0,1,99,100,100.25,30000,1000000])
for(const commission of [10,15,20])
for(const averageFare of [.01,12,30]){
 invariant(E.calculate({population,marketingBudget,commission,averageFare,useRecommendedValues:false}));profiles++;
}
for(const [g,t] of [[0,0],[3000,0],[3000.01,10],[5000,10],[5000.01,15],[7000,15],[7000.01,20],[9000,20],[9000.01,25],[11000,25],[11000.01,30]])close(E.technologyFeeShareForGrossRevenue(g),t,'technology threshold');
close(E.assistantFeeForGrossRevenue(3000),250,'assistant threshold');close(E.assistantFeeForGrossRevenue(3000.01),500,'assistant threshold above');
close(E.smsExpenseForMonth(1400,3000),0,'SMS free');close(E.smsExpenseForMonth(1400,3000.01),10,'SMS charged');
const base=E.calculate({}), extra=E.calculate({expenseRows:[{id:'rent',name:'Rent',amount:1000.25,showInModel:true}]}), hidden=E.calculate({expenseRows:[{id:'rent',amount:1000,showInModel:false}]});
close(base.summary.netProfit-extra.summary.netProfit,12003,'extra expense affects annual profit');close(hidden.summary.netProfit,base.summary.netProfit,'excluded expense');
invariant(extra);
const invalid=E.calculate({population:Infinity,initialInvestment:-100,marketingBudget:Infinity,useRecommendedValues:false});
assert(Number.isFinite(invalid.summary.netProfit)&&invalid.summary.initialPayment===0);checks++;
console.log(JSON.stringify({status:'PASS',cities:cities.length,customProfiles:profiles,assertions:checks,baseline:base.summary.netProfit,extraExpenseAnnualEffect:base.summary.netProfit-extra.summary.netProfit},null,2));
