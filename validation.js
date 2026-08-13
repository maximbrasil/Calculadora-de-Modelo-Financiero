'use strict';
const Validation=(()=>{
  const rules={
    population:v=>v>0||'validationPopulation',
    averageFare:v=>v>0&&v<=30||'validationFare',
    commission:v=>v>=10&&v<=20||'validationCommission',
    marketingBudget:v=>v>=0||'validationMarketing',
    initialInvestment:v=>v>=0||'validationInvestment'
  };
  function validateAssumptions(a){
    const errors={};
    Object.entries(rules).forEach(([key,rule])=>{
      const value=Number(a[key]);
      const result=rule(value);
      if(result!==true||Number.isNaN(value))errors[key]=Localization.t(result===true?'validationFare':result);
    });
    return{valid:Object.keys(errors).length===0,errors};
  }
  return{validateAssumptions};
})();
