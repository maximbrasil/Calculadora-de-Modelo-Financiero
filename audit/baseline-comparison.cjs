const vm=require('vm'),fs=require('fs'),assert=require('assert');
const root=__dirname+'/../';
function engine(file){const c=vm.createContext({});vm.runInContext(fs.readFileSync(file,'utf8'),c);return vm.runInContext('FinancialEngine',c)}
const old=engine(__dirname+'/original-financial-engine.js'), current=engine(root+'financial-engine.js');
const c=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(root+'cities.js','utf8'),c);const cities=vm.runInContext('CityData',c);
for(const city of cities){const a={...city,initialInvestment:city.initialPayment};const x=old.calculate(a), y=current.calculate(a); for(const key of ['netProfit','totalInvestment','totalOperatingExpenses','totalGrossRevenue','roi'])assert(Math.abs(x.summary[key]-y.summary[key])<1e-7,city.id+':'+key);assert(x.summary.paybackPeriod===y.summary.paybackPeriod);assert(JSON.stringify(x.months)===JSON.stringify(y.months));}
const a={}, b={expenseRows:[{id:'rent',name:'Rent',amount:1000,showInModel:true}]};
console.log(JSON.stringify({defaultCityResultsUnchanged:cities.length,originalExtraExpenseEffect:old.calculate(a).summary.netProfit-old.calculate(b).summary.netProfit,fixedExtraExpenseEffect:current.calculate(a).summary.netProfit-current.calculate(b).summary.netProfit}));
