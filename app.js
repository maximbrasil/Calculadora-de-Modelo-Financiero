'use strict';
const App=(()=>{
  let state, model, errors={}, undo=[], redo=[];
  let mobileChart=null;
  let mobileStickyCtaObserver=null;
  let startFilterState='', startFilterCityId='';

  const cities=()=>Array.isArray(window.CityData)?window.CityData:CityData;
  const cityById=id=>cities().find(c=>c.id===id)||null;
  const states=()=>[...new Set(cities().map(c=>c.state))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const fmtNumber=v=>Math.round(Number(v)||0).toLocaleString('pt-BR');
  const fmtBRL=v=>FinancialEngine.formatCurrencyFull(v);
  const fmtBRLCompact=v=>FinancialEngine.formatCurrencyCompact(v);

  function hydrate(){
    const saved=Storage.load();
    state=saved&&saved.scenarios ? saved : {language:'pt-BR',currency:'BRL',advanced:false,activeScenarioId:'base',selectedCityId:null,scenarios:ScenarioManager.builtIns()};
    state.currency='BRL';
    state.advanced=false;
    // Small App Brazil uses one reference scenario; payback is calculated from demand rather than targeted.
    const baseScenario=(ScenarioManager.builtIns().find(s=>s.id==='base')||ScenarioManager.builtIns()[0]);
    const savedBase=(state.scenarios||[]).find(s=>s.id==='base');
    if(savedBase&&savedBase.assumptions){
      baseScenario.assumptions={...baseScenario.assumptions,...savedBase.assumptions,autoPopulationUsingService:false};
      baseScenario.notes=savedBase.notes||'';
    }
    state.scenarios=[baseScenario];
    state.activeScenarioId='base';
    if(!['pt-BR','en'].includes(state.language))state.language='pt-BR';
    // The city selector must always start empty on a fresh app open.
    // Language and scenarios can persist, but the user explicitly chooses the city each time.
    state.selectedCityId=null;
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    state.activeScenarioId=state.activeScenario.id;
    startFilterState='';
    startFilterCityId='';
  }
  function snapshot(){return JSON.stringify({language:state.language,currency:'BRL',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}
  function pushUndo(){undo.push(snapshot());if(undo.length>100)undo.shift();redo=[]}
  function restore(snap){const parsed=JSON.parse(snap);state={...parsed,currency:'BRL'};state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];recalc()}
  function persist(){Storage.save({language:state.language,currency:'BRL',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}

  function applySelectedCity(city){
    if(!city)return;
    const initialInvestment=Number(city.initialPayment)||0;
    state.selectedCityId=city.id;
    state.selectedCitySnapshot={id:city.id,state:city.state,city:city.city,population:Number(city.population)||0,initialPayment:initialInvestment};
    const population=Number(city.population)||0;
    const recommendedBudget=FinancialEngine.annualMarketingBudgetForPopulation(population);
    state.activeScenario.assumptions.population=population;
    state.activeScenario.assumptions.initialInvestment=initialInvestment;
    state.activeScenario.assumptions.useRecommendedValues=true;
    state.activeScenario.assumptions.averageFare=FinancialEngine.recommendedAverageFareForPopulation(population);
    state.activeScenario.assumptions.commission=FinancialEngine.recommendedCommissionForPopulation(population);
    state.activeScenario.assumptions.advertisingPackage=FinancialEngine.advertisingPackageForPopulation(population);
    state.activeScenario.assumptions.marketingBudget=recommendedBudget;
    state.activeScenario.assumptions.marketingDistributionPreset='auto';
    state.activeScenario.assumptions.marketingDistribution=FinancialEngine.marketingSharesForPopulation(population);
    state.activeScenario.assumptions.autoPopulationUsingService=false;
    startFilterState=city.state;
    startFilterCityId=city.id;
  }

  let parametersReturnFocus=null;

  function getRecommendedParameters(){
    const population=Number(state.activeScenario?.assumptions?.population)||Number(cityById(state.selectedCityId)?.population)||0;
    return {
      marketingBudget:FinancialEngine.annualMarketingBudgetForPopulation(population),
      averageFare:FinancialEngine.recommendedAverageFareForPopulation(population),
      commission:FinancialEngine.recommendedCommissionForPopulation(population)
    };
  }

  function setParametersFieldsDisabled(disabled){
    const fields=document.getElementById('parametersFields');
    if(fields)fields.classList.toggle('is-disabled',disabled);
    ['annualInvestmentBudgetInput','averageFareParameterInput','driverCommissionParameterInput'].forEach(id=>{
      const input=document.getElementById(id);
      if(input)input.disabled=disabled;
    });
  }

  function setParameterInputs(values){
    const budget=document.getElementById('annualInvestmentBudgetInput');
    const fare=document.getElementById('averageFareParameterInput');
    const commission=document.getElementById('driverCommissionParameterInput');
    if(budget)budget.value=String(Math.max(0,Number(values.marketingBudget)||0));
    if(fare)fare.value=String(Math.max(0,Number(values.averageFare)||0));
    if(commission)commission.value=String(Math.max(0,Number(values.commission)||0));
  }

  function readParameterInputs(){
    return {
      marketingBudget:Number(document.getElementById('annualInvestmentBudgetInput')?.value),
      averageFare:Number(document.getElementById('averageFareParameterInput')?.value),
      commission:Number(document.getElementById('driverCommissionParameterInput')?.value)
    };
  }

  function updateBudgetAssessment(){
    const el=document.getElementById('investmentBudgetAssessment');
    if(!el)return;
    const recommended=getRecommendedParameters().marketingBudget;
    const budget=Math.max(0,Number(document.getElementById('annualInvestmentBudgetInput')?.value)||0);
    const ratio=recommended>0?budget/recommended:0;
    let key='budgetAssessmentRecommended',tone='recommended';
    if(budget===0){key='budgetAssessmentZero';tone='critical';}
    else if(ratio<0.3){key='budgetAssessmentCritical';tone='critical';}
    else if(ratio<0.7){key='budgetAssessmentBelow';tone='warning';}
    else if(ratio<1){key='budgetAssessmentWorking';tone='working';}
    else if(ratio<=1.3){key='budgetAssessmentRecommended';tone='recommended';}
    else {key='budgetAssessmentDiminishing';tone='neutral';}
    el.className=`parameter-assessment is-${tone}`;
    el.textContent=Localization.t(key,{percent:Math.round(ratio*100),recommended:fmtBRL(recommended)});
  }

  function renderParameterButtonLabels(){
    const label=Localization.t('parameters');
    ['parametersBtn','mobileParametersBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=label;button.setAttribute('aria-label',label);}
    });
    const cityLabel=Localization.t('changeCity');
    ['changeCityBtn','mobileChangeCityBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=cityLabel;button.setAttribute('aria-label',cityLabel);}
    });
  }

  function openParametersModal(trigger){
    if(!cityById(state.selectedCityId))return;
    const modal=document.getElementById('parametersModal');
    const checkbox=document.getElementById('recommendedValuesCheckbox');
    const validation=document.getElementById('parametersValidation');
    if(!modal||!checkbox)return;
    parametersReturnFocus=trigger||document.activeElement;
    const current=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const recommended=getRecommendedParameters();
    const useRecommended=current.useRecommendedValues!==false;
    checkbox.checked=useRecommended;
    modal.dataset.customBudget=String(current.marketingBudget);
    modal.dataset.customFare=String(current.averageFare);
    modal.dataset.customCommission=String(current.commission);
    setParameterInputs(useRecommended?recommended:current);
    setParametersFieldsDisabled(useRecommended);
    updateBudgetAssessment();
    if(validation){validation.hidden=true;validation.textContent='';}
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('parameters-modal-open');
    setTimeout(()=>{(useRecommended?checkbox:document.getElementById('annualInvestmentBudgetInput'))?.focus();},0);
  }

  function closeParametersModal(){
    const modal=document.getElementById('parametersModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('parameters-modal-open');
    const focusTarget=parametersReturnFocus;
    parametersReturnFocus=null;
    setTimeout(()=>focusTarget?.focus?.(),0);
  }

  function toggleRecommendedDraft(checked){
    const modal=document.getElementById('parametersModal');
    if(!modal)return;
    if(checked){
      const current=readParameterInputs();
      if(Number.isFinite(current.marketingBudget))modal.dataset.customBudget=String(current.marketingBudget);
      if(Number.isFinite(current.averageFare))modal.dataset.customFare=String(current.averageFare);
      if(Number.isFinite(current.commission))modal.dataset.customCommission=String(current.commission);
      setParameterInputs(getRecommendedParameters());
    }else{
      setParameterInputs({
        marketingBudget:Number(modal.dataset.customBudget),
        averageFare:Number(modal.dataset.customFare),
        commission:Number(modal.dataset.customCommission)
      });
    }
    setParametersFieldsDisabled(checked);
    updateBudgetAssessment();
  }

  function confirmParameters(){
    const checkbox=document.getElementById('recommendedValuesCheckbox');
    const validation=document.getElementById('parametersValidation');
    if(!checkbox)return;
    const useRecommended=checkbox.checked;
    const values=useRecommended?getRecommendedParameters():readParameterInputs();
    let message='';
    if(!Number.isFinite(values.marketingBudget)||values.marketingBudget<0)message=Localization.t('validationAnnualBudget');
    else if(!Number.isFinite(values.averageFare)||values.averageFare<=0)message=Localization.t('validationFare');
    else if(!Number.isFinite(values.commission)||values.commission<0||values.commission>50)message=Localization.t('validationCommission');
    if(message){
      if(validation){validation.textContent=message;validation.hidden=false;}
      return;
    }
    pushUndo();
    const a=state.activeScenario.assumptions;
    a.useRecommendedValues=useRecommended;
    a.marketingBudget=values.marketingBudget;
    a.averageFare=values.averageFare;
    a.commission=values.commission;
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=FinancialEngine.marketingSharesForPopulation(a.population);
    closeParametersModal();
    recalc();
  }

  function setScreen(){
    const hasCity=!!cityById(state.selectedCityId);
    document.body.classList.toggle('city-start-mode',!hasCity);
    document.getElementById('startScreen').hidden=hasCity;
    document.getElementById('dashboard').hidden=!hasCity;
    document.querySelector('.topbar').hidden=!hasCity;
    if(!hasCity){delete document.body.dataset.mobileSlide; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='start';}
    else if(isMobileLayout()&&!document.body.dataset.mobileSlide){document.body.dataset.mobileSlide='kpi'; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='kpi';}
  }

  function renderSelectedCityBanner(){
    const box=document.getElementById('selectedCityBanner');
    const topbar=document.getElementById('topbarCityMeta');
    const c=cityById(state.selectedCityId);
    const effectiveInvestment=state.activeScenario?.assumptions?.initialInvestment??c?.initialPayment??0;
    const html=c ? `<div class="city-chip"><strong>${Localization.t('selectedCity')}:</strong> ${c.city}, ${c.state}</div><div class="city-chip"><strong>${Localization.t('populationHeader')}:</strong> ${fmtNumber(c.population)}</div><div class="city-chip"><strong>${Localization.t('initialPaymentHeader')}:</strong> ${fmtBRL(effectiveInvestment)}</div>` : '';
    if(box) box.innerHTML=html;
    if(topbar) topbar.innerHTML='';
  }

  function renderStartScreen(){
    Localization.setLanguage(state.language);
    const lang1=document.getElementById('startLanguageSelect');
    if(lang1)lang1.value=state.language;
    const lang2=document.getElementById('mobileLanguageSelect');
    if(lang2)lang2.value=state.language;
    const flag=document.getElementById('startLangFlag');
    if(flag)flag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    const startLangWrap=document.querySelector('.start-lang-switch');
    if(startLangWrap)startLangWrap.setAttribute('data-lang-label',state.language==='pt-BR'?'PT-BR':'EN');
    const mobileFlag=document.getElementById('mobileTopLangFlag');
    if(mobileFlag)mobileFlag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    const stateSelect=document.getElementById('startStateSelect');
    const citySelect=document.getElementById('startCitySelect');
    if(!stateSelect||!citySelect)return;
    const st=states();
    const statePlaceholder=state.language==='pt-BR'?'Selecione um estado...':'Select a state...';
    const cityFirstPlaceholder=state.language==='pt-BR'?'Selecione primeiro um estado...':'Select a state first...';
    const cityPlaceholder=state.language==='pt-BR'?'Selecione uma cidade...':'Select a city...';
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${x}" ${x===startFilterState?'selected':''}>${x}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : cities();
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${c.id}" ${c.id===startFilterCityId?'selected':''}>${c.city}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    const calculateBtn=document.getElementById('startCalculateBtn');
    if(calculateBtn)calculateBtn.disabled=!startFilterCityId;
    const table=document.getElementById('cityTable');
    const rows=filtered.map(c=>`<tr data-city-row="${c.id}" class="${c.id===startFilterCityId?'selected':''}"><td>${c.state}</td><td>${c.city}</td><td>${fmtNumber(c.population)}</td><td>${fmtBRL(c.initialPayment)}</td></tr>`).join('');
    table.innerHTML=`<thead><tr><th>${Localization.t('state')}</th><th>${Localization.t('city')}</th><th>${Localization.t('populationHeader')}</th><th>${Localization.t('initialPaymentHeader')}</th></tr></thead><tbody>${rows}</tbody>`;
  }


  function isMobileLayout(){
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }

  function mobileActivateSlide(target){
    if(!isMobileLayout()){
      const el=document.querySelector(target);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const map={
      '.hero-row':'kpi',
      '.chart-card':'chart',
      '#mobileInsightsSummary':'summary'
    };
    const slide=map[target]||target||'kpi';
    document.body.dataset.mobileSlide=slide;
    const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page=slide;
    window.scrollTo({top:0,left:0,behavior:'auto'});
    setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}},40);
  }

  function mobileScrollTo(selector){
    mobileActivateSlide(selector);
  }

  function ensureMobilePresentation(){
    const dashboard=document.getElementById('dashboard');
    const hero=dashboard?.querySelector('.hero-row');
    const chart=dashboard?.querySelector('.chart-card');
    const modelCol=dashboard?.querySelector('.model-column');
    if(!dashboard||!hero||!chart||!modelCol)return;

    if(!document.getElementById('mobileKpiNext')){
      const btn=document.createElement('button');
      btn.id='mobileKpiNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','.chart-card');
      btn.setAttribute('aria-label','Next screen');
      btn.innerHTML='<span>↓</span>';
      hero.appendChild(btn);
    }

    if(!document.getElementById('mobileChartPrev')){
      const btn=document.createElement('button');
      btn.id='mobileChartPrev';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-top';
      btn.setAttribute('data-mobile-target','.hero-row');
      btn.setAttribute('aria-label','Previous screen');
      btn.innerHTML='<span>↑</span>';
      chart.prepend(btn);
    }
    if(!document.getElementById('mobileChartNext')){
      const btn=document.createElement('button');
      btn.id='mobileChartNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','#mobileInsightsSummary');
      btn.setAttribute('aria-label','Next screen');
      btn.innerHTML='<span>↓</span>';
      chart.appendChild(btn);
    }

    let combined=document.getElementById('mobileInsightsSummary');
    if(!combined){
      combined=document.createElement('section');
      combined.id='mobileInsightsSummary';
      combined.className='side-card mobile-insights-summary-card';
      combined.innerHTML=`
        <button type="button" class="mobile-slide-button mobile-slide-button-top" data-mobile-target=".chart-card" aria-label="Previous screen"><span>↑</span></button>
        <div class="mobile-combined-content">
          <div class="mobile-combined-block">
            <h3 data-mobile-insights-title></h3>
            <div id="mobileInsightsList"></div>
          </div>
          <div class="mobile-combined-block">
            <h3 data-mobile-summary-title></h3>
            <div id="mobileSummaryList"></div>
          </div>
        </div>
      `;
      chart.insertAdjacentElement('afterend',combined);
    }
    const it=combined.querySelector('[data-mobile-insights-title]');
    if(it)it.textContent=Localization.t('keyInsights');
    const st=combined.querySelector('[data-mobile-summary-title]');
    if(st)st.textContent=Localization.t('summary12');
  }

  function syncMobilePresentation(){
    ensureMobilePresentation();
    const srcInsights=document.getElementById('insightsList');
    const dstInsights=document.getElementById('mobileInsightsList');
    const srcSummary=document.getElementById('summaryList');
    const dstSummary=document.getElementById('mobileSummaryList');
    if(srcInsights&&dstInsights)dstInsights.innerHTML=srcInsights.innerHTML;
    if(srcSummary&&dstSummary)dstSummary.innerHTML=srcSummary.innerHTML;
  }



  function mobileSetPage(page){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const next=(page==='detail'?'resumo':(page||'kpi'));
    app.dataset.page=next;
    document.body.dataset.mobileSlide=next;
    if(isMobileLayout()){
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      window.scrollTo(0,0);
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},20);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},160);
    }
  }

  function renderMobileStartScreen(){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const flag=document.getElementById('mobileStartLanguageFlag');
    const text=document.getElementById('mobileStartLanguageText');
    if(flag)flag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    if(text)text.textContent=state.language==='pt-BR'?'PT-BR':'EN';
    const titleEl=document.querySelector('#mobileStartScreen .mobile-start-title');
    const subtitleEl=document.querySelector('#mobileStartScreen .mobile-start-subtitle');
    const stateSelect=document.getElementById('mobileStateSelect');
    const citySelect=document.getElementById('mobileCitySelect');
    const btn=document.getElementById('mobileCalculateBtn');
    if(titleEl)titleEl.textContent=Localization.t('mobileWelcomeTitle');
    if(subtitleEl)subtitleEl.textContent=Localization.t('mobileWelcomeSubtitle');
    if(!stateSelect||!citySelect||!btn)return;
    btn.textContent=Localization.t('mobileCalculate');
    const st=states();
    const statePlaceholder=state.language==='pt-BR'?'Selecione um estado...':'Select a state...';
    const cityFirstPlaceholder=state.language==='pt-BR'?'Selecione primeiro um estado...':'Select a state first...';
    const cityPlaceholder=state.language==='pt-BR'?'Selecione uma cidade...':'Select a city...';
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${x}" ${x===startFilterState?'selected':''}>${x}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : [];
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${c.id}" ${c.id===startFilterCityId?'selected':''}>${c.city}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    btn.disabled=!startFilterCityId;
  }

  function mobileKpiIcon(name){
    const icons={
      city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
      briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
      target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
      profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`,
      roi:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>`
    };
    return `<span class="mobile-kpi-icon">${icons[name]||icons.briefcase}</span>`;
  }

  const htmlEsc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function mobileMonthLabel(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n<=0)return Localization.t('notAchieved12');
    return `${Localization.t('month')} ${Math.round(n)}`;
  }

  function mobileSetText(elementId, i18nKey, vars={}){
    const el=document.getElementById(elementId);
    if(el)el.textContent=Localization.t(i18nKey,vars);
  }

  function mobileInsightIcon(name){
    const icons={
      briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
      calendar:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
      growth:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/></svg>`,
      coin:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 10.2c0-1.4 1.2-2.2 3-2.2s3 .8 3 2.2c0 1.3-1 1.9-3 2.1-2 .2-3 .8-3 2.1s1.2 2.2 3 2.2 3-.8 3-2.2"/></svg>`,
      balance:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 8h14M7 8l-3 6h6L7 8zM17 8l-3 6h6l-3-6z"/></svg>`
    };
    return icons[name]||icons.calendar;
  }

  let mobileTooltipSeq=0;
  function mobileInfoTooltip(text,className=''){
    const raw=String(text??'');
    const id='mobile-info-tooltip-'+(++mobileTooltipSeq);
    const aria=htmlEsc(raw.replace(/\s+/g,' ').trim());
    const body=htmlEsc(raw).replace(/\n/g,'<br>');
    const cls=className?' '+className:'';
    return `<button class="info-tooltip${cls}" type="button" aria-label="${aria}" aria-describedby="${id}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path d="M8 7.1v4.2" stroke-linecap="round"/><circle cx="8" cy="4.8" r=".75" fill="currentColor" stroke="none"/></svg><span id="${id}" class="info-tooltip-bubble" role="tooltip">${body}</span></button>`;
  }

  function renderMobileKpis(){
    const holder=document.getElementById('mobileKpiContent');
    if(!holder||!model)return;
    const c=cityById(state.selectedCityId);
    const cityTitle=c?`${c.city}, ${c.state}`:'—';
    const pop=c?fmtNumber(c.population):'—';
    const pay=fmtBRL(model.summary.initialPayment||0);
    const paybackText=mobileMonthLabel(model.summary.paybackPeriod);
    const monthlyBreakEven=mobileMonthLabel(model.summary.breakEvenPeriod);
    const profitCompact=fmtBRLCompact(model.summary.netProfit);
    const cards=[
      {cls:'city',icon:'city',label:Localization.t('selectedCity'),value:cityTitle,sub:`${Localization.t('populationHeader')}: ${pop} · ${Localization.t('initialPaymentHeader')}: ${pay}`},
      {cls:'investment-editable',icon:'briefcase',label:Localization.t('initialInvestment'),value:fmtBRLCompact(model.summary.totalInvestment),sub:`${Localization.t('averageMonthlyInvestment')}: ${fmtBRLCompact(model.summary.averageMonthlyInvestment||0)}`},
      {icon:'target',label:Localization.t('breakEven'),value:paybackText,sub:`${Localization.t('monthlyEquilibrium')}: ${monthlyBreakEven}`},
      {icon:'profit',label:Localization.t('yearProfit'),value:profitCompact},
      {icon:'roi',label:Localization.t('roi12'),value:Math.round(model.summary.roi)+'%'}
    ];
    const cardHtml=cards.map(x=>{
      return `<div class="mobile-kpi-card ${x.cls||''}">${mobileKpiIcon(x.icon)}<div class="mobile-kpi-copy"><div class="mobile-kpi-label">${htmlEsc(x.label)}</div><div class="mobile-kpi-value">${htmlEsc(x.value)}</div>${x.sub?`<div class="mobile-kpi-sub">${htmlEsc(x.sub)}</div>`:''}</div></div>`;
    }).join('');
    holder.innerHTML=cardHtml;
  }

  function mobileChartConfig(){
    if(!model)return null;
    const months=model.months.filter(x=>x.index>1);
    const labels=months.map((m,i)=>String(i+1));
    const net=months.map(x=>x.netProfit);
    const accumulated=months.map(x=>x.accumulated);
    return {
      type:'bar',
      data:{labels,datasets:[
        {label:Localization.t('monthlyNetProfit'),data:net,backgroundColor:net.map(v=>v<0?'rgba(226,71,71,.72)':'rgba(111,160,83,.72)'),borderColor:net.map(v=>v<0?'#e24747':'#6fa053'),borderWidth:1,borderRadius:6,barPercentage:.62,categoryPercentage:.72},
        {label:Localization.t('accumulatedNetProfit'),data:accumulated,backgroundColor:'rgba(23,59,99,.28)',borderColor:'#173b63',borderWidth:1,borderRadius:6,barPercentage:.62,categoryPercentage:.72}
      ]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${FinancialEngine.formatCurrencyFull(ctx.raw)}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:10},autoSkip:false,maxRotation:0}},y:{ticks:{callback:v=>FinancialEngine.formatCurrencyCompact(v),font:{size:10},maxTicksLimit:6},grid:{color:'#e5e7eb'},beginAtZero:true}}}
    };
  }

  function renderMobileChart(){
    const canvas=document.getElementById('mobileCashFlowChart');
    if(!model||!isMobileLayout())return;
    const title=document.querySelector('#mobileChartScreen .mobile-chart-card h2');
    if(title)title.textContent=state.language==='pt-BR'?'Visão geral do fluxo de caixa':'Cash flow overview';
    const note=document.getElementById('mobileChartNote');
    if(note)note.textContent=model.summary.paybackPeriod?Localization.t('mobileCashFlowNote',{payback:mobileMonthLabel(model.summary.paybackPeriod)}):Localization.t('noPaybackText');
    if(!canvas||!window.Chart)return;
    const cfg=mobileChartConfig();
    if(!cfg)return;
    if(mobileChart&&mobileChart.config&&mobileChart.config.type!==cfg.type){mobileChart.destroy();mobileChart=null;}
    if(mobileChart){mobileChart.data=cfg.data;mobileChart.options=cfg.options;mobileChart.resize();mobileChart.update();}
    else mobileChart=new Chart(canvas,cfg);
    const legend=document.getElementById('mobileChartLegend');
    if(legend){
      legend.innerHTML=`<span><i class="mobile-chart-dot" style="background:#6fa053"></i>${Localization.t('monthlyNetProfit')}</span><span><i class="mobile-chart-dot" style="background:#173b63"></i>${Localization.t('accumulatedNetProfit')}</span>`;
    }
  }

  function updateMobileWhatsAppCta(){
    const finalCta=document.getElementById('mobileWhatsAppCta');
    const stickyCta=document.getElementById('mobileStickyCta');
    const c=cityById(state.selectedCityId);
    const isPt=state.language==='pt-BR';
    const message=isPt
      ? `Olá! Quero falar com um especialista da Maxim${c?` sobre ${c.city}, ${c.state}`:' sobre minha cidade'} e agendar uma videochamada.`
      : `Hello! I want to talk to a Maxim specialist${c?` about ${c.city}, ${c.state}`:' about my city'} and schedule a video call.`;
    const href='https://wa.me/5548991487120?text='+encodeURIComponent(message);
    if(finalCta){finalCta.textContent=Localization.t('mobileFinalCtaButton');finalCta.href=href;}
    if(stickyCta){stickyCta.textContent=Localization.t('mobileStickyCta');stickyCta.href=href;}
  }


  function setupMobileStickyCtaVisibility(){
    const stickyCta=document.getElementById('mobileStickyCta');
    const finalCta=document.querySelector('.final-cta-section');
    if(!stickyCta)return;
    const setHidden=hidden=>{
      stickyCta.classList.toggle('is-hidden',!!hidden);
      stickyCta.setAttribute('aria-hidden',hidden?'true':'false');
      if(hidden){stickyCta.dataset.prevTabindex=stickyCta.getAttribute('tabindex')||'';stickyCta.setAttribute('tabindex','-1');}
      else if(stickyCta.dataset.prevTabindex!==undefined){const prev=stickyCta.dataset.prevTabindex;if(prev)stickyCta.setAttribute('tabindex',prev);else stickyCta.removeAttribute('tabindex');delete stickyCta.dataset.prevTabindex;}
    };
    if(mobileStickyCtaObserver){
      try{mobileStickyCtaObserver.disconnect();}catch(_e){}
      mobileStickyCtaObserver=null;
    }
    if(!finalCta||!('IntersectionObserver' in window)){
      const onScroll=()=>{
        const target=document.querySelector('.final-cta-section');
        if(!target){setHidden(false);return;}
        const rect=target.getBoundingClientRect();
        const viewportHeight=window.innerHeight||document.documentElement.clientHeight||0;
        setHidden(rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.18);
      };
      if(stickyCta.dataset.scrollFallbackBound!=='1'){
        stickyCta.dataset.scrollFallbackBound='1';
        window.addEventListener('scroll',onScroll,{passive:true});
        window.addEventListener('resize',onScroll);
      }
      setTimeout(onScroll,0);
      return;
    }
    mobileStickyCtaObserver=new IntersectionObserver(([entry])=>{
      setHidden(entry && entry.isIntersecting);
    },{threshold:0.35});
    mobileStickyCtaObserver.observe(finalCta);
  }

  function renderMobileInsights(){
    const dst=document.getElementById('mobileStandaloneInsights');
    if(!dst||!model)return;
    const rows=UIRenderer.getInsightRows(model);
    dst.innerHTML=rows.map(row=>`<div class="insight" data-tone="${row.tone||'neutral'}"><div class="insight-badge">${mobileInsightIcon(row.icon)}</div><div><div class="insight-title">${htmlEsc(Localization.t(row.title))}</div><div class="insight-text">${htmlEsc(Localization.t(row.text,row.vars||{}))}</div></div></div>`).join('');
  }

  function renderMobileSummary(){
    const dst=document.getElementById('mobileStandaloneSummary');
    if(!dst||!model)return;
    const rows=[
      ['totalInvestment',model.summary.totalInvestment,'currency','summary-investment-row'],
      ['totalPartnerRevenue',model.summary.totalPartnerRevenue,'currency','summary-positive-row'],
      ['totalCommissionFromRides',model.summary.totalCommissionFromRides,'currency','summary-positive-row'],
      ['totalOperatingExpenses',model.summary.totalExpenses,'currency','summary-expense-row'],
      ['netProfit',model.summary.netProfit,'currency','summary-positive-row'],
      ['roi12',model.summary.roi,'%','summary-positive-row'],
      ['paybackPeriod',model.summary.paybackPeriod?`${Localization.t('month')} ${model.summary.paybackPeriod}`:Localization.t('notAchieved12'),'','summary-positive-row']
    ];
    dst.innerHTML=rows.map(([key,val,type,cls])=>{
      const value=typeof val==='number'?(type==='%'?Math.round(val)+'%':fmtBRL(val)):val;
      return `<div class="summary-row ${cls||''}"><span>${htmlEsc(Localization.t(key))}</span><span>${htmlEsc(value)}</span></div>`;
    }).join('');
  }

  function renderMobilePresentation(){
    mobileSetText('mobilePresentationTitle','mobilePresentationTitle');
    mobileSetText('mobilePresentationText','mobilePresentationText');
    mobileSetText('mobileFinalCtaTitle','mobileFinalCtaTitle');
    mobileSetText('mobileFinalCtaText','mobileFinalCtaText');
    mobileSetText('mobileDisclaimer','mobileDisclaimer');
    const list=document.getElementById('mobilePresentationList');
    if(list){
      list.innerHTML=[1,2,3,4,5].map(i=>`<li>${htmlEsc(Localization.t('mobilePresentationPoint'+i))}</li>`).join('');
    }
  }

  function renderMobileSummaryAndDetail(){
    const insightsTitle=document.querySelector('#mobileSummaryScreen .mobile-info-panel h2');
    const resumoTitle=document.querySelector('#mobileResumoScreen .mobile-info-panel h2');
    if(insightsTitle)insightsTitle.textContent=state.language==='pt-BR'?'Principais insights':'Key insights';
    if(resumoTitle)resumoTitle.textContent=state.language==='pt-BR'?'Resumo (12 meses)':'Summary (12 months)';
    renderMobileInsights();
    renderMobileSummary();
    renderMobilePresentation();
    updateMobileWhatsAppCta();
    setupMobileStickyCtaVisibility();
  }



  function mobilePageOrder(){return ['kpi','chart','summary','resumo','presentation'];}
  function mobileNextPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>=0&&i<a.length-1?a[i+1]:page;}
  function mobilePrevPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>0?a[i-1]:page;}

  function bindMobileGestures(){
    const app=document.getElementById('mobileApp');
    if(!app||app.dataset.gesturesBound==='1')return;
    app.dataset.gesturesBound='1';
    // Mobile result now uses normal vertical scroll-flow.
    // Do not convert swipe gestures into slide navigation, otherwise
    // ordinary scrolling can jump back to KPI and hide later sections.
  }

  function renderMobileApp(){
    if(!document.getElementById('mobileApp'))return;
    renderMobileStartScreen();
    if(model){
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      if(!document.getElementById('mobileApp').dataset.page)document.getElementById('mobileApp').dataset.page='kpi';
      if(isMobileLayout())setTimeout(renderMobileChart,50);
    }
  }

  function recalc(){
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    state.activeScenario.assumptions=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const v=Validation.validateAssumptions(state.activeScenario.assumptions);
    errors=v.errors;
    model=FinancialEngine.calculate(state.activeScenario.assumptions);
    model.currency='BRL';
    UIRenderer.renderAll(state,model,errors);
    renderSelectedCityBanner();
    renderParameterButtonLabels();
    renderStartScreen();
    syncMobilePresentation();
    renderMobileApp();
    setScreen();
    document.getElementById('undoBtn')?.classList.toggle('disabled',undo.length===0);
    document.getElementById('redoBtn')?.classList.toggle('disabled',redo.length===0);
    persist();
  }

  function onInput(e){
    const el=e.target;
    if(el.dataset.currencyInput!==undefined){return}
    if(el.dataset.input){
      pushUndo();
      state.activeScenario.assumptions[el.dataset.input]=Number(el.value);
      if(el.dataset.input==='operatingExpenses'){
        const rows=state.activeScenario.assumptions.expenseRows||[];
        const base=rows.find(r=>r.id==='other_costs')||rows.find(r=>r.id!=='assistente')||rows[0];
        if(base&&base.id!=='assistente')base.amount=Number(el.value);
      }
      recalc();return;
    }
    if(el.dataset.marketingPct){pushUndo();const idx=Number(el.dataset.marketingPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.marketingDistribution[idx]=Math.max(0,Number(el.value)||0);a.marketingDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ridesPct){pushUndo();const idx=Number(el.dataset.ridesPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.ridesDistribution[idx]=Math.max(0,Number(el.value)||0);a.ridesDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ruleThreshold){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleThreshold);if(row)row.threshold=Math.max(0,Number(el.value)||0);recalc();return}
    if(el.dataset.ruleShare){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleShare);if(row)row.maximShare=Math.min(100,Math.max(0,Number(el.value)||0));recalc();return}
    if(el.dataset.preset){pushUndo();state.activeScenario.assumptions=FinancialEngine.applyPreset(state.activeScenario.assumptions,el.dataset.preset,el.value);recalc();return}
    if(el.dataset.expenseVisible){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseVisible);if(row)row.showInModel=el.checked;recalc();return}
    if(el.dataset.expenseAmount){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseAmount);if(row&&row.id!=='assistente'){row.amount=Number(el.value);state.activeScenario.assumptions.operatingExpenses=Number(el.value)}recalc();return}
    if(el.dataset.expenseName){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseName);if(row&&row.id!=='assistente')row.name=el.value.trim()||'Expense';recalc();}
  }

  function bind(){
    document.body.addEventListener('change',onInput);
    document.body.addEventListener('keydown',e=>{
      const modal=document.getElementById('parametersModal');
      if(!modal?.hidden&&e.key==='Escape'){e.preventDefault();closeParametersModal();}
      if(!modal?.hidden&&e.key==='Enter'&&e.target?.tagName!=='BUTTON'){e.preventDefault();confirmParameters();}
    });
    const mobileNavHandler=e=>{
      const nav=e.target.closest?.('[data-mobile-page-target]');
      if(nav&&isMobileLayout()){
        e.preventDefault();
        e.stopPropagation();
        mobileSetPage(nav.dataset.mobilePageTarget);
      }
    };
    document.body.addEventListener('pointerup',mobileNavHandler,{capture:true});
    document.body.addEventListener('touchend',mobileNavHandler,{capture:true,passive:false});
    document.body.addEventListener('click',e=>{
      const parametersTrigger=e.target.closest('#parametersBtn, #mobileParametersBtn');
      if(parametersTrigger){openParametersModal(parametersTrigger);return}
      if(e.target.closest('[data-close-parameters-modal], #cancelParametersBtn')){closeParametersModal();return}
      if(e.target.closest('#confirmParametersBtn')){confirmParameters();return}
      const mobilePageNav=e.target.closest('[data-mobile-page-target]');
      if(mobilePageNav){mobileSetPage(mobilePageNav.dataset.mobilePageTarget);return}
      const mobileNav=e.target.closest('[data-mobile-target]');
      if(mobileNav){mobileScrollTo(mobileNav.dataset.mobileTarget);return}
      const cityRow=e.target.closest('[data-city-row]');
      if(cityRow){const city=cityById(cityRow.dataset.cityRow);if(city){startFilterState=city.state;startFilterCityId=city.id;}renderStartScreen();return}
      const del=e.target.closest('[data-expense-delete]');
      if(del){pushUndo();const id=del.dataset.expenseDelete;state.activeScenario.assumptions.expenseRows=(state.activeScenario.assumptions.expenseRows||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      const ruleDel=e.target.closest('[data-rule-delete]');
      if(ruleDel){pushUndo();const id=ruleDel.dataset.ruleDelete;state.activeScenario.assumptions.revenueRules=(state.activeScenario.assumptions.revenueRules||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      if(e.target.id==='addRevenueRule'){pushUndo();const rules=state.activeScenario.assumptions.revenueRules||(state.activeScenario.assumptions.revenueRules=[]);rules.push(FinancialEngine.createRevenueRule(0,100));recalc();return}
      if(e.target.id==='addExpenseRow'){pushUndo();const rows=state.activeScenario.assumptions.expenseRows||(state.activeScenario.assumptions.expenseRows=[]);rows.push(FinancialEngine.createExpenseRow('New Expense',0));recalc();return}
      if(e.target.id==='startCalculateBtn'||e.target.id==='mobileCalculateBtn'){
        const city=cityById(startFilterCityId);
        if(!city)return;
        pushUndo();applySelectedCity(city);recalc();
        if(isMobileLayout())mobileSetPage('kpi');
        else window.scrollTo({top:0,behavior:'auto'});
        return;
      }
      if(e.target.closest('#changeCityBtn')||e.target.closest('#mobileChangeCityBtn')){
        state.selectedCityId=null;delete document.body.dataset.mobileSlide;renderStartScreen();setScreen();persist();return;
      }
    });
    document.body.addEventListener('dblclick',e=>{
      const cell=e.target.closest('[data-month-edit]');
      if(!cell||cell.querySelector('input.month-pct-editor'))return;
      const current=Number(cell.dataset.currentPct)||0;
      const input=document.createElement('input');input.className='month-pct-editor';input.type='number';input.step='0.1';input.min='0';input.value=current;
      cell.innerHTML='';cell.appendChild(input);input.focus();input.select();
      const commit=()=>{if(!input.isConnected)return;pushUndo();const idx=Number(cell.dataset.monthNo)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);if(cell.dataset.monthEdit==='marketing'){a.marketingDistribution[idx]=Math.max(0,Number(input.value)||0);a.marketingDistributionPreset='manual'}if(cell.dataset.monthEdit==='rides'){a.ridesDistribution[idx]=Math.max(0,Number(input.value)||0);a.ridesDistributionPreset='manual'}state.activeScenario.assumptions=a;recalc()};
      input.addEventListener('blur',commit,{once:true});
      input.addEventListener('keydown',ev=>{if(ev.key==='Enter')input.blur();if(ev.key==='Escape')recalc()});
    });
    document.getElementById('startLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileStartLanguageButton')?.addEventListener('click',()=>{state.language=state.language==='pt-BR'?'en':'pt-BR';Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;recalc();persist()});
    window.addEventListener('resize',()=>{if(isMobileLayout()&&cityById(state.selectedCityId)&&!document.body.dataset.mobileSlide)document.body.dataset.mobileSlide='kpi';});
    document.getElementById('recommendedValuesCheckbox')?.addEventListener('change',e=>toggleRecommendedDraft(e.target.checked));
    document.getElementById('annualInvestmentBudgetInput')?.addEventListener('input',updateBudgetAssessment);
    document.getElementById('startStateSelect').addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('startCitySelect').addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileStateSelect')?.addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileCitySelect')?.addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('notesArea')?.addEventListener('input',e=>{state.activeScenario.notes=e.target.value;persist()});
    document.getElementById('languageSelect')?.addEventListener('change',e=>{state.language=e.target.value;recalc()});
    document.getElementById('modeToggle')?.addEventListener('click',()=>{state.advanced=!state.advanced;recalc()});
    document.getElementById('resetBtn')?.addEventListener('click',()=>{if(!confirm(Localization.t('confirmReset')))return;pushUndo();const type=['conservative','optimistic'].includes(state.activeScenarioId)?state.activeScenarioId:'base';state.activeScenario.assumptions=FinancialEngine.defaultAssumptions(type);const c=cityById(state.selectedCityId);if(c)applySelectedCity(c);recalc()});
    document.getElementById('undoBtn')?.addEventListener('click',()=>{if(!undo.length)return;redo.push(snapshot());restore(undo.pop())});
    document.getElementById('redoBtn')?.addEventListener('click',()=>{if(!redo.length)return;undo.push(snapshot());restore(redo.pop())});
  }
  function init(){hydrate();bind();bindMobileGestures();recalc()}
  return{init}
})();
document.addEventListener('DOMContentLoaded',App.init);

// Shared accessible info tooltip behavior for KPI and summary icons.
document.addEventListener('DOMContentLoaded',()=>{
  const closeAll=except=>document.querySelectorAll('.info-tooltip.is-open').forEach(el=>{if(el!==except)el.classList.remove('is-open')});
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.info-tooltip');
    if(btn){
      e.preventDefault();
      e.stopPropagation();
      const open=!btn.classList.contains('is-open');
      closeAll(btn);
      btn.classList.toggle('is-open',open);
      return;
    }
    closeAll();
  });
  document.addEventListener('pointerout',e=>{
    const btn=e.target.closest('.info-tooltip');
    if(btn&&e.relatedTarget&&!btn.contains(e.relatedTarget))btn.classList.remove('is-open');
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});
});
