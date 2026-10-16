'use strict';
const FinancialEngine=(()=>{
  const monthKeys=['setup','preparation',...Array.from({length:12},(_,i)=>`m${i+1}`)];
  const marketingPresets={
    balanced:[14,13,12,10,9,8,7,6,6,5,5,5],
    launchHeavy:[16,14,12,10,8,8,7,6,5,5,5,4],
    growth:[2,3,4,5,6,7,8,10,12,13,14,16],
    manual:null
  };
  const ridesPresets={
    balanced:[8,12,18,24,32,40,50,60,72,84,92,100],
    slow:[3,6,10,15,22,30,40,52,64,76,88,100],
    aggressive:[16,24,34,45,56,66,75,83,90,95,98,100],
    manual:null
  };
  function n(v){return Number(v)||0}
  function uid(){return 'ex_'+Math.random().toString(36).slice(2,9)}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function roundTo(value, step){return Math.round(n(value)/step)*step}
  function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
  function positive(v){const value=Number(v);return Number.isFinite(value)&&value>0?value:0}
  const COMPETITION_LEVEL_INTENSITY={medium:0.35,high:0.70,'very high':1};
  function competitionFactors(profile={}){
    const level=String(profile.competitionLevel||'Pending').trim();
    const normalizedLevel=level.toLowerCase();
    const confidence=clamp(n(profile.competitionConfidence),0,100);
    const intensity=COMPETITION_LEVEL_INTENSITY[normalizedLevel]||0;
    const effectiveCompetition=intensity*(confidence/100);
    // Pending does not mean "no competition". When city-level research is not
    // conclusive, the model applies a small uncertainty reserve instead of treating
    // the market as neutral. This reserve is explicitly an uncertainty adjustment,
    // not an estimate of competitor count or market share.
    const isPending=normalizedLevel==='pending';
    const uncertainty=isPending?clamp(1-confidence/100,0,1):0;
    const uncertaintyBudgetFactor=1+0.08*uncertainty;
    const uncertaintyDemandFactor=1-0.05*uncertainty;
    return{
      level,confidence,intensity,effectiveCompetition,isPending,uncertainty,
      dataAvailable:intensity>0&&confidence>0,
      competitionBudgetFactor:1+0.15*effectiveCompetition,
      competitionDemandFactor:1-0.08*effectiveCompetition,
      uncertaintyBudgetFactor,uncertaintyDemandFactor,
      budgetFactor:(1+0.15*effectiveCompetition)*uncertaintyBudgetFactor,
      demandFactor:(1-0.08*effectiveCompetition)*uncertaintyDemandFactor
    };
  }
  function competitionRampFactor(profile={},monthIndex=11){
    const competition=competitionFactors(profile);
    const index=clamp(n(monthIndex),0,11);
    const remaining=(11-index)/11;
    const confirmedCompetitionRamp=1-0.12*competition.effectiveCompetition*remaining;
    const pendingUncertaintyRamp=1-0.08*competition.uncertainty*remaining;
    return confirmedCompetitionRamp*pendingUncertaintyRamp;
  }
  function cityMarketFactors(profile={}){
    const gdp=positive(profile.gdpPerCapita);
    const stateGdp=positive(profile.stateMedianGdpPerCapita);
    const density=positive(profile.density);
    const stateDensity=positive(profile.stateMedianDensity);
    const economicRatio=gdp&&stateGdp?gdp/stateGdp:1;
    const densityRatio=density&&stateDensity?density/stateDensity:1;

    // Socioeconomic data is used as a moderate correction, not as a standalone
    // determinant of the business case. Logarithmic ratios prevent outlier
    // municipalities (industrial, mining or very compact cities) from dominating.
    const budgetEconomicFactor=clamp(1+0.035*Math.log(economicRatio),0.97,1.03);
    const budgetDensityFactor=clamp(1-0.015*Math.log(densityRatio),0.98,1.02);
    const socioeconomicBudgetFactor=clamp(budgetEconomicFactor*budgetDensityFactor,0.96,1.04);

    // Market capacity is adjusted only moderately. Population remains the primary
    // scale driver so two similarly sized municipalities cannot diverge sharply
    // solely because of GDP per capita or density.
    const demandEconomicFactor=clamp(1+0.025*Math.log(economicRatio),0.97,1.03);
    const demandDensityFactor=clamp(1+0.02*Math.log(densityRatio),0.97,1.03);
    const socioeconomicDemandFactor=clamp(demandEconomicFactor*demandDensityFactor,0.95,1.05);

    // Competition is treated as an entry-cost and market-capture factor rather
    // than as evidence that demand does not exist. Confirmed competition raises
    // the recommended promotion effort, slightly reduces year-1 obtainable share
    // and slows the first months of market entry. Pending research receives only a
    // small uncertainty reserve; it is never interpreted as proof of no competition.
    const competition=competitionFactors(profile);
    const budgetFactor=socioeconomicBudgetFactor*competition.budgetFactor;
    const demandFactor=socioeconomicDemandFactor*competition.demandFactor;

    return{
      hasEconomicData:!!(gdp&&stateGdp),
      hasDensityData:!!(density&&stateDensity),
      economicRatio,densityRatio,
      budgetEconomicFactor,budgetDensityFactor,socioeconomicBudgetFactor,budgetFactor,
      demandEconomicFactor,demandDensityFactor,socioeconomicDemandFactor,demandFactor,
      competitionLevel:competition.level,competitionConfidence:competition.confidence,
      competitionIntensity:competition.intensity,effectiveCompetition:competition.effectiveCompetition,
      competitionDataAvailable:competition.dataAvailable,competitionIsPending:competition.isPending,
      competitionUncertainty:competition.uncertainty,
      competitionBudgetFactor:competition.competitionBudgetFactor,
      competitionDemandFactor:competition.competitionDemandFactor,
      uncertaintyBudgetFactor:competition.uncertaintyBudgetFactor,
      uncertaintyDemandFactor:competition.uncertaintyDemandFactor
    };
  }
  function advertisingPackageForPopulation(population){
    const p=n(population);
    // Updated commercial tiers:
    // up to 10,000 residents — no starter advertising package;
    // 10,001–30,000 residents — R$ 5,000 starter advertising package.
    if(p<=10000)return 0;
    if(p<=30000)return 5000;
    if(p<50000)return 12500;
    if(p<=100000)return 20000;
    return 30000;
  }
  const marketingBudgetAnchors=[
    {population:5000,budget:17500},
    {population:10000,budget:25000},
    {population:20000,budget:32500},
    {population:30000,budget:47500},
    {population:50000,budget:72500},
    {population:75000,budget:100000},
    {population:100000,budget:125000},
    {population:150000,budget:150000}
  ];
  function interpolateAnchors(value,anchors,valueKey){
    const x=Math.max(0,n(value));
    if(x<=anchors[0].population)return anchors[0][valueKey];
    for(let i=1;i<anchors.length;i++){
      const left=anchors[i-1],right=anchors[i];
      if(x<=right.population){
        const ratio=(x-left.population)/(right.population-left.population);
        return left[valueKey]+(right[valueKey]-left[valueKey])*ratio;
      }
    }
    const last=anchors[anchors.length-1],previous=anchors[anchors.length-2];
    const slope=(last[valueKey]-previous[valueKey])/(last.population-previous.population);
    return last[valueKey]+(x-last.population)*slope;
  }
  function annualMarketingBudgetForPopulation(population,marketProfile={}){
    // Population defines the base scale. GDP per capita and population density
    // apply a capped local correction so adjacent cities remain comparable.
    const baseBudget=interpolateAnchors(population,marketingBudgetAnchors,'budget');
    const market=cityMarketFactors(marketProfile);
    return roundTo(baseBudget*market.budgetFactor,500);
  }
  function recommendedAverageFareForPopulation(_population){return 12}
  // Simulation guardrail. This is not a commercial tariff rule: it prevents an
  // unrealistically high average fare from mechanically inflating projected ROI.
  const MAX_AVERAGE_FARE=30;
  const MIN_DRIVER_COMMISSION=10;
  const RECOMMENDED_DRIVER_COMMISSION=15;
  const MAX_DRIVER_COMMISSION=20;
  function recommendedCommissionForPopulation(_population){return RECOMMENDED_DRIVER_COMMISSION}

  // Municipalities whose standalone recommended scenario does not recover the
  // launch investment within 12 months use a regional micro-market model.
  // The selected municipality remains visible as the contractual city, while
  // demand is calculated for a minimum service area of 5,000 residents. The
  // service area can include nearby/satellite municipalities and is editable
  // when the user disables recommended values.
  const MICRO_CITY_MAX_POPULATION=4182;
  const MICRO_CITY_MIN_SERVICE_AREA_POPULATION=5000;
  function isMicroCityPopulation(population){
    const p=n(population);
    return p>0&&p<=MICRO_CITY_MAX_POPULATION;
  }
  function recommendedServiceAreaPopulation(population){
    const p=Math.max(0,n(population));
    return isMicroCityPopulation(p)?Math.max(MICRO_CITY_MIN_SERVICE_AREA_POPULATION,p):p;
  }

  // Reference demand potential is independent from profitability and payback.
  // Smaller cities can reach a higher daily penetration rate; larger cities use a
  // more conservative rate so demand does not grow linearly without limit.
  const demandTargetAnchors=[
    {population:5000,ridesPerDay:95},
    {population:10000,ridesPerDay:190},
    {population:20000,ridesPerDay:380},
    {population:30000,ridesPerDay:570},
    {population:50000,ridesPerDay:850},
    {population:75000,ridesPerDay:1050},
    {population:100000,ridesPerDay:1250},
    {population:150000,ridesPerDay:1650}
  ];
  function recommendedDailyDemandRateForPopulation(population,marketProfile={}){
    // Projected market capacity remains population-led. A limited socioeconomic
    // correction reflects relative purchasing power and concentration of demand.
    const p=Math.max(1,n(population));
    const baseTarget=interpolateAnchors(p,demandTargetAnchors,'ridesPerDay');
    const target=baseTarget*cityMarketFactors(marketProfile).demandFactor;
    return target/p*100;
  }


  // Below the recommended budget, underinvestment has a stronger-than-linear
  // impact. Above the recommendation, additional spend has diminishing returns.
  function investmentDemandFactor(annualBudget,population,marketProfile={}){
    const recommended=annualMarketingBudgetForPopulation(population,marketProfile);
    const budget=Math.max(0,n(annualBudget));
    if(recommended<=0)return budget>0?1:0;
    const ratio=budget/recommended;
    if(ratio<=0)return 0;
    if(ratio<=1)return Math.pow(ratio,1.35);
    return Math.min(1.25,1+Math.sqrt(ratio-1)*0.18);
  }

  // A higher fare increases revenue per ride but reduces demand. A lower fare can
  // improve demand only modestly because price alone cannot create the market.
  function fareDemandFactor(averageFare,population){
    const recommended=recommendedAverageFareForPopulation(population);
    const fare=clamp(Math.max(0.01,n(averageFare)),0.01,MAX_AVERAGE_FARE);
    if(recommended<=0)return 1;
    const ratio=fare/recommended;
    // Above the reference fare demand declines progressively instead of stopping
    // at a high fixed floor. This prevents extreme prices from creating artificial
    // profit while preserving a smooth response around the recommended value.
    if(ratio>=1)return Math.max(0.02,Math.exp(-1.15*Math.pow(ratio-1,1.15)));
    return Math.min(1.1,1+0.3*(1-ratio));
  }

  // Driver commission affects supply and therefore the share of demand that can
  // actually be fulfilled. 15% is the balanced reference. A lower commission can
  // support driver supply modestly, while values above 15% are treated as a
  // progressively riskier scenario because driver attractiveness falls faster than
  // the extra commission per completed ride can compensate.
  function commissionFulfillmentFactor(commission,population){
    const recommended=recommendedCommissionForPopulation(population);
    const value=clamp(n(commission),MIN_DRIVER_COMMISSION,MAX_DRIVER_COMMISSION);
    const diff=value-recommended;
    if(diff>0)return Math.max(0.5,1-0.065*diff);
    return Math.min(1.1,1+0.01*Math.abs(diff));
  }
  function marketingSharesForPopulation(population){
    const p=n(population);
    return p<20000 ? [10,10,10,9,9,8,8,8,7,7,7,7] : [14,13,12,10,9,8,7,6,6,5,5,5];
  }
  function monthlyMarketingBudgets(annualBudget,population){
    const annual=Math.max(0,n(annualBudget));
    const shares=marketingSharesForPopulation(population);
    if(annual<=0)return shares.map(()=>0);
    const raw=shares.map(share=>annual*share/100);
    // Start from R$100 floors so rounded monthly values can never overshoot the
    // annual total and force a negative balancing amount in month 12.
    const budgets=raw.map(value=>Math.floor(value/100)*100);
    let remaining=annual-budgets.reduce((sum,value)=>sum+value,0);
    const order=raw.map((value,index)=>({index,remainder:value-budgets[index]}))
      .sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
    let cursor=0;
    while(remaining>=100-1e-9){
      budgets[order[cursor%order.length].index]+=100;
      remaining-=100;
      cursor++;
    }
    if(remaining>1e-9)budgets[order[cursor%order.length].index]+=remaining;
    return budgets.map(value=>Math.max(0,value));
  }
  function defaultExpenseRows(monthly=10000){return[{id:'assistente',name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'},{id:'other_costs',name:'Other Costs',amount:0,removable:false,showInModel:false,hidden:true}]}
  function normPctArray(arr,fallback){
    const src=Array.isArray(arr)&&arr.length===12?arr:fallback;
    return src.map(v=>Math.max(0,n(v)));
  }
  function normalizeAssumptions(input={}){
    const a={...defaultAssumptions(),...input};
    delete a.adminCost;
    delete a.activeUsers;
    if(!Array.isArray(a.expenseRows)||!a.expenseRows.length){a.expenseRows=defaultExpenseRows(a.otherCost||a.operatingExpenses||10000)}
    a.expenseRows=a.expenseRows.map((r,i)=>({
      id:r.id||uid(),
      name:String(r.name||`Expense ${i+1}`),
      amount:r.id==='other_costs'?0:n(r.amount),
      showInModel:r.id==='assistente'?true:(r.id==='other_costs'?false:r.showInModel!==false),
      removable:r.id==='assistente'?false:r.removable!==false,
      hidden:r.id==='other_costs'?true:!!r.hidden,
      fixedType:r.id==='assistente'?'assistant':(r.fixedType||null)
    }));
    if(!a.expenseRows.some(r=>r.id==='assistente')){a.expenseRows.unshift({id:'assistente',name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'})} 
    a.expenseRows=a.expenseRows.map(r=>r.id==='assistente'?{...r,name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'}:(r.id==='other_costs'?{...r,name:'Other Costs',amount:0,showInModel:false,hidden:true}:r));
    const cityPopulation=Math.max(0,n(a.population));
    a.population=cityPopulation;
    a.areaKm2=Math.max(0,n(a.areaKm2));
    a.censusPopulation2022=Math.max(0,n(a.censusPopulation2022));
    a.density=Math.max(0,n(a.density));
    a.schoolEnrollment=Math.max(0,n(a.schoolEnrollment));
    a.idhm=Math.max(0,n(a.idhm));
    a.gdpPerCapita=Math.max(0,n(a.gdpPerCapita));
    a.stateMedianDensity=Math.max(0,n(a.stateMedianDensity));
    a.stateMedianGdpPerCapita=Math.max(0,n(a.stateMedianGdpPerCapita));
    a.stateMedianIdhm=Math.max(0,n(a.stateMedianIdhm));
    a.competitionLevel=String(a.competitionLevel||'Pending');
    a.competitionConfidence=clamp(n(a.competitionConfidence),0,100);
    a.marketFactors=cityMarketFactors(a);
    a.isMicroCityRegionalModel=isMicroCityPopulation(cityPopulation);
    a.recommendedServiceAreaPopulation=recommendedServiceAreaPopulation(cityPopulation);
    a.useRecommendedValues=a.useRecommendedValues!==false;
    if(a.useRecommendedValues){
      a.serviceAreaPopulation=a.recommendedServiceAreaPopulation;
    }else{
      const customServiceArea=n(a.serviceAreaPopulation)||cityPopulation;
      a.serviceAreaPopulation=Math.max(cityPopulation,customServiceArea);
    }
    a.modelPopulation=a.isMicroCityRegionalModel?a.serviceAreaPopulation:cityPopulation;
    a.usesRegionalServiceArea=a.isMicroCityRegionalModel&&a.serviceAreaPopulation>cityPopulation;
    const recommendedBudget=annualMarketingBudgetForPopulation(a.modelPopulation,a);
    const recommendedFare=recommendedAverageFareForPopulation(a.modelPopulation);
    const recommendedCommission=recommendedCommissionForPopulation(a.modelPopulation);
    if(a.useRecommendedValues){
      a.marketingBudget=recommendedBudget;
      a.averageFare=recommendedFare;
      a.commission=recommendedCommission;
    }else{
      a.marketingBudget=Math.max(0,n(a.marketingBudget));
      a.averageFare=clamp(Math.max(0.01,n(a.averageFare)||recommendedFare),0.01,MAX_AVERAGE_FARE);
      const customCommission=Number(a.commission);
      a.commission=clamp(Number.isFinite(customCommission)?customCommission:recommendedCommission,MIN_DRIVER_COMMISSION,MAX_DRIVER_COMMISSION);
    }
    a.recommendedMarketingBudget=recommendedBudget;
    a.recommendedAverageFare=recommendedFare;
    a.recommendedCommission=recommendedCommission;
    a.advertisingPackage=advertisingPackageForPopulation(a.modelPopulation);
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=marketingSharesForPopulation(a.modelPopulation);
    a.ridesDistributionPreset=a.ridesDistributionPreset||'balanced';
    a.ridesDistribution=normPctArray(a.ridesDistribution,ridesPresets[a.ridesDistributionPreset]||ridesPresets.balanced);
    a.percentagePopulationUsingService=recommendedDailyDemandRateForPopulation(a.modelPopulation,a);
    a.autoPopulationUsingService=false;
    a.revenueRules=defaultRevenueRules();
    return a;
  }
  function defaultRevenueRules(){return[
    {id:'rr_0',threshold:0,maximShare:0,removable:false},
    {id:'rr_3000',threshold:3000,maximShare:10,removable:false},
    {id:'rr_5000',threshold:5000,maximShare:15,removable:false},
    {id:'rr_7000',threshold:7000,maximShare:20,removable:false},
    {id:'rr_9000',threshold:9000,maximShare:25,removable:false},
    {id:'rr_11000',threshold:11000,maximShare:30,removable:false}
  ]}
  function technologyFeeShareForGrossRevenue(grossRevenue){
    const value=Math.max(0,n(grossRevenue));
    if(value<=3000)return 0;
    if(value<=5000)return 10;
    if(value<=7000)return 15;
    if(value<=9000)return 20;
    if(value<=11000)return 25;
    return 30;
  }
  function assistantFeeForGrossRevenue(grossRevenue){
    return Math.max(0,n(grossRevenue))<=3000?250:500;
  }
  const SMS_COST_PER_MESSAGE=0.10;
  const SMS_RIDES_PER_MESSAGE=14;
  const SMS_FREE_GROSS_REVENUE_THRESHOLD=3000;
  function smsExpenseForMonth(ridesPerMonth,grossRevenue){
    const rides=Math.max(0,n(ridesPerMonth));
    const revenue=Math.max(0,n(grossRevenue));
    // Commercial rule used by this projection: while monthly gross revenue does
    // not exceed R$ 3,000, SMS are free. Above that level the estimated SMS
    // volume is 1 message per 14 completed rides, at R$ 0.10 per message.
    if(revenue<=SMS_FREE_GROSS_REVENUE_THRESHOLD||rides<=0)return 0;
    const estimatedMessages=rides/SMS_RIDES_PER_MESSAGE;
    return Math.round(estimatedMessages*SMS_COST_PER_MESSAGE*100)/100;
  }
  function defaultAssumptions(type='base'){
    const presets={
      conservative:{population:100000,averageFare:18,commission:10,rideGrowth:10,marketingBudget:25000,initialInvestment:8000,operatingExpenses:1500,percentagePopulationUsingService:1,useRecommendedValues:true,expenseRows:defaultExpenseRows(1500),marketingDistributionPreset:'balanced',marketingDistribution:clone(marketingPresets.balanced),ridesDistributionPreset:'slow',ridesDistribution:clone(ridesPresets.slow)},
      base:{population:100000,averageFare:20,commission:10,rideGrowth:18,marketingBudget:30000,initialInvestment:10000,operatingExpenses:1500,percentagePopulationUsingService:1,useRecommendedValues:true,expenseRows:defaultExpenseRows(1500),marketingDistributionPreset:'balanced',marketingDistribution:clone(marketingPresets.balanced),ridesDistributionPreset:'balanced',ridesDistribution:clone(ridesPresets.balanced)},
      optimistic:{population:100000,averageFare:24,commission:12,rideGrowth:25,marketingBudget:40000,initialInvestment:12000,operatingExpenses:2000,percentagePopulationUsingService:2,useRecommendedValues:true,expenseRows:defaultExpenseRows(2000),marketingDistributionPreset:'growth',marketingDistribution:clone(marketingPresets.growth),ridesDistributionPreset:'aggressive',ridesDistribution:clone(ridesPresets.aggressive)}
    };
    return clone(presets[type]||presets.base)
  }
  function calculateCore(assumptions){
    const a=normalizeAssumptions(assumptions);
    const months=[];let accumulated=0;
    const demandPopulation=Math.max(0,n(a.modelPopulation||a.population));
    const marketFactors=cityMarketFactors(a);
    const basePopulationTargetRidesDay=Math.round(interpolateAnchors(demandPopulation,demandTargetAnchors,'ridesPerDay'));
    const baseDemandRate=recommendedDailyDemandRateForPopulation(demandPopulation,a);
    const baseTargetRidesDay=Math.round(demandPopulation*baseDemandRate/100);
    const budgetDemandFactor=investmentDemandFactor(a.marketingBudget,demandPopulation,a);
    const fareFactor=fareDemandFactor(a.averageFare,demandPopulation);
    const commissionFactor=commissionFulfillmentFactor(a.commission,demandPopulation);
    const combinedDemandFactor=budgetDemandFactor*fareFactor*commissionFactor;
    const targetRidesDay=Math.max(0,Math.round(baseTargetRidesDay*combinedDemandFactor));
    const autoMarketingBudgets=monthlyMarketingBudgets(a.marketingBudget,demandPopulation);
    for(let i=0;i<14;i++){
      const isSetup=i===0,isPrep=i===1,monthNo=i-1;
      const mIndex=i-2;
      const marketingInvestment=i>1?autoMarketingBudgets[mIndex]:0;
      const investment=isSetup?n(a.initialInvestment):marketingInvestment;
      const competitionRamp=i>1?competitionRampFactor(a,mIndex):1;
      const ridesPerDay=i>1?Math.round(targetRidesDay*n(a.ridesDistribution[mIndex])/100*competitionRamp):0;
      const ridesPerMonth=i>1?Math.round(ridesPerDay*30):0;
      const gross=ridesPerMonth*n(a.averageFare);
      const commissionFromRides=gross*n(a.commission)/100;
      const maximShare=technologyFeeShareForGrossRevenue(commissionFromRides);
      const maximRevenue=commissionFromRides*maximShare/100;
      const partner=commissionFromRides-maximRevenue;
      const fixedExpenses={};
      let fixedExpenseTotal=0;
      if(i>1){
        a.expenseRows.filter(r=>r.showInModel!==false).forEach(r=>{const val=r.fixedType==='assistant'? assistantFeeForGrossRevenue(commissionFromRides) : Math.round(n(r.amount));fixedExpenses[r.id]=val;fixedExpenseTotal+=val});
      }
      const assistantExpense=fixedExpenses.assistente||0;
      const smsEstimatedMessages=i>1?ridesPerMonth/SMS_RIDES_PER_MESSAGE:0;
      const smsExpense=i>1?smsExpenseForMonth(ridesPerMonth,commissionFromRides):0;
      // Operating expenses are the Assistant service, SMS notifications when
      // chargeable, and the service technology fee. Marketing remains classified
      // only as an investment.
      const opEx=i>1?assistantExpense+smsExpense+maximRevenue:0;
      // The initial license fee is a pre-opening cash outflow. It must not be
      // charged again inside month 1. Monthly net profit therefore reflects only
      // revenue, that month's marketing investment and operating expenses.
      const netProfit=i>1?(commissionFromRides-marketingInvestment-opEx):0;
      const preOpeningCashFlow=isSetup?-n(a.initialInvestment):0;
      const netCashFlow=i>1?netProfit:preOpeningCashFlow;
      accumulated+=netCashFlow;
      const margin=commissionFromRides?netProfit/commissionFromRides*100:0;
      months.push({key:monthKeys[i],index:i,monthNo,isSetup,isPrep,marketingPct:i>1?n(a.marketingDistribution[mIndex]):0,ridesPct:i>1?n(a.ridesDistribution[mIndex]):0,targetRidesDay,competitionRampFactor:competitionRamp,investment,initialPurchase:isSetup?investment:0,marketingInvestment,ridesPerDay,ridesPerMonth,averageFare:n(a.averageFare),gross,commission:n(a.commission),commissionFromRides,grossRevenue:commissionFromRides,maximShare,revenue:maximRevenue,maximRevenue,technologyFee:maximRevenue,partnerShare:100-maximShare,partner,marketingExpense:marketingInvestment,assistantExpense,smsEstimatedMessages,smsExpense,fixedExpenses,opEx,netProfit,margin,netCashFlow,accumulated})
    }
    const yearMonths=months.slice(2);
    const initialPayment=n(a.initialInvestment);
    const totalMarketingInvestment=yearMonths.reduce((s,x)=>s+x.marketingInvestment,0);
    const totalAssistantExpense=yearMonths.reduce((s,x)=>s+(x.fixedExpenses?.assistente||0),0);
    const totalSmsExpense=yearMonths.reduce((s,x)=>s+x.smsExpense,0);
    const totalTechnologyFee=yearMonths.reduce((s,x)=>s+x.maximRevenue,0);
    // Projected total investment contains only the initial license fee and the
    // annual marketing and development budget.
    const totalInvestment=initialPayment+totalMarketingInvestment;
    const totalCommissionFromRides=yearMonths.reduce((s,x)=>s+x.commissionFromRides,0);
    const totalGrossRevenue=totalCommissionFromRides;
    // Kept as compatibility aliases for older UI code and saved scenarios.
    const totalRevenue=totalTechnologyFee;
    const totalPartnerRevenue=totalGrossRevenue;
    const totalOperatingExpenses=totalAssistantExpense+totalSmsExpense+totalTechnologyFee;
    const totalExpenses=totalOperatingExpenses;
    const averageMonthlyInvestment=totalMarketingInvestment/12;
    const netProfit=totalGrossRevenue-totalInvestment-totalOperatingExpenses;
    const roi=totalInvestment?netProfit/totalInvestment*100:0;
    const breakEven=months.find(x=>x.index>1&&x.netProfit>=0);
    const payback=months.find(x=>x.index>1&&x.accumulated>=0);
    return{assumptions:a,months,summary:{initialPayment,totalMarketingInvestment,totalAssistantExpense,totalSmsExpense,totalTechnologyFee,totalInvestment,totalRevenue,totalPartnerRevenue,totalGrossRevenue,totalCommissionFromRides,totalOperatingExpenses,totalExpenses,averageMonthlyInvestment,netProfit,roi,breakEvenPeriod:breakEven?breakEven.monthNo:null,breakEvenKey:breakEven?breakEven.key:null,paybackPeriod:payback?payback.monthNo:null,paybackKey:payback?payback.key:null,targetRidesDay,baseTargetRidesDay,baseDemandRate,budgetDemandFactor,fareDemandFactor:fareFactor,commissionFulfillmentFactor:commissionFactor,combinedDemandFactor,recommendedMarketingBudget:a.recommendedMarketingBudget,basePopulationMarketingBudget:roundTo(interpolateAnchors(demandPopulation,marketingBudgetAnchors,'budget'),500),cityPopulation:a.population,serviceAreaPopulation:a.serviceAreaPopulation,modelPopulation:demandPopulation,isMicroCityRegionalModel:a.isMicroCityRegionalModel,usesRegionalServiceArea:a.usesRegionalServiceArea,basePopulationTargetRidesDay,marketDataAvailable:marketFactors.hasEconomicData||marketFactors.hasDensityData,marketEconomicDataAvailable:marketFactors.hasEconomicData,marketDensityDataAvailable:marketFactors.hasDensityData,economicRatio:marketFactors.economicRatio,densityRatio:marketFactors.densityRatio,marketBudgetFactor:marketFactors.budgetFactor,marketDemandFactor:marketFactors.demandFactor,socioeconomicBudgetFactor:marketFactors.socioeconomicBudgetFactor,socioeconomicDemandFactor:marketFactors.socioeconomicDemandFactor,competitionLevel:marketFactors.competitionLevel,competitionConfidence:marketFactors.competitionConfidence,competitionIntensity:marketFactors.competitionIntensity,effectiveCompetition:marketFactors.effectiveCompetition,competitionDataAvailable:marketFactors.competitionDataAvailable,competitionIsPending:marketFactors.competitionIsPending,competitionUncertainty:marketFactors.competitionUncertainty,competitionBudgetFactor:marketFactors.competitionBudgetFactor,competitionDemandFactor:marketFactors.competitionDemandFactor,uncertaintyBudgetFactor:marketFactors.uncertaintyBudgetFactor,uncertaintyDemandFactor:marketFactors.uncertaintyDemandFactor,competitionMonth1RampFactor:competitionRampFactor(a,0),areaKm2:a.areaKm2,density:a.density,gdpPerCapita:a.gdpPerCapita,idhm:a.idhm,schoolEnrollment:a.schoolEnrollment}}
  }
  function calculate(assumptions){
    return calculateCore(normalizeAssumptions(assumptions));
  }
  function formatMoney(v,compact=false){
    const value=n(v);
    const abs=Math.abs(value);
    const sign=value<0?'-':'';
    if(compact&&abs>=1000000){
      const scaled=abs/1000000;
      const digits=scaled>=10||Number.isInteger(scaled)?0:1;
      return sign+scaled.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:digits})+' mi';
    }
    if(compact&&abs>=1000){
      const scaled=abs/1000;
      const digits=scaled>=100||Number.isInteger(scaled)?0:1;
      return sign+scaled.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:digits})+' mil';
    }
    return sign+Math.round(abs).toLocaleString('pt-BR');
  }
  function formatCurrencyFull(v){return `${n(v)<0?'-':''}R$ ${formatMoney(Math.abs(n(v)),false)}`}
  function formatCurrencyCompact(v){return `${n(v)<0?'-':''}R$ ${formatMoney(Math.abs(n(v)),true)}`}
  function formatPercent(v){return `${Math.round(v)}%`}
  function createExpenseRow(name='New Expense',amount=0){return{id:uid(),name,amount,removable:true,showInModel:true}}
  function createRevenueRule(threshold=0,maximShare=100){return{id:uid(),threshold, maximShare, removable:true}}
  function applyPreset(assumptions,type,preset){
    const a=normalizeAssumptions(assumptions);
    if(type==='marketing'&&marketingPresets[preset]){a.marketingDistributionPreset=preset;a.marketingDistribution=clone(marketingPresets[preset])}
    if(type==='rides'&&ridesPresets[preset]){a.ridesDistributionPreset=preset;a.ridesDistribution=clone(ridesPresets[preset])}
    return a;
  }
  return{calculate,defaultAssumptions,normalizeAssumptions,createExpenseRow,createRevenueRule,formatMoney,formatCurrencyFull,formatCurrencyCompact,formatPercent,monthKeys,marketingPresets,ridesPresets,applyPreset,advertisingPackageForPopulation,annualMarketingBudgetForPopulation,marketingBudgetAnchors,recommendedAverageFareForPopulation,recommendedCommissionForPopulation,recommendedDailyDemandRateForPopulation,demandTargetAnchors,investmentDemandFactor,fareDemandFactor,commissionFulfillmentFactor,marketingSharesForPopulation,monthlyMarketingBudgets,cityMarketFactors,competitionFactors,competitionRampFactor,isMicroCityPopulation,recommendedServiceAreaPopulation,MICRO_CITY_MAX_POPULATION,MICRO_CITY_MIN_SERVICE_AREA_POPULATION,MIN_DRIVER_COMMISSION,RECOMMENDED_DRIVER_COMMISSION,MAX_DRIVER_COMMISSION,MAX_AVERAGE_FARE,technologyFeeShareForGrossRevenue,assistantFeeForGrossRevenue,smsExpenseForMonth,SMS_COST_PER_MESSAGE,SMS_RIDES_PER_MESSAGE,SMS_FREE_GROSS_REVENUE_THRESHOLD}
})();
