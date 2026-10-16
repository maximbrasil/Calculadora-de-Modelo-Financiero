'use strict';
const UIRenderer=(()=>{
  let activeCurrency='R$';
  let currentModel=null;
  let activeHelpSection='';
  let helpReturnFocus=null;
  let advertisingReturnFocus=null;
  const numberFmt=v=>FinancialEngine.formatMoney(v);
  const money=v=>FinancialEngine.formatCurrencyFull(v);
  const compactMoney=v=>FinancialEngine.formatCurrencyCompact(v);
  // The monthly table already has a single, known currency (BRL).
  // Repeating "R$" in every cell makes the dense 12-month view harder to scan,
  // so table values use plain localized numbers while KPIs and summaries keep the currency.
  const tableMoney=v=>FinancialEngine.formatMoney(v,false);
  const currency=()=>activeCurrency;
  const labelWithCurrency=s=>String(s).replaceAll('THB', activeCurrency).replaceAll('BRL', activeCurrency);
  const pct=v=>FinancialEngine.formatPercent(v);
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
  let tooltipSeq=0;
  function infoTooltip(text,className=''){
    const raw=String(text??'');
    const id='info-tooltip-'+(++tooltipSeq);
    const aria=esc(raw.replace(/\s+/g,' ').trim());
    const body=esc(raw).replace(/\n/g,'<br>');
    const cls=className?' '+className:'';
    return `<button class="info-tooltip${cls}" type="button" aria-label="${aria}" aria-describedby="${id}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path d="M8 7.1v4.2" stroke-linecap="round"/><circle cx="8" cy="4.8" r=".75" fill="currentColor" stroke="none"/></svg><span id="${id}" class="info-tooltip-bubble" role="tooltip">${body}</span></button>`;
  }

  const ICONS={
    briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
    target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
    profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`,
    roi:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>`,
    calendar:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
    growth:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"/><path d="M6 15l4-4 3 3 5-7"/><path d="M15 7h3v3"/></svg>`,
    coin:`<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="6" ry="3"/><path d="M6 7v7c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M6 11c0 1.7 2.7 3 6 3s6-1.3 6-3"/></svg>`,
    balance:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 7h14M8 7l-4 7h8L8 7zM16 7l-4 7h8l-4-7z"/></svg>`,
    pie:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none"/><path d="M12 12V3.5" stroke-linecap="round"/><path d="M12 12l7.4 4.3" stroke-linecap="round"/><path d="M12 12a8.5 8.5 0 0 1 7.4 4.3" fill="none"/></svg>`,
    calculator:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3"/><rect x="8" y="6" width="8" height="3" rx="1"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke-linecap="round" stroke-width="2.2"/></svg>`,
    megaphone:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13V9l11-4v12L4 13z"/><path d="M15 9h2a3 3 0 0 1 0 6h-2M6 13l1.5 6h3L9 14"/></svg>`,
    headset:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="6" rx="2"/><rect x="17" y="12" width="4" height="6" rx="2"/><path d="M17 18c0 2-2 3-5 3h-1"/></svg>`,
    sms:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M5.5 8l6.5 5 6.5-5"/></svg>`,
    city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>`
  };
  const icon=name=>ICONS[name]||'';

  function tableRows(model){
    return [
      {section:'investment',icon:'briefcase',title:'investment',label:'initialPurchase',value:m=>m.initialPurchase,fmt:tableMoney,moneyLabel:true},
      {section:'investment',icon:'megaphone',label:'marketingInvestment',value:m=>m.marketingInvestment,fmt:tableMoney,moneyLabel:true},
      {section:'operations',icon:'growth',title:'orderIndicators',label:'ridesPerDay',value:m=>m.ridesPerDay,fmt:numberFmt},
      {section:'operations',icon:'calendar',label:'ridesPerMonth',value:m=>m.ridesPerMonth,fmt:numberFmt},
      {section:'operations',icon:'coin',label:'commissionFromCompletedRidesValue',value:m=>m.commissionFromRides,fmt:tableMoney,financial:true,moneyLabel:true},
      {section:'expenses',icon:'headset',title:'operatingExpenses',label:'assistente',value:m=>m.assistantExpense,fmt:tableMoney,moneyLabel:true},
      {section:'expenses',icon:'sms',label:'smsNotifications',value:m=>m.smsExpense,fmt:tableMoney,moneyLabel:true},
      {section:'expenses',icon:'pie',label:'maximRevenue',value:m=>m.maximRevenue,fmt:tableMoney,moneyLabel:true},
      ...(model.assumptions.expenseRows||[]).filter(r=>r.showInModel!==false&&r.id!=='assistente').map(r=>({section:'expenses',icon:'briefcase',labelText:r.name,value:m=>m.fixedExpenses[r.id]||0,fmt:tableMoney,moneyLabel:true})),
      {section:'expenses',icon:'calculator',label:'totalOperatingExpenses',value:m=>m.opEx,fmt:tableMoney,subtotal:true,total:true,moneyLabel:true},
      {section:'profit',icon:'profit',title:'profitCash',label:'netProfit',value:m=>m.netProfit,fmt:tableMoney,subtotal:true,total:true,sign:true,moneyLabel:true},
      {section:'profit',icon:'balance',label:'accumulatedCashFlow',value:m=>m.accumulated,fmt:tableMoney,subtotal:true,total:true,sign:true,moneyLabel:true}
    ];
  }
  function tableRowLabel(row){
    return labelWithCurrency(row.labelText||Localization.t(row.label)).replace(/\s*,?\s*R\$\s*$/i,'').trim();
  }
  function getDisplayMonths(model){
    const setup=model.months[0];
    const preparation=model.months[1];
    const combined={...preparation,key:'setupPreparation',monthNo:0,isSetup:false,isPrep:true,isCombinedPreOpening:true};
    const numericKeys=['investment','initialPurchase','marketingInvestment','netProfit','netCashFlow'];
    numericKeys.forEach(k=>{combined[k]=(setup?.[k]||0)+(preparation?.[k]||0)});
    combined.accumulated=preparation?.accumulated ?? setup?.accumulated ?? 0;
    combined.marketingPct=0;
    combined.ridesPct=0;
    return [combined,...model.months.slice(2)];
  }
  function shouldBlankCombined(row,m){return m.isCombinedPreOpening&&(['operations','revenue','expenses'].includes(row.section)||(row.section==='profit'&&row.label==='netProfit'))}
  function getTableRows(model){return tableRows(model).map(r=>({label:tableRowLabel(r),value:m=>r.value(m)}))}
  function getDetailedTableData(model){
    const months=getDisplayMonths(model);
    const sectionOrder=['investment','operations','expenses','profit'];
    const rows=tableRows(model);
    return {
      months:months.map((m,index)=>({key:m.key,label:m.isCombinedPreOpening?'pre':(m.monthNo||index)})),
      sections:sectionOrder.map(section=>{
        const sectionRows=rows.filter(r=>r.section===section);
        const titleKey=sectionRows.find(r=>r.title)?.title||({investment:'investment',operations:'orderIndicators',expenses:'operatingExpenses',profit:'profitCash'}[section]||section);
        return {
          id:section,
          title:Localization.t(titleKey),
          rows:sectionRows.map(row=>({
            label:tableRowLabel(row),
            values:months.map(m=>{
              const val=row.value(m);
              const blankCombined=shouldBlankCombined(row,m);
              const empty=blankCombined||((m.isPrep||m.isSetup)&&val===0&&!['netCashFlow','accumulatedCashFlow'].includes(row.label));
              return {display:empty?'':row.fmt(val),sign:row.sign?(val<0?'negative':val>0?'positive':''):''};
            })
          }))
        };
      })
    };
  }
  const sectionIconFor=(section)=>({investment:'briefcase',operations:'growth',revenue:'pie',expenses:'calculator',profit:'profit'}[section]||'briefcase');
  const sectionTitleHtml=(row)=>{const title=Localization.t(row.title);const aria=Localization.t('openSectionHelp',{section:title});return `<div class="section-title-wrap"><button class="section-title-button" type="button" data-section-help="${esc(row.section)}" aria-label="${esc(aria)}" title="${esc(aria)}"><span class="section-badge">${icon(sectionIconFor(row.section))}</span><span class="section-title-copy"><span class="section-text">${title}</span><span class="section-action-text">${Localization.t('sectionHelpAction')}</span></span></button></div>`};

  const sectionHelpLabelKey={
    initialPurchase:'helpInitialPurchase',
    marketingInvestment:'helpMarketingInvestment',
    ridesPerDay:'helpRidesPerDay',
    ridesPerMonth:'helpRidesPerMonth',
    commissionFromCompletedRidesValue:'helpCommissionFromCompletedRidesValue',
    assistente:'helpAssistente',
    smsNotifications:'helpSmsNotifications',
    maximRevenue:'helpMaximRevenue',
    totalOperatingExpenses:'helpTotalOperatingExpenses',
    netProfit:'helpNetProfit',
    accumulatedCashFlow:'helpAccumulatedCashFlow'
  };
  function helpTextToHtml(text){
    return esc(String(text||'')).replace(/\n/g,'<br>');
  }
  function technologyFeeTableHtml(){
    const tiers=[
      ['technologyFeeTier1','0%'],
      ['technologyFeeTier2','10%'],
      ['technologyFeeTier3','15%'],
      ['technologyFeeTier4','20%'],
      ['technologyFeeTier5','25%'],
      ['technologyFeeTier6','30%']
    ];
    return `<div class="technology-fee-table-wrap"><table class="technology-fee-table"><thead><tr><th>${esc(Localization.t('technologyFeeTableBase'))}</th><th>${esc(Localization.t('technologyFeeTableRate'))}</th></tr></thead><tbody>${tiers.map(([tier,rate])=>`<tr><td>${esc(Localization.t(tier))}</td><td>${rate}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function sectionHelpDescription(row,model){
    if(row.label==='netProfit'){
      const month=model?.summary?.breakEvenPeriod;
      return month
        ? Localization.t('helpNetProfit',{month})
        : Localization.t('helpNetProfitNoPositive');
    }
    return Localization.t(sectionHelpLabelKey[row.label]||row.label);
  }
  function sectionHelpRows(section,model){
    return tableRows(model)
      .filter(row=>row.section===section)
      .map(row=>({
        // In the indicator guide, labels are semantic names only; currency stays in the financial table values.
        label:String(row.labelText||Localization.t(row.label)).replace(/\s*,?\s*R\$\s*$/i,'').trim(),
        description:sectionHelpDescription(row,model),
        note:row.label==='smsNotifications'?Localization.t('helpSmsCalculationNote'):'',
        feeTable:row.label==='maximRevenue',
        advertisingExamples:row.label==='marketingInvestment',
        iconName:row.icon||sectionIconFor(section)
      }));
  }
  function populateSectionHelp(section){
    const modal=document.getElementById('sectionHelpModal');
    if(!modal||!currentModel)return;
    if(section==='roi'||section==='payback'){
      const pt=Localization.getLanguage()==='pt-BR';
      const title=section==='roi'?(pt?'ROI — 12 meses':'ROI — 12 months'):(pt?'Prazo de retorno':'Payback period');
      const iconName=section==='roi'?'roi':'calendar';
      const eyebrowEl=document.getElementById('sectionHelpEyebrow');
      const titleEl=document.getElementById('sectionHelpTitle');
      const subtitleEl=document.getElementById('sectionHelpSubtitle');
      const iconEl=document.getElementById('sectionHelpIcon');
      const currencyEl=document.getElementById('sectionHelpCurrency');
      const listEl=document.getElementById('sectionHelpList');
      if(eyebrowEl)eyebrowEl.textContent=Localization.t('sectionHelpEyebrow');
      if(titleEl)titleEl.textContent=title;
      if(subtitleEl)subtitleEl.textContent=pt?'Como interpretar este indicador no business case atual.':'How to interpret this indicator in the current business case.';
      if(iconEl)iconEl.innerHTML=icon(iconName);
      if(currencyEl){currencyEl.hidden=true;currencyEl.textContent='';}
      const s=currentModel.summary||{};
      let body='';
      if(section==='roi'){
        body=pt
          ? `O ROI de 12 meses compara o lucro líquido projetado no período com o investimento total projetado. Neste cenário, o investimento é ${money(s.totalInvestment||0)}, o lucro líquido projetado é ${money(s.netProfit||0)} e o ROI calculado é ${Math.round(Number(s.roi)||0)}%. Um ROI positivo indica retorno acima do valor investido; ele não representa garantia de resultado real.`
          : `The 12-month ROI compares projected net profit for the period with projected total investment. In this scenario, investment is ${money(s.totalInvestment||0)}, projected net profit is ${money(s.netProfit||0)}, and calculated ROI is ${Math.round(Number(s.roi)||0)}%. A positive ROI indicates a return above the invested amount; it is not a guarantee of actual results.`;
      }else{
        const pb=s.paybackPeriod;
        body=pt
          ? (pb?`Prazo de retorno é o primeiro mês em que o resultado acumulado do projeto deixa de ser negativo. Neste cenário, a recuperação integral do investimento é estimada para o mês ${pb}.`:'Prazo de retorno é o primeiro mês em que o resultado acumulado do projeto deixa de ser negativo. Neste cenário, o investimento não é recuperado dentro dos 12 meses projetados.')
          : (pb?`Payback period is the first month when the project's accumulated result is no longer negative. In this scenario, full investment recovery is estimated in month ${pb}.`:'Payback period is the first month when the project’s accumulated result is no longer negative. In this scenario, the investment is not recovered within the 12-month projection.');
      }
      if(listEl)listEl.innerHTML=`<article class="section-help-item"><div class="section-help-item-icon" aria-hidden="true">${icon(iconName)}</div><div class="section-help-item-copy"><h3>${esc(title)}</h3><p>${helpTextToHtml(body)}</p></div></article>`;
      modal.dataset.section=section;
      return;
    }
    const rows=tableRows(currentModel);
    const sectionRow=rows.find(row=>row.section===section&&row.title)||rows.find(row=>row.section===section);
    const title=Localization.t(sectionRow?.title||section);
    modal.dataset.section=section;
    const eyebrowEl=document.getElementById('sectionHelpEyebrow');
    const titleEl=document.getElementById('sectionHelpTitle');
    const subtitleEl=document.getElementById('sectionHelpSubtitle');
    const iconEl=document.getElementById('sectionHelpIcon');
    const currencyEl=document.getElementById('sectionHelpCurrency');
    const listEl=document.getElementById('sectionHelpList');
    if(eyebrowEl)eyebrowEl.textContent=Localization.t('sectionHelpEyebrow');
    if(titleEl)titleEl.textContent=title;
    if(subtitleEl)subtitleEl.textContent=Localization.t('sectionHelpSubtitle');
    if(iconEl)iconEl.innerHTML=icon(sectionIconFor(section));
    if(currencyEl){
      // Keep currency out of indicator names, but explain the unit once per section.
      // RECEITAS mixes order-count indicators with one monetary indicator, so it needs a specific note.
      if(section==='operations'){
        currencyEl.hidden=false;
        currencyEl.textContent=Localization.t('sectionCurrencyCommissionNote');
      }else if(['investment','expenses','profit'].includes(section)){
        currencyEl.hidden=false;
        currencyEl.textContent=Localization.t('sectionCurrencyNote');
      }else{
        currencyEl.hidden=true;
        currencyEl.textContent='';
      }
    }
    if(listEl){
      listEl.innerHTML=sectionHelpRows(section,currentModel).map(item=>`<article class="section-help-item"><div class="section-help-item-icon" aria-hidden="true">${icon(item.iconName)}</div><div class="section-help-item-copy"><h3>${esc(item.label)}</h3><p>${helpTextToHtml(item.description)}</p>${item.advertisingExamples?`<button class="advertising-examples-trigger" type="button" data-open-advertising-examples>${esc(Localization.t('advertisingExamplesButton'))} →</button>`:''}${item.feeTable?technologyFeeTableHtml():''}${item.note?`<div class="section-help-inline-note">${esc(item.note)}</div>`:''}</div></article>`).join('');
    }
  }
  function openSectionHelp(section,trigger){
    const modal=document.getElementById('sectionHelpModal');
    if(!modal||!currentModel)return;
    activeHelpSection=section;
    helpReturnFocus=trigger||document.activeElement;
    populateSectionHelp(section);
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('section-help-open');
    requestAnimationFrame(()=>modal.querySelector('[data-close-section-help]')?.focus());
  }
  function advertisingExamplesHtml(){
    const items=[
      {file:'vehicle-branding.jpg',titleKey:'advertisingVehicleTitle',textKey:'advertisingVehicleText',zoom:true,cls:'vehicle'},
      {file:'moto-uniform.jpg',titleKey:'advertisingUniformTitle',textKey:'advertisingUniformText',zoom:true,cls:'uniform'},
      {file:'outdoor.jpg',titleKey:'advertisingOutdoorTitle',textKey:'advertisingOutdoorText',zoom:false,cls:'outdoor privacy-crop'},
      {file:'printed-materials.jpg',titleKey:'advertisingPrintTitle',textKey:'advertisingPrintText',zoom:false,cls:'print privacy-crop'},
      {file:'promotional-action.jpg',titleKey:'advertisingPromoTitle',textKey:'advertisingPromoText',zoom:true,cls:'promo'},
      {file:'motoparade.jpg',titleKey:'advertisingMotoparadeTitle',textKey:'advertisingMotoparadeText',zoom:true,cls:'motoparade'}
    ];
    return items.map(item=>{const title=Localization.t(item.titleKey);const image=`assets/advertising/${item.file}`;const media=item.zoom?`<button class="advertising-example-image-button" type="button" data-advertising-image="${image}" data-advertising-title="${esc(title)}" aria-label="${esc(Localization.t('advertisingPhotoAlt',{title}))}"><img src="${image}" alt="${esc(Localization.t('advertisingPhotoAlt',{title}))}" loading="lazy"></button>`:`<div class="advertising-example-image-static" aria-hidden="true"><img src="${image}" alt="" loading="lazy"></div>`;return `<article class="advertising-example-card ${item.cls}">${media}<div class="advertising-example-copy"><h3>${esc(title)}</h3><p>${esc(Localization.t(item.textKey))}</p></div></article>`;}).join('');
  }
  function populateAdvertisingExamples(){const modal=document.getElementById('advertisingExamplesModal');if(!modal)return;document.getElementById('advertisingExamplesEyebrow').textContent=Localization.t('advertisingExamplesEyebrow');document.getElementById('advertisingExamplesTitle').textContent=Localization.t('advertisingExamplesTitle');document.getElementById('advertisingExamplesSubtitle').textContent=Localization.t('advertisingExamplesSubtitle');document.getElementById('advertisingExamplesGallery').innerHTML=advertisingExamplesHtml();const note=document.getElementById('advertisingExamplesNote');if(note)note.textContent=Localization.t('advertisingExamplesNote');modal.querySelector('[data-close-advertising-examples]')?.setAttribute('aria-label',Localization.t('advertisingExamplesClose'));}
  function openAdvertisingExamples(trigger){const modal=document.getElementById('advertisingExamplesModal');if(!modal)return;advertisingReturnFocus=trigger||document.activeElement;populateAdvertisingExamples();const help=document.getElementById('sectionHelpModal');if(help&&!help.hidden)help.setAttribute('aria-hidden','true');modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('advertising-examples-open');requestAnimationFrame(()=>modal.querySelector('[data-close-advertising-examples]')?.focus());}
  function closeAdvertisingExamples(){const modal=document.getElementById('advertisingExamplesModal');if(!modal||modal.hidden)return;modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('advertising-examples-open');const help=document.getElementById('sectionHelpModal');if(help&&!help.hidden)help.setAttribute('aria-hidden','false');const target=advertisingReturnFocus;advertisingReturnFocus=null;if(target&&typeof target.focus==='function')requestAnimationFrame(()=>target.focus());}
  function openAdvertisingImage(src,title){const modal=document.getElementById('advertisingImageModal');if(!modal)return;const img=modal.querySelector('img');if(img){img.src=src;img.alt=title||'';}const caption=document.getElementById('advertisingImageCaption');if(caption)caption.textContent=title||'';modal.hidden=false;modal.setAttribute('aria-hidden','false');}
  function closeAdvertisingImage(){const modal=document.getElementById('advertisingImageModal');if(!modal||modal.hidden)return;modal.hidden=true;modal.setAttribute('aria-hidden','true');}

  function closeSectionHelp(){
    const modal=document.getElementById('sectionHelpModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('section-help-open');
    activeHelpSection='';
    const target=helpReturnFocus;
    helpReturnFocus=null;
    if(target&&typeof target.focus==='function')requestAnimationFrame(()=>target.focus());
  }

  function renderKpis(model,state){
    const grid=document.getElementById('kpiGrid');
    if(!grid)return;
    const cities=Array.isArray(window.CityData)?window.CityData:[];
    const city=cities.find(x=>x.id===state.selectedCityId)||state.selectedCitySnapshot||null;
    const fmtNum=v=>Math.round(Number(v)||0).toLocaleString('pt-BR');
    const cityName=city?`${esc(city.city)}, ${esc(city.state)}`:'—';
    const cityPopulation=city?fmtNum(city.population):fmtNum(model.assumptions?.population||0);
    const serviceAreaPopulation=Number(model.summary?.serviceAreaPopulation||model.assumptions?.serviceAreaPopulation||city?.population||0);
    const regionalMeta=city&&serviceAreaPopulation>Number(city.population)?` · <strong>${Localization.t('serviceAreaPopulationLabel')}:</strong> ${fmtNum(serviceAreaPopulation)}`:'';
    const cityInitialPayment=city?money(city.initialPayment):money(model.assumptions?.initialInvestment||0);
    const avgSub=`${Localization.t('averageMonthlyInvestment')}: ${compactMoney(model.summary.averageMonthlyInvestment||0)}`;
    const monthlyBreakEven=model.summary.breakEvenPeriod?`${Localization.t('month')} ${model.summary.breakEvenPeriod}`:Localization.t('notAchieved12');
    const cityCard=`<article class="kpi-card city-context-card"><div class="kpi-icon">${icon('city')}</div><div class="city-context-content"><div class="kpi-label">${Localization.t('selectedCity')}</div><div class="city-context-name">${cityName}</div><div class="city-context-meta"><span><strong>${Localization.t('populationHeader')}:</strong> ${cityPopulation}${regionalMeta} · <strong>${Localization.t('initialPaymentHeader')}:</strong> ${cityInitialPayment}</span></div></div></article>`;
    const items=[
      {k:'initialInvestment',color:'yellow',icon:icon('briefcase'),val:model.summary.totalInvestment,sub:avgSub,fmt:v=>compactMoney(v)},
      {k:'breakEven',color:'green',icon:icon('target'),val:model.summary.paybackPeriod||0,sub:`${Localization.t('monthlyEquilibrium')}: ${monthlyBreakEven}`,fmt:v=>`${model.summary.paybackPeriod?Localization.t('month')+' '+Math.round(v):Localization.t('notAchieved12')}`},
      {k:'yearProfit',color:'blue',icon:icon('profit'),val:model.summary.netProfit,fmt:v=>compactMoney(v)},
      {k:'roi12',color:'purple',icon:icon('roi'),val:model.summary.roi,fmt:v=>`${Math.round(v)}%`}
    ];
    grid.innerHTML=cityCard+items.map(i=>`<article class="kpi-card ${i.color} kpi-${i.k}"><div class="kpi-icon">${i.icon}</div><div><div class="kpi-label">${Localization.t(i.k)}${i.tooltip?infoTooltip(i.tooltip,'kpi-title-tooltip'):''}</div><div class="kpi-value" id="kpi-${i.k}"></div>${i.sub?`<div class="kpi-sub">${i.sub}</div>`:''}</div></article>`).join('');
    const chartCard=document.querySelector('#dashboard .chart-card');
    if(chartCard){
      chartCard.classList.remove('kpi-chart-card');
      const badge=chartCard.querySelector('.chart-roi-badge');
      if(badge) badge.remove();
    }
    items.forEach(i=>Animation.animateNumber(document.getElementById('kpi-'+i.k),i.k,i.val,i.fmt));
  }
  function renderTable(model){const tbl=document.getElementById('modelTable');const displayMonths=getDisplayMonths(model);const heads=[Localization.t('setupPreparation'),...Array.from({length:12},(_,i)=>i+1)];const rows=tableRows(model);const colgroup='<colgroup><col class="col-section"><col class="col-metric">'+heads.map(()=>'<col class="col-period">').join('')+'</colgroup>';let html=`${colgroup}<thead><tr class="phase"><th colspan="2"></th><th colspan="1">${Localization.t('preOpening')}</th><th colspan="12">${Localization.t('growthPhase')}</th></tr><tr><th>${Localization.t('section')}</th><th>${Localization.t('indicator')}</th>${heads.map((h,i)=>`<th class="${model.summary.paybackKey===displayMonths[i]?.key?'breakeven':''}">${h}</th>`).join('')}</tr></thead><tbody>`;let last='';rows.forEach(row=>{const first=row.section!==last;last=row.section;const rowCls=[row.total?'table-total-row':'',row.financial?'table-financial-row':''].filter(Boolean).join(' ');html+=`<tr${rowCls?` class="${rowCls}"`:''}>${first?`<td class="row-label section-name section-title table-section-title ${row.section}" rowspan="${rows.filter(r=>r.section===row.section).length}">${sectionTitleHtml(row)}</td>`:''}<td class="row-label metric-name table-row-label ${row.section}">${esc(tableRowLabel(row))}</td>`;displayMonths.forEach(m=>{const val=row.value(m);const blankCombined=shouldBlankCombined(row,m);const empty=blankCombined||((m.isPrep||m.isSetup)&&val===0&&!['netCashFlow','accumulatedCashFlow'].includes(row.label));const editable=(row.marketingEditable||row.ridesEditable)&&!empty&&!m.isCombinedPreOpening;const cls=['table-cell',row.total?'table-total-cell':'',row.financial?'table-financial-cell':'',row.subtotal?'subtotal':'',row.sign?(val<0?'negative':val>0?'positive':''):'',model.summary.paybackKey===m.key?'breakeven':'',empty?'muted-cell':'',editable?'editable-month-cell':''].filter(Boolean).join(' ');let data='';if(row.marketingEditable&&editable)data=` data-month-edit="marketing" data-month-no="${m.monthNo}" data-current-pct="${m.marketingPct}" title="Double click to edit % of Marketing Budget"`;if(row.ridesEditable&&editable)data=` data-month-edit="rides" data-month-no="${m.monthNo}" data-current-pct="${m.ridesPct}" title="Double click to edit % of month 12 orders"`;let content=empty?'':row.fmt(val);if(editable)content=`<div class="cell-absolute">${row.fmt(val)}</div>`;html+=`<td data-recalc class="${cls}"${data}>${content}</td>`});html+='</tr>'});html+='</tbody>';tbl.innerHTML=html}
  function renderSummary(model){
    const header=document.querySelector('.summary-card h3');
    if(header)header.textContent=Localization.t('summary12');
    const rows=[['totalInvestment',model.summary.totalInvestment,'currency'],['grossRevenue',model.summary.totalGrossRevenue,'currency'],['totalOperatingExpenses',model.summary.totalOperatingExpenses,'currency'],['netProfit',model.summary.netProfit,'currency'],['roi12',model.summary.roi,'%'],['paybackPeriod',model.summary.paybackPeriod?Localization.t('month')+' '+model.summary.paybackPeriod:Localization.t('notAchieved12'),'']];
    document.getElementById('summaryList').innerHTML=rows.map(r=>{
      const cls=r[0]==='totalOperatingExpenses'?'summary-expense-row':(r[0]==='totalInvestment'?'summary-investment-row':(r[0]==='netProfit'?'summary-profit-row':''));
      const value=typeof r[1]==='number'?(r[2]==='%'?Math.round(r[1])+'%':money(r[1])):r[1];
      const labelKey=r[0]==='totalOperatingExpenses'?'summaryOperatingExpenses':r[0];
      return `<div class="summary-row ${cls}"><span>${Localization.t(labelKey)}</span><span>${value}</span></div>`;
    }).join('')+`<div class="summary-explanation">${esc(Localization.t('scenarioProjectionNote'))}</div><div class="summary-tax-disclaimer">${esc(Localization.t('taxDisclaimer'))}</div>`;
  }
  function getInsightRows(model){
    const a=model.assumptions||{};
    const s=model.summary||{};
    const recommendedBudget=Math.max(0,Number(s.recommendedMarketingBudget||a.recommendedMarketingBudget||0));
    const budget=Math.max(0,Number(a.marketingBudget||0));
    const budgetRatio=recommendedBudget>0?budget/recommendedBudget:0;
    const budgetPercent=Math.round(budgetRatio*100);
    const recommendedFare=Math.max(0.01,Number(a.recommendedAverageFare||FinancialEngine.recommendedAverageFareForPopulation(a.population)||1));
    const fare=Math.max(0.01,Number(a.averageFare||recommendedFare));
    const fareRatio=fare/recommendedFare;
    const recommendedCommission=Number(a.recommendedCommission??FinancialEngine.recommendedCommissionForPopulation(a.population));
    const commission=Number(a.commission||0);
    const commissionDiff=commission-recommendedCommission;
    const baseRides=Math.max(0,Number(s.baseTargetRidesDay||0));
    const targetRides=Math.max(0,Number(s.targetRidesDay||0));
    const demandRatio=baseRides>0?targetRides/baseRides:0;
    const breakEvenMonth=s.breakEvenPeriod?`${Localization.t('month')} ${Math.round(s.breakEvenPeriod)}`:Localization.t('notAchieved12');
    const paybackMonth=s.paybackPeriod?`${Localization.t('month')} ${Math.round(s.paybackPeriod)}`:Localization.t('notAchieved12');
    const rows=[];

    if(s.isMicroCityRegionalModel&&s.usesRegionalServiceArea){
      rows.push({icon:'city',tone:'info',title:'regionalMicroCityTitle',text:'regionalMicroCityInsight',vars:{cityPopulation:Math.round(Number(s.cityPopulation||a.population||0)).toLocaleString('pt-BR'),servicePopulation:Math.round(Number(s.serviceAreaPopulation||a.serviceAreaPopulation||0)).toLocaleString('pt-BR')}});
    }else if(s.isMicroCityRegionalModel){
      rows.push({icon:'city',tone:'warning',title:'localOnlyMicroCityTitle',text:'localOnlyMicroCityInsight',vars:{cityPopulation:Math.round(Number(s.cityPopulation||a.population||0)).toLocaleString('pt-BR')}});
    }

    if(s.marketDataAvailable){
      const economicRatio=Math.max(0,Number(s.economicRatio||1));
      const densityRatio=Math.max(0,Number(s.densityRatio||1));
      let text='marketBalancedText';
      if(!s.marketEconomicDataAvailable||!s.marketDensityDataAvailable)text='marketDataLimitedText';
      else if(densityRatio>=1.6&&economicRatio>=1.25)text='marketDenseEconomicText';
      else if(densityRatio>=1.6)text='marketDenseText';
      else if(densityRatio<=0.6)text='marketSparseText';
      else if(economicRatio>=1.35)text='marketEconomicAboveText';
      else if(economicRatio<=0.7)text='marketEconomicBelowText';
      rows.push({icon:'city',tone:'info',title:'marketContextTitle',text,vars:{}});
    }else{
      rows.push({icon:'city',tone:'info',title:'marketContextTitle',text:'marketDataLimitedText',vars:{}});
    }

    const competitionLevel=String(s.competitionLevel||a.competitionLevel||'Pending').trim().toLowerCase();
    if(competitionLevel==='very high')
      rows.push({icon:'target',tone:'warning',title:'competitionVeryHighTitle',text:'competitionVeryHighText',vars:{}});
    else if(competitionLevel==='high')
      rows.push({icon:'target',tone:'warning',title:'competitionHighTitle',text:'competitionHighText',vars:{}});
    else if(competitionLevel==='medium')
      rows.push({icon:'target',tone:'info',title:'competitionMediumTitle',text:'competitionMediumText',vars:{}});
    else
      rows.push({icon:'target',tone:'info',title:'competitionPendingTitle',text:'competitionPendingText',vars:{}});

    if(budget<=0){
      rows.push({icon:'briefcase',tone:'danger',title:'budgetZeroTitle',text:'budgetZeroInsight',vars:{}});
    }else if(budgetRatio<0.3){
      rows.push({icon:'briefcase',tone:'danger',title:'budgetCriticalTitle',text:'budgetCriticalInsight',vars:{percent:budgetPercent,recommended:compactMoney(recommendedBudget)}});
    }else if(budgetRatio<0.7){
      rows.push({icon:'briefcase',tone:'warning',title:'budgetBelowTitle',text:'budgetBelowInsight',vars:{percent:budgetPercent,recommended:compactMoney(recommendedBudget)}});
    }else if(budgetRatio<=1.3){
      rows.push({icon:'briefcase',tone:'success',title:'budgetBalancedTitle',text:'budgetBalancedInsight',vars:{percent:budgetPercent,recommended:compactMoney(recommendedBudget)}});
    }else{
      rows.push({icon:'briefcase',tone:'warning',title:'budgetExcessTitle',text:'budgetExcessInsight',vars:{percent:budgetPercent,recommended:compactMoney(recommendedBudget)}});
    }

    if(targetRides<=Math.max(1,baseRides*0.05)){
      rows.push({icon:'growth',tone:'danger',title:'noDemandGrowth',text:'noDemandGrowthText',vars:{}});
    }else{
      const constraints=[];
      if(fareRatio>1.1)constraints.push(Localization.t('fareAboveRecommendation',{percent:Math.round((fareRatio-1)*100)}));
      if(commissionDiff>3)constraints.push(Localization.t('commissionAboveRecommendation',{points:Math.round(commissionDiff*10)/10}));
      const supports=[];
      if(fareRatio<0.9)supports.push(Localization.t('fareBelowRecommendation',{percent:Math.round((1-fareRatio)*100)}));
      if(commissionDiff<-3)supports.push(Localization.t('commissionBelowRecommendation',{points:Math.round(Math.abs(commissionDiff)*10)/10}));
      const joiner=Localization.t('insightJoiner');
      if(constraints.length){
        rows.push({icon:'growth',tone:'warning',title:'parameterConstraintsTitle',text:'parameterConstraintsText',vars:{details:constraints.join(joiner),rides:Math.round(targetRides)}});
      }else if(supports.length){
        rows.push({icon:'growth',tone:'info',title:'demandSupportTitle',text:'demandSupportText',vars:{details:supports.join(joiner),rides:Math.round(targetRides)}});
      }else if(demandRatio>1.1){
        rows.push({icon:'growth',tone:'info',title:'marketCapacityTitle',text:'marketCapacityText',vars:{rides:Math.round(targetRides),base:Math.round(baseRides)}});
      }else if(demandRatio>=0.85){
        rows.push({icon:'growth',tone:'success',title:'balancedDemandTitle',text:'balancedDemandText',vars:{rides:Math.round(targetRides)}});
      }else{
        rows.push({icon:'growth',tone:'warning',title:'limitedDemandTitle',text:'limitedDemandText',vars:{rides:Math.round(targetRides),base:Math.round(baseRides)}});
      }
    }

    if(s.netProfit<0){
      rows.push({icon:'coin',tone:'danger',title:'negativeResult',text:'negativeResultText',vars:{profit:compactMoney(s.netProfit)}});
    }else if(s.roi<20){
      rows.push({icon:'coin',tone:'warning',title:'lowProfitability',text:'lowProfitabilityText',vars:{profit:compactMoney(s.netProfit),roi:Math.round(s.roi)+'%'}});
    }else if(s.roi<60){
      rows.push({icon:'coin',tone:'info',title:'moderateProfitability',text:'moderateProfitabilityText',vars:{profit:compactMoney(s.netProfit),roi:Math.round(s.roi)+'%'}});
    }else{
      rows.push({icon:'coin',tone:'success',title:'highProfitability',text:'profitText',vars:{profit:compactMoney(s.netProfit),roi:Math.round(s.roi)+'%'}});
    }

    if(s.paybackPeriod&&s.paybackPeriod<=6){
      rows.push({icon:'balance',tone:'success',title:'rapidPayback',text:'rapidPaybackText',vars:{month:paybackMonth}});
    }else if(s.paybackPeriod){
      rows.push({icon:'balance',tone:'success',title:'paybackWithinYear',text:'cashText',vars:{month:paybackMonth}});
    }else if(s.breakEvenPeriod){
      rows.push({icon:'balance',tone:'warning',title:'operatingPositiveNoPayback',text:'operatingPositiveNoPaybackText',vars:{month:breakEvenMonth}});
    }else{
      rows.push({icon:'balance',tone:'danger',title:'noPayback',text:'noPaybackText',vars:{}});
    }
    return rows;
  }
  function renderInsights(model){
    const rows=getInsightRows(model);
    const list=document.getElementById('insightsList');
    if(!list)return;
    const renderedRows=rows.map(row=>({
      ...row,
      renderedTitle:Localization.t(row.title),
      renderedText:Localization.t(row.text,row.vars||{})
    }));
    // Summaries retain the exact source wording; the full explanation opens in a dialog.
    list.removeAttribute('data-density');
    list.removeAttribute('data-fit');
    const brief=text=>{const sentence=text.split(/(?<=[.!?])\s+/)[0];return sentence.length>110?sentence.slice(0,107).replace(/\s+\S*$/,'')+'…':sentence;};
    list.innerHTML=renderedRows.map(row=>`<div class="insight" data-tone="${row.tone||'neutral'}"><div class="insight-badge">${icon(row.icon)}</div><div class="insight-copy"><div class="insight-title">${esc(row.renderedTitle)}</div><div class="insight-text">${esc(brief(row.renderedText))}</div><button type="button" class="insight-more" data-insight-detail aria-label="${esc(Localization.t('sectionHelpAction')+': '+row.renderedTitle)}"><span aria-hidden="true">ⓘ</span></button><template class="insight-full"><p>${esc(row.renderedText)}</p></template></div></div>`).join('');
  }
  const basic=['marketingBudget'];
  function inputLabel(k){if(k==='averageFare')return Localization.t('averageRidePrice');if(k==='commission')return Localization.t('commissionFromCompletedRidesPct');if(k==='initialInvestment')return Localization.t('initialInvestmentInput');return Localization.t(k)}
  function renderInputs(state,errors){
    const gridEl=document.getElementById('inputsGrid');
    const panel=document.getElementById('validationPanel');
    if(!gridEl){return}
    const normalized=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);state.activeScenario.assumptions=normalized;
    const currencyHtml=`<div class="input-row fixed-currency-row"><label>${Localization.t('currency')}</label><strong>R$</strong></div>`;
    const formHtml=basic.map(k=>`<div class="input-row ${errors[k]?'invalid':''}"><label for="input-${k}">${labelWithCurrency(inputLabel(k))}</label><input id="input-${k}" data-input="${k}" type="number" step="${['commission','percentagePopulationUsingService'].includes(k)?'0.01':'1'}" value="${normalized[k]}"></div>`).join('');
    const presetManager=`<div class="preset-manager"><div class="preset-row"><label>${Localization.t('marketingDistributionPreset')}</label><select data-preset="marketing"><option value="balanced" ${normalized.marketingDistributionPreset==='balanced'?'selected':''}>Balanced</option><option value="launchHeavy" ${normalized.marketingDistributionPreset==='launchHeavy'?'selected':''}>Launch heavy</option><option value="growth" ${normalized.marketingDistributionPreset==='growth'?'selected':''}>Growth</option><option value="manual" ${normalized.marketingDistributionPreset==='manual'?'selected':''}>Manual</option></select></div><div class="preset-row"><label>${Localization.t('ridesDistributionPreset')}</label><select data-preset="rides"><option value="balanced" ${normalized.ridesDistributionPreset==='balanced'?'selected':''}>Balanced</option><option value="slow" ${normalized.ridesDistributionPreset==='slow'?'selected':''}>Slow build</option><option value="aggressive" ${normalized.ridesDistributionPreset==='aggressive'?'selected':''}>Aggressive</option><option value="manual" ${normalized.ridesDistributionPreset==='manual'?'selected':''}>Manual</option></select></div><div class="preset-hint">${Localization.t('presetHint')}</div></div>`;
    const expenseRows=(normalized.expenseRows||[]).filter(r=>!r.hidden&&r.id!=='other_costs').map(r=>{
      const fixed=r.fixedType==='assistant'||r.id==='assistente';
      return `<div class="expense-edit-row"><label class="expense-visible-toggle"><input type="checkbox" data-expense-visible="${r.id}" ${r.showInModel!==false?'checked':''} ${fixed?'disabled':''}> ${Localization.t('show')}</label><input class="expense-name" data-expense-name="${r.id}" value="${esc(fixed?Localization.t('assistente'):r.name)}" aria-label="${esc(Localization.t('expenseName'))}" ${fixed?'disabled':''}><input class="expense-amount" type="${fixed?'text':'number'}" data-expense-amount="${r.id}" value="${fixed?'250 / 500':r.amount}" aria-label="${esc(Localization.t('expenseAmount'))}" ${fixed?'disabled':''}><button class="btn danger expense-delete" data-expense-delete="${r.id}" ${r.removable===false?'disabled':''}>×</button></div>`
    }).join('');
    const expenseManager=`<div class="expense-manager"><div class="expense-manager-head"><strong>${Localization.t('operatingExpenses')}</strong><button class="btn secondary" id="addExpenseRow" type="button">${Localization.t('addRow')}</button></div>${expenseRows}</div>`;
    const revenueRules=(normalized.revenueRules||[]).map(r=>`<div class="revenue-rule-row"><span>${Localization.t('feeFrom')}</span><input type="number" data-rule-threshold="${r.id}" value="${r.threshold}"><span>${activeCurrency}</span><span>=</span><input type="number" data-rule-share="${r.id}" value="${r.maximShare}" min="0" max="100"><span>%</span><button class="btn danger revenue-rule-delete" data-rule-delete="${r.id}" ${r.removable===false?'disabled':''}>×</button></div>`).join('');
    const ruleManager=`<div class="revenue-rule-manager"><div class="expense-manager-head"><strong>${Localization.t('revenueDistributionRules')}</strong><button class="btn secondary" id="addRevenueRule" type="button">${Localization.t('addRule')}</button></div>${revenueRules}<div class="preset-hint">${Localization.t('revenueRulesHint')}</div></div>`;
    gridEl.innerHTML=formHtml+(state.advanced?'<div class="advanced-title">'+Localization.t('advancedSettings')+'</div>'+currencyHtml+presetManager:'');
    const list=Object.values(errors);if(panel){panel.hidden=!list.length;panel.innerHTML=list.join('<br>')}
  }
  function renderLegend(){const legendEl=document.getElementById('legendList');if(!legendEl)return;legendEl.innerHTML=`<div class="legend-list"><div class="legend-item"><span class="swatch investment"></span>${Localization.t('investmentLegend')}</div><div class="legend-item"><span class="swatch operations"></span>${Localization.t('operationsLegend')}</div><div class="legend-item"><span class="swatch expenses"></span>${Localization.t('expensesLegend')}</div><div class="legend-item"><span class="swatch profit"></span>${Localization.t('profitLegend')}</div></div>`}
  function renderScenarioSelect(state){const sel=document.getElementById('scenarioSelect');if(!sel)return;sel.innerHTML=`<option value="base">Reference demand scenario</option>`;sel.value='base';}
  function renderAll(state,model,errors={}){
    activeCurrency='R$';
    currentModel=model;
    Localization.setLanguage(state.language);
    const languageSelect=document.getElementById('languageSelect');
    if(languageSelect)languageSelect.value=state.language;
    const modeToggle=document.getElementById('modeToggle');
    if(modeToggle)modeToggle.textContent=Localization.t(state.advanced?'basicSettings':'advancedSettings');
    renderKpis(model,state);
    renderTable(model);
    renderSummary(model);
    renderInsights(model);
    renderLegend();
    const notesArea=document.getElementById('notesArea');
    if(notesArea)notesArea.value=state.activeScenario.notes||'';
    Charts.render(model);
    if(activeHelpSection)populateSectionHelp(activeHelpSection);
    setTimeout(Animation.flashCells,10);
  }
  return{renderAll,getTableRows,getDetailedTableData,getDisplayMonths,getInsightRows,openSectionHelp,closeSectionHelp,openAdvertisingExamples,closeAdvertisingExamples,openAdvertisingImage,closeAdvertisingImage}
})();

document.addEventListener('click',event=>{
  const advertisingTrigger=event.target.closest('[data-open-advertising-examples]');
  if(advertisingTrigger){event.preventDefault();event.stopPropagation();UIRenderer.openAdvertisingExamples(advertisingTrigger);try{Analytics?.track?.('advertising_examples_opened',{});}catch(_e){}return;}
  if(event.target.closest('[data-close-advertising-examples]')){event.preventDefault();UIRenderer.closeAdvertisingExamples();return;}
  const advertisingImage=event.target.closest('[data-advertising-image]');
  if(advertisingImage){event.preventDefault();event.stopPropagation();UIRenderer.openAdvertisingImage(advertisingImage.dataset.advertisingImage,advertisingImage.dataset.advertisingTitle||'');return;}
  if(event.target.closest('[data-close-advertising-image]')){event.preventDefault();UIRenderer.closeAdvertisingImage();return;}
  const trigger=event.target.closest('[data-section-help]');
  if(trigger){
    event.preventDefault();
    event.stopPropagation();
    UIRenderer.openSectionHelp(trigger.dataset.sectionHelp,trigger);
    try{Analytics?.track?.('section_help_opened',{section:trigger.dataset.sectionHelp||''});}catch(_e){}
    return;
  }
  if(event.target.closest('[data-close-section-help]')){
    event.preventDefault();
    UIRenderer.closeSectionHelp();
  }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const image=document.getElementById('advertisingImageModal');const examples=document.getElementById('advertisingExamplesModal');if(image&&!image.hidden){UIRenderer.closeAdvertisingImage();return;}if(examples&&!examples.hidden){UIRenderer.closeAdvertisingExamples();return;}UIRenderer.closeSectionHelp();}});
