'use strict';
const App=(()=>{
  let state, model, errors={};
  let startFilterState='', startFilterCityId='';
  let salesFlowActive=false, salesFlowStep=0, leadFormStarted=false, conversionCompleted=false, detailedReturnToBusinessCase=false;

  const cities=()=>Array.isArray(window.CityData)?window.CityData:CityData;
  const cityById=id=>cities().find(c=>c.id===id)||null;
  const states=()=>[...new Set(cities().map(c=>c.state))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const fmtNumber=v=>Math.round(Number(v)||0).toLocaleString('pt-BR');
  const fmtBRL=v=>FinancialEngine.formatCurrencyFull(v);
  const fmtBRLCompact=v=>FinancialEngine.formatCurrencyCompact(v);

  const marketFieldNames=['ibgeCode','areaKm2','censusPopulation2022','density','schoolEnrollment','idhm','gdpPerCapita','stateMedianDensity','stateMedianGdpPerCapita','stateMedianIdhm','competitionLevel','competitionConfidence'];
  function copyCityMarketData(target,city){
    marketFieldNames.forEach(key=>{target[key]=city&&city[key]!=null?city[key]:(key==='competitionLevel'?'Pending':0);});
    return target;
  }
  function currentMarketProfile(){
    return state?.activeScenario?.assumptions||cityById(state?.selectedCityId)||{};
  }


  const SALES_COPY={
    'pt-BR':{
      progress:'Seu business case',changeCity:'Alterar cidade',step:'Etapa',of:'de',
      s1Eyebrow:'POTENCIAL DA CIDADE',s1Title:'Potencial estimado para {city}',s1Intro:'Comece pelos fatores que definem a escala do projeto. Estes números são uma projeção para orientar a análise e não uma garantia de resultado.',
      population:'População do município',serviceArea:'Área de atendimento considerada',ridesM12:'Corridas concluídas / dia no mês 12',investment:'Investimento projetado — 12 meses',competition:'Ambiente competitivo',pending:'A confirmar',medium:'Moderado',high:'Relevante',veryHigh:'Muito competitivo',
      pendingTitle:'Concorrência ainda não confirmada',pendingText:'Os dados disponíveis não permitem tratar o mercado como livre de concorrência. O cálculo aplica uma pequena margem de incerteza de mercado e recomenda validar aplicativos ativos, preços locais e presença de motoristas antes do lançamento.',
      nextRevenue:'Entender como a receita é formada',adjustParameters:'Ajustar parâmetros',
      s2Eyebrow:'COMO FUNCIONA O NEGÓCIO',s2Title:'Como a operação gera receita',s2Intro:'A lógica econômica é simples: a operação precisa transformar demanda em corridas concluídas. Em cada corrida concluída, a comissão configurada gera a receita bruta do parceiro antes das despesas previstas no modelo.',
      passengers:'Passageiros',orders:'Pedidos',drivers:'Motoristas parceiros',completedRides:'Corridas concluídas',rideValue:'Valor das corridas',commissionLabel:'Comissão',grossRevenue:'Receita bruta',
      formulaTitle:'Fórmula usada no cálculo',formulaExample:'Exemplo do mês 12: {rides} corridas × {fare} × {commission}% = {revenue} de receita bruta.',formulaAnnual:'No resultado anual, o cálculo soma a mesma lógica para cada um dos 12 meses.',
      nextCosts:'Ver investimento e responsabilidades',
      s3Eyebrow:'INVESTIMENTO E RESPONSABILIDADES',s3Title:'O que o cálculo inclui — e o que precisa ser validado',s3Intro:'Separar claramente os custos previstos dos custos externos evita interpretar a projeção como um orçamento completo de toda a operação local.',
      included:'Incluído no cálculo',notIncluded:'Não incluído automaticamente',initialFeeItem:'Taxa de licença inicial de {value}, tratada como saída de caixa de pré-abertura.',marketingItem:'Orçamento anual de marketing e desenvolvimento de {value}.',assistantItem:'Serviço Assistente: R$ 250 ou R$ 500 por mês, conforme a faixa de receita bruta usada pelo modelo.',techItem:'Taxa de tecnologia do serviço: 0% a 30% conforme a faixa mensal de receita bruta.',taxItem:'ISSQN, impostos sobre vendas, retenções e outras obrigações fiscais aplicáveis.',smsItem:'Notificações via SMS: o cálculo estima 1 SMS para cada 14 pedidos concluídos. Até R$ 3.000 de receita bruta mensal, o custo é zero; acima desse valor, cada SMS custa R$ 0,10.',localItem:'Outros custos locais do parceiro, se existirem (estrutura física, equipe local, contabilidade, banco e serviços locais), precisam ser confirmados para cada operação.',
      maximProvides:'O que a Maxim oferece',partnerDoes:'Seu papel no desenvolvimento do negócio',maxim1:'Base tecnológica pronta para a operação do serviço, com acesso às tecnologias e ferramentas necessárias para lançar e operar o serviço na cidade.',maxim2:'Suporte operacional em processos do dia a dia, incluindo atendimento de solicitações de motoristas, verificações, registro e recuperação de contas.',maxim3:'Apoio no desenvolvimento da unidade, incluindo orientação sobre preparação para o lançamento, desenvolvimento do serviço, análise de resultados e interação com as equipes responsáveis da Maxim.',maxim4:'Um gerente de desenvolvimento experiente e dedicado será designado ao parceiro para acompanhá-lo, ajudar na preparação do lançamento e apoiar o desenvolvimento da unidade após o início da operação.',partner1:'Desenvolver o serviço na sua cidade, fortalecendo a presença da Maxim no mercado local, atraindo usuários e formando uma comunidade ativa de motoristas.',partner2:'Promover a marca localmente com ações adequadas à realidade da cidade — divulgação online, mídia externa, adesivação de veículos, promoções e outros formatos — com apoio de recomendações e materiais da Maxim.',partner3:'Desenvolver e manter a comunidade de motoristas, ajudando a atrair novos motoristas, estimular a atividade e criar condições para a execução estável dos pedidos.',partner4:'Acompanhar as mudanças do mercado local e compartilhar informações relevantes sobre novos bairros e pontos populares, trânsito, concorrência e particularidades da demanda para apoiar ajustes no mapa, nas tarifas e na estratégia de desenvolvimento.',partner5:'Trabalhar em conjunto com a equipe Maxim e com seu gerente de desenvolvimento, analisando regularmente os resultados da unidade e definindo as próximas ações para o crescimento do negócio.',
      nextRisks:'Ver riscos do cenário',
      s4Eyebrow:'RISCOS E CONTROLES',s4Title:'O que pode fazer o resultado real ficar diferente',s4Intro:'A transparência dos riscos faz parte do business case. O objetivo não é reduzir o interesse, mas mostrar quais variáveis precisam ser acompanhadas após o lançamento.',
      riskMarket:'Mercado e concorrência',riskMarketText:'A presença e a intensidade dos concorrentes podem mudar o custo de aquisição e a velocidade de crescimento.',riskMarketAction:'Controle: validar concorrentes e preços locais antes do lançamento e revisar após o início da operação.',
      riskDemand:'Execução de marketing',riskDemandText:'O orçamento sozinho não garante demanda. Formato, frequência, localização e execução das campanhas influenciam os pedidos.',riskDemandAction:'Controle: acompanhar aquisição e ajustar o mix de divulgação com base nos resultados reais.',
      riskTariff:'Tarifa e atratividade',riskTariffText:'Preço alto pode reduzir pedidos; preço baixo demais pode diminuir a atratividade das corridas para motoristas.',riskTariffAction:'Controle: comparar rotas e preços do mercado e acompanhar recusas, cancelamentos e execução.',
      riskMap:'Mapa e operação local',riskMapText:'Endereços ou rotas incorretos podem reduzir a criação e a conclusão de pedidos.',riskMapAction:'Controle: manter o mapa atualizado e registrar mudanças de infraestrutura.',
      riskLegal:'Tributos e regras locais',riskLegalText:'Obrigações fiscais, transporte, publicidade e proteção de dados podem gerar custos ou exigências não calculados automaticamente.',riskLegalAction:'Controle: validar as obrigações locais antes do lançamento e considerar esses custos no plano final.',
      riskDisclaimer:'A projeção é uma simulação financeira. Resultados reais dependem da demanda, execução comercial e operacional, condições locais e cumprimento das obrigações aplicáveis.',
      nextCase:'Ver meu business case',
      s5Eyebrow:'SEU BUSINESS CASE',s5Title:'Seu business case para {city}',s5Intro:'Resumo da projeção com os parâmetros atuais. Use este quadro para discutir o lançamento e, se necessário, abrir o modelo detalhado.',
      totalInvestment:'Investimento projetado',grossRevenue12:'Receita bruta — 12 meses',opex12:'Despesas operacionais — 12 meses',netProfit12:'Lucro líquido — 12 meses',roi12:'ROI — 12 meses',payback:'Prazo de retorno',month:'Mês',notWithin:'Não atingido em 12 meses',trajectory:'Evolução do resultado acumulado',preOpeningNote:'A taxa de licença é tratada na pré-abertura; o mês 1 começa sem repetir esse desembolso.',scopeShort:'Escopo do cálculo',scopeShortText:'Inclui taxa de licença, marketing/desenvolvimento, Assistente, Notificações via SMS e taxa de tecnologia. Não inclui automaticamente tributos e custos locais específicos do parceiro.',
      savePdf:'Salvar em PDF',share:'Compartilhar resumo',openDetailed:'Ver modelo financeiro detalhado',openMonthlyDetail:'Ver detalhamento mês a mês',detailedPrompt:'Quer entender de onde vêm estes números?',detailedPromptText:'Veja a projeção mês a mês, receitas, despesas e resultado.',backToCase:'Voltar ao business case',monthlyBreakdownTitle:'Detalhamento mês a mês',monthlyBreakdownHint:'Abra uma seção e deslize horizontalmente para acompanhar a projeção de cada indicador.',preOpeningShort:'Pré-abertura',indicatorShort:'Indicador',talk:'Falar com especialista',back:'Voltar',viewGuide:'Ver guia',availabilityConfirmation:'Disponibilidade sujeita a confirmação',
      leadTitle:'Quer discutir este cálculo?',leadText:'Preencha apenas os dados que quiser incluir na mensagem. Ao continuar, o WhatsApp será aberto com o business case e seus dados; o aplicativo não armazena essas informações.',name:'Nome',phone:'Telefone / WhatsApp',email:'E-mail',leadButton:'Continuar no WhatsApp',leadPrivacy:'Os dados digitados não são enviados a um servidor por este Small App.',leadNameRequired:'Informe pelo menos seu nome para preparar a mensagem.',
      shared:'Resumo copiado para a área de transferência.',pdfHint:'Use a opção “Salvar como PDF” na janela de impressão.',
      desktopTitle:'Próximo passo',desktopText:'Transforme a projeção em um business case ou valide os números com um especialista.',desktopCase:'Ver business case',desktopPdf:'Salvar PDF',desktopTalk:'Falar com especialista'
    },
    en:{
      progress:'Your business case',changeCity:'Change city',step:'Step',of:'of',
      s1Eyebrow:'CITY POTENTIAL',s1Title:'Estimated potential for {city}',s1Intro:'Start with the factors that define the project scale. These figures are a projection for decision support, not a guarantee of results.',
      population:'Municipality population',serviceArea:'Service area considered',ridesM12:'Completed rides / day in month 12',investment:'Projected investment — 12 months',competition:'Competitive environment',pending:'To be confirmed',medium:'Moderate',high:'Relevant',veryHigh:'Highly competitive',
      pendingTitle:'Competition is not yet confirmed',pendingText:'Available data is not sufficient to treat the market as competition-free. The calculation applies a small market-uncertainty reserve and recommends validating active apps, local prices and driver presence before launch.',
      nextRevenue:'Understand how revenue is formed',adjustParameters:'Adjust parameters',
      s2Eyebrow:'HOW THE BUSINESS WORKS',s2Title:'How the operation generates revenue',s2Intro:'The economic logic is simple: the operation needs to turn demand into completed rides. On each completed ride, the configured commission generates partner gross revenue before the expenses included in the model.',
      passengers:'Passengers',orders:'Orders',drivers:'Partner drivers',completedRides:'Completed rides',rideValue:'Ride value',commissionLabel:'Commission',grossRevenue:'Gross revenue',
      formulaTitle:'Formula used in the calculation',formulaExample:'Month 12 example: {rides} rides × {fare} × {commission}% = {revenue} gross revenue.',formulaAnnual:'The annual result sums the same formula across all 12 months.',
      nextCosts:'See investment and responsibilities',
      s3Eyebrow:'INVESTMENT AND RESPONSIBILITIES',s3Title:'What the calculation includes — and what must be validated',s3Intro:'Clearly separating modelled costs from external costs helps prevent the projection from being read as a complete budget for every local operation.',
      included:'Included in the calculation',notIncluded:'Not included automatically',initialFeeItem:'Initial license fee of {value}, treated as a pre-opening cash outflow.',marketingItem:'Annual marketing and development budget of {value}.',assistantItem:'Assistant service: R$ 250 or R$ 500 per month, according to the gross-revenue band used by the model.',techItem:'Service technology fee: 0% to 30% according to the monthly gross-revenue band.',taxItem:'ISSQN, sales taxes, withholding taxes and other applicable tax obligations.',smsItem:'SMS notifications: the calculation estimates 1 SMS for every 14 completed rides. Up to R$ 3,000 in monthly gross revenue the cost is zero; above that amount, each SMS costs R$ 0.10.',localItem:'Other local partner costs, if any (physical structure, local staff, accounting, banking and local services), must be confirmed for each operation.',
      maximProvides:'What Maxim provides',partnerDoes:'Your role in growing the business',maxim1:'A ready technology foundation for operating the service, with access to the technologies and tools needed to launch and run the service in the city.',maxim2:'Operational support for day-to-day processes, including driver requests, checks, registration and account recovery.',maxim3:'Support for unit development, including guidance on launch preparation, service development, results analysis and interaction with the relevant Maxim teams.',maxim4:'A dedicated experienced development manager will be assigned to the partner to provide ongoing support, help prepare the launch and assist with developing the unit after operations begin.',partner1:'Develop the service in your city by strengthening Maxim’s local presence, attracting users and building an active driver community.',partner2:'Promote the brand locally using channels that fit the city — online promotion, outdoor advertising, vehicle branding, promotional activities and other formats — with recommendations and materials from Maxim.',partner3:'Develop and support the driver community by helping attract new drivers, maintain engagement and create conditions for stable order fulfillment.',partner4:'Stay close to changes in the local market and share relevant information about new neighborhoods and popular locations, traffic conditions, competitors and local demand so the map, fares and development approach can be adjusted in a timely way.',partner5:'Work together with the Maxim team and your development manager, regularly reviewing unit performance and defining the next actions to grow the business.',
      nextRisks:'See scenario risks',
      s4Eyebrow:'RISKS AND CONTROLS',s4Title:'What can make the real result different',s4Intro:'Risk transparency is part of the business case. The objective is not to reduce interest, but to show which variables need to be monitored after launch.',
      riskMarket:'Market and competition',riskMarketText:'Competitor presence and intensity can change acquisition cost and growth speed.',riskMarketAction:'Control: validate competitors and local prices before launch and review them after operations begin.',
      riskDemand:'Marketing execution',riskDemandText:'Budget alone does not guarantee demand. Format, frequency, placement and campaign execution affect orders.',riskDemandAction:'Control: monitor acquisition and adjust the promotion mix using actual results.',
      riskTariff:'Fare and attractiveness',riskTariffText:'High prices can reduce orders; prices that are too low can reduce ride attractiveness for drivers.',riskTariffAction:'Control: compare market routes and prices and monitor refusals, cancellations and fulfillment.',
      riskMap:'Map and local operation',riskMapText:'Incorrect addresses or routes can reduce order creation and completion.',riskMapAction:'Control: keep the map updated and report infrastructure changes.',
      riskLegal:'Taxes and local rules',riskLegalText:'Tax, transport, advertising and data-protection obligations can create costs or requirements that are not calculated automatically.',riskLegalAction:'Control: validate local obligations before launch and include them in the final plan.',
      riskDisclaimer:'The projection is a financial simulation. Actual results depend on demand, commercial and operational execution, local conditions and compliance with applicable obligations.',
      nextCase:'View my business case',
      s5Eyebrow:'YOUR BUSINESS CASE',s5Title:'Your business case for {city}',s5Intro:'Summary of the projection using the current parameters. Use this view to discuss the launch or open the detailed model when needed.',
      totalInvestment:'Projected investment',grossRevenue12:'Gross revenue — 12 months',opex12:'Operating expenses — 12 months',netProfit12:'Net profit — 12 months',roi12:'ROI — 12 months',payback:'Payback period',month:'Month',notWithin:'Not achieved in 12 months',trajectory:'Accumulated result trajectory',preOpeningNote:'The license fee is treated in pre-opening; month 1 does not repeat this cash outflow.',scopeShort:'Calculation scope',scopeShortText:'Includes the license fee, marketing/development, Assistant, SMS notifications and technology fee. It does not automatically include taxes or partner-specific local costs.',
      savePdf:'Save as PDF',share:'Share summary',openDetailed:'View detailed financial model',openMonthlyDetail:'View month-by-month breakdown',detailedPrompt:'Want to see where these numbers come from?',detailedPromptText:'Review the month-by-month projection, revenue, expenses and result.',backToCase:'Back to your business case',monthlyBreakdownTitle:'Month-by-month breakdown',monthlyBreakdownHint:'Open a section and swipe horizontally to review each indicator across the projection.',preOpeningShort:'Pre-opening',indicatorShort:'Indicator',talk:'Talk to a specialist',back:'Back',viewGuide:'View guide',availabilityConfirmation:'Availability subject to confirmation',
      leadTitle:'Want to discuss this calculation?',leadText:'Enter only the details you want included in the message. When you continue, WhatsApp opens with the business case and your details; the app does not store this information.',name:'Name',phone:'Phone / WhatsApp',email:'Email',leadButton:'Continue in WhatsApp',leadPrivacy:'The details entered here are not sent to a server by this Small App.',leadNameRequired:'Enter at least your name to prepare the message.',
      shared:'Summary copied to the clipboard.',pdfHint:'Use “Save as PDF” in the print window.',
      desktopTitle:'Next step',desktopText:'Turn the projection into a business case or validate the figures with a specialist.',desktopCase:'View business case',desktopPdf:'Save PDF',desktopTalk:'Talk to a specialist'
    }
  };
  function salesT(key,vars={}){
    let text=(SALES_COPY[state?.language]||SALES_COPY['pt-BR'])[key]||SALES_COPY.en[key]||key;
    Object.entries(vars).forEach(([k,v])=>{text=text.replaceAll('{'+k+'}',String(v));});
    return text;
  }
  function competitionLabel(level){
    const v=String(level||'Pending').toLowerCase();
    if(v==='very high')return salesT('veryHigh');
    if(v==='high')return salesT('high');
    if(v==='medium')return salesT('medium');
    return salesT('pending');
  }
  function showSalesToast(text){
    const el=document.getElementById('salesToast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(showSalesToast._t);showSalesToast._t=setTimeout(()=>el.classList.remove('show'),2400);
  }
  function buildWhatsAppHref(contact={}){
    const c=cityById(state.selectedCityId);
    const isPt=state.language==='pt-BR';
    const assumptions=model?.assumptions||FinancialEngine.normalizeAssumptions(state.activeScenario?.assumptions||{});
    const useRecommended=assumptions.useRecommendedValues!==false;
    const contactLines=[contact.name,contact.email].some(Boolean)
      ? (isPt?`\n\nDados para contato:${contact.name?`\n• Nome: ${contact.name}`:''}${contact.email?`\n• E-mail: ${contact.email}`:''}`:`\n\nContact details:${contact.name?`\n• Name: ${contact.name}`:''}${contact.email?`\n• Email: ${contact.email}`:''}`):'';
    let simulationLines='';
    if(useRecommended){
      simulationLines=isPt
        ? `\n\nSimulação:\n• Cenário: valores recomendados`
        : `\n\nSimulation:\n• Scenario: recommended values`;
    }else{
      const budget=fmtBRL(assumptions.marketingBudget);
      const fare=Number(assumptions.averageFare||0).toLocaleString(isPt?'pt-BR':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const commission=Number(assumptions.commission||0).toLocaleString(isPt?'pt-BR':'en-US',{minimumFractionDigits:0,maximumFractionDigits:1});
      const cityPopulation=Number(c?.population)||0;
      const serviceAreaPopulation=Number(assumptions.serviceAreaPopulation)||cityPopulation;
      const serviceAreaLine=serviceAreaPopulation>0&&cityPopulation>0&&serviceAreaPopulation!==cityPopulation
        ? (isPt?`\n• População da área de atendimento: ${fmtNumber(serviceAreaPopulation)}`:`\n• Service area population: ${fmtNumber(serviceAreaPopulation)}`):'';
      const resultLines=model?(isPt
        ? `\n• Investimento projetado: ${fmtBRL(model.summary.totalInvestment)}\n• Receita bruta (12 meses): ${fmtBRL(model.summary.totalGrossRevenue)}\n• Lucro líquido (12 meses): ${fmtBRL(model.summary.netProfit)}\n• ROI (12 meses): ${Math.round(model.summary.roi)}%\n• Prazo de retorno: ${model.summary.paybackPeriod?`Mês ${model.summary.paybackPeriod}`:'não atingido em 12 meses'}`
        : `\n• Projected investment: ${fmtBRL(model.summary.totalInvestment)}\n• Gross revenue (12 months): ${fmtBRL(model.summary.totalGrossRevenue)}\n• Net profit (12 months): ${fmtBRL(model.summary.netProfit)}\n• ROI (12 months): ${Math.round(model.summary.roi)}%\n• Payback: ${model.summary.paybackPeriod?`Month ${model.summary.paybackPeriod}`:'not achieved in 12 months'}`):'';
      simulationLines=isPt
        ? `\n\nSimulação:\n• Cenário: personalizado\n• Orçamento anual de marketing e desenvolvimento: ${budget}\n• Preço médio: R$ ${fare}\n• Comissão dos motoristas: ${commission}%${serviceAreaLine}${resultLines}`
        : `\n\nSimulation:\n• Scenario: custom\n• Annual marketing and development budget: ${budget}\n• Average fare: R$ ${fare}\n• Driver commission: ${commission}%${serviceAreaLine}${resultLines}`;
    }
    const message=isPt
      ? `Quero conversar com um especialista da Maxim${c?` sobre ${c.city}, ${c.state}`:' sobre minha cidade'}.${simulationLines}${contactLines}`
      : `I'd like to talk to a Maxim specialist${c?` about ${c.city}, ${c.state}`:' about my city'}.${simulationLines}${contactLines}`;
    return 'https://wa.me/5548991487120?text='+encodeURIComponent(message);
  }
  function businessCaseShareText(){
    const c=cityById(state.selectedCityId); if(!c||!model)return '';
    const isPt=state.language==='pt-BR';
    return isPt
      ? `Business case Maxim — ${c.city}, ${c.state}\nInvestimento projetado: ${fmtBRL(model.summary.totalInvestment)}\nReceita bruta (12 meses): ${fmtBRL(model.summary.totalGrossRevenue)}\nDespesas operacionais: ${fmtBRL(model.summary.totalOperatingExpenses)}\nLucro líquido: ${fmtBRL(model.summary.netProfit)}\nROI: ${Math.round(model.summary.roi)}%\nPrazo de retorno: ${model.summary.paybackPeriod?`Mês ${model.summary.paybackPeriod}`:'não atingido em 12 meses'}\n\nProjeção estimada; resultados reais podem variar.`
      : `Maxim business case — ${c.city}, ${c.state}\nProjected investment: ${fmtBRL(model.summary.totalInvestment)}\nGross revenue (12 months): ${fmtBRL(model.summary.totalGrossRevenue)}\nOperating expenses: ${fmtBRL(model.summary.totalOperatingExpenses)}\nNet profit: ${fmtBRL(model.summary.netProfit)}\nROI: ${Math.round(model.summary.roi)}%\nPayback: ${model.summary.paybackPeriod?`Month ${model.summary.paybackPeriod}`:'not achieved in 12 months'}\n\nEstimated projection; actual results may vary.`;
  }
  function businessCaseChartSvg(){
    if(!model)return '';
    const months=model.months.filter(x=>x.index>1);
    const vals=months.map(x=>Number(x.accumulated)||0);
    const min=Math.min(0,...vals),max=Math.max(0,...vals);const range=(max-min)||1;
    const left=34,right=586,top=18,bottom=150;const step=(right-left)/Math.max(1,vals.length-1);
    const y=v=>bottom-(v-min)/range*(bottom-top);
    const points=vals.map((v,i)=>`${(left+i*step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const zeroY=y(0).toFixed(1);
    const dots=vals.map((v,i)=>`<circle class="bc-dot ${model.summary.paybackPeriod===i+1?'payback':''}" cx="${(left+i*step).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${model.summary.paybackPeriod===i+1?5:3.5}"/>`).join('');
    const labels=vals.map((_v,i)=>`<text class="bc-label" x="${(left+i*step).toFixed(1)}" y="176" text-anchor="middle">${i+1}</text>`).join('');
    return `<svg viewBox="0 0 620 185" role="img" aria-label="${htmlEsc(salesT('trajectory'))}"><line class="bc-zero" x1="${left}" x2="${right}" y1="${zeroY}" y2="${zeroY}"/><polyline class="bc-line" points="${points}"/>${dots}${labels}</svg>`;
  }
  function salesNavHtml(nextKey,showBack=true){
    return `<div class="sales-nav"><div class="sales-nav-group">${showBack?`<button class="sales-btn" type="button" data-sales-action="prev">← ${htmlEsc(salesT('back'))}</button>`:''}</div><div class="sales-nav-group">${nextKey?`<button class="sales-btn primary" type="button" data-sales-action="next">${htmlEsc(salesT(nextKey))} →</button>`:''}</div></div>`;
  }
  function renderSalesFlow(){
    const shell=document.getElementById('salesFlow'),host=document.getElementById('salesFlowContent');
    if(!shell||!host||!model||!cityById(state.selectedCityId))return;
    const c=cityById(state.selectedCityId),a=model.assumptions,s=model.summary,m12=model.months.find(x=>x.monthNo===12)||model.months[model.months.length-1];
    const lang=document.getElementById('salesFlowLanguageSelect');if(lang)lang.value=state.language;
    const cityEl=document.getElementById('salesFlowCity');if(cityEl)cityEl.innerHTML=`<span>${htmlEsc(c.city)}, ${htmlEsc(c.state)}</span>`;
    const changeBtn=shell.querySelector('[data-sales-action="change-city"]');if(changeBtn)changeBtn.textContent=salesT('changeCity');
    const progress=document.getElementById('salesProgressLabel');if(progress)progress.textContent=salesT('progress');
    const count=document.getElementById('salesProgressCount');if(count)count.textContent=`${salesT('step')} ${salesFlowStep+1} ${salesT('of')} 5`;
    const fill=document.getElementById('salesProgressFill');if(fill)fill.style.width=`${(salesFlowStep+1)*20}%`;
    const competition=competitionLabel(s.competitionLevel);
    const marketUncertainty=String(s.competitionLevel||'Pending').toLowerCase()==='pending';
    let inner='';
    if(salesFlowStep===0){
      const serviceAreaPopulation=Number(s.serviceAreaPopulation||c.population);
      const showServiceArea=serviceAreaPopulation>0&&Number(c.population)>0&&serviceAreaPopulation!==Number(c.population);
      const serviceAreaCard=showServiceArea?`<div class="sales-metric soft-neutral"><div class="sales-metric-label">${htmlEsc(salesT('serviceArea'))}</div><div class="sales-metric-value">${htmlEsc(fmtNumber(serviceAreaPopulation))}</div></div>`:'';
      inner=`<article class="sales-step sales-step-card" data-sales-step="0"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s1Eyebrow'))}</div><h1>${htmlEsc(salesT('s1Title',{city:c.city}))}</h1><p>${htmlEsc(salesT('s1Intro'))}</p></header><div class="sales-step-body"><div class="${showServiceArea?'sales-grid-4':'sales-grid-3'} potential-kpi-grid"><div class="sales-metric soft-neutral"><div class="sales-metric-label">${htmlEsc(salesT('population'))}</div><div class="sales-metric-value">${htmlEsc(fmtNumber(c.population))}</div></div>${serviceAreaCard}<div class="sales-metric soft-blue"><div class="sales-metric-label">${htmlEsc(salesT('ridesM12'))}</div><div class="sales-metric-value">${htmlEsc(fmtNumber(s.targetRidesDay))}</div></div><div class="sales-metric soft-yellow"><div class="sales-metric-label">${htmlEsc(salesT('investment'))}</div><div class="sales-metric-value">${htmlEsc(fmtBRLCompact(s.totalInvestment))}</div><div class="sales-metric-note">${htmlEsc(salesT('competition'))}: ${htmlEsc(competition)}</div></div></div>${marketUncertainty?`<div class="market-uncertainty"><div class="risk-badge">?</div><div><strong>${htmlEsc(salesT('pendingTitle'))}</strong><p>${htmlEsc(salesT('pendingText'))}</p></div></div>`:''}</div>${salesNavHtml('nextRevenue',false)}</article>`;
    }else if(salesFlowStep===1){
      const formula=salesT('formulaExample',{rides:fmtNumber(m12.ridesPerMonth),fare:fmtBRL(m12.averageFare),commission:Number(m12.commission).toLocaleString(state.language==='pt-BR'?'pt-BR':'en-US',{maximumFractionDigits:1}),revenue:fmtBRL(m12.commissionFromRides)});
      inner=`<article class="sales-step sales-step-card" data-sales-step="1"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s2Eyebrow'))}</div><h1>${htmlEsc(salesT('s2Title'))}</h1><p>${htmlEsc(salesT('s2Intro'))}</p></header><div class="sales-step-body"><div class="business-chain">${['passengers','orders','drivers','completedRides','rideValue','commissionLabel','grossRevenue'].map((k,i)=>`<div class="business-chain-item ${i===5?'accent':''} ${i===6?'result':''}">${htmlEsc(salesT(k))}</div>`).join('')}</div><div class="formula-card"><h3 class="sales-section-title" style="margin-top:0">${htmlEsc(salesT('formulaTitle'))}</h3><div class="formula-line"><span class="formula-token">${htmlEsc(salesT('completedRides'))}</span><span>×</span><span class="formula-token">${htmlEsc(salesT('rideValue'))}</span><span>×</span><span class="formula-token">${htmlEsc(salesT('commissionLabel'))}</span><span class="formula-equals">=</span><span class="formula-token">${htmlEsc(salesT('grossRevenue'))}</span></div><div class="formula-example">${htmlEsc(formula)}<br>${htmlEsc(salesT('formulaAnnual'))}</div></div></div>${salesNavHtml('nextCosts')}</article>`;
    }else if(salesFlowStep===2){
      inner=`<article class="sales-step sales-step-card" data-sales-step="2"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s3Eyebrow'))}</div><h1>${htmlEsc(salesT('s3Title'))}</h1><p>${htmlEsc(salesT('s3Intro'))}</p></header><div class="sales-step-body"><div class="investment-overview-grid"><section class="investment-panel included"><div class="investment-panel-head"><div class="investment-panel-badge">✓</div><div><h3>${htmlEsc(salesT('included'))}</h3><p>${state.language==='pt-BR'?'Itens já considerados na simulação':'Items already included in the simulation'}</p></div></div><ul class="investment-points"><li>${htmlEsc(salesT('initialFeeItem',{value:fmtBRL(s.initialPayment)}))}</li><li>${htmlEsc(salesT('marketingItem',{value:fmtBRL(s.totalMarketingInvestment)}))}</li><li>${htmlEsc(salesT('assistantItem'))}</li><li>${htmlEsc(salesT('smsItem'))}</li><li>${htmlEsc(salesT('techItem'))}</li></ul></section><section class="investment-panel excluded"><div class="investment-panel-head"><div class="investment-panel-badge">!</div><div><h3>${htmlEsc(salesT('notIncluded'))}</h3><p>${state.language==='pt-BR'?'Custos que precisam ser validados à parte':'Costs that must be validated separately'}</p></div></div><ul class="investment-points"><li>${htmlEsc(salesT('taxItem'))}</li><li>${htmlEsc(salesT('localItem'))}</li></ul></section><section class="investment-panel maxim"><div class="investment-panel-head"><div class="investment-panel-badge">M</div><div><h3>${htmlEsc(salesT('maximProvides'))}</h3><p>${state.language==='pt-BR'?'Estrutura, tecnologia e apoio da franqueadora':'Platform, technology and launch support'}</p></div></div><ul class="investment-points">${[1,2,3,4].map(i=>`<li>${htmlEsc(salesT('maxim'+i))}</li>`).join('')}</ul></section><section class="investment-panel partner"><div class="investment-panel-head"><div class="investment-panel-badge">P</div><div><h3>${htmlEsc(salesT('partnerDoes'))}</h3><p>${state.language==='pt-BR'?'Execução local e crescimento da operação':'Local execution and business growth'}</p></div></div><ul class="investment-points">${[1,2,3,5].map(i=>`<li>${htmlEsc(salesT('partner'+i))}</li>`).join('')}</ul></section></div></div>${salesNavHtml('nextRisks')}</article>`;
    }else if(salesFlowStep===3){
      const risks=[['riskMarket','riskMarketText','riskMarketAction'],['riskDemand','riskDemandText','riskDemandAction'],['riskTariff','riskTariffText','riskTariffAction'],['riskMap','riskMapText','riskMapAction'],['riskLegal','riskLegalText','riskLegalAction']];
      inner=`<article class="sales-step sales-step-card" data-sales-step="3"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s4Eyebrow'))}</div><h1>${htmlEsc(salesT('s4Title'))}</h1><p>${htmlEsc(salesT('s4Intro'))}</p></header><div class="sales-step-body"><div class="risk-list refined">${risks.map((r,i)=>`<div class="risk-card refined"><div class="risk-top"><div class="risk-badge">${i+1}</div><div class="risk-copy"><h3>${htmlEsc(salesT(r[0]))}</h3><p>${htmlEsc(salesT(r[1]))}</p></div></div><div class="risk-action"><strong>${state.language==='pt-BR'?'Controle':'Control'}</strong><span>${htmlEsc(salesT(r[2]).replace(/^Controle:\s*/,'').replace(/^Control:\s*/,''))}</span></div></div>`).join('')}</div><div class="market-uncertainty risk-disclaimer-card"><div class="risk-badge">i</div><div><strong>${htmlEsc(salesT('riskDisclaimer'))}</strong>${marketUncertainty?`<p>${htmlEsc(salesT('pendingText'))}</p>`:''}</div></div></div>${salesNavHtml('nextCase')}</article>`;
    }else{
      const payback=s.paybackPeriod?`${salesT('month')} ${s.paybackPeriod}`:salesT('notWithin');
      inner=`<article class="sales-step sales-step-card" data-sales-step="4"><header class="sales-step-head"><div class="business-case-title"><div><div class="sales-step-eyebrow">${htmlEsc(salesT('s5Eyebrow'))}</div><h1>${htmlEsc(salesT('s5Title',{city:c.city}))}</h1><p>${htmlEsc(salesT('s5Intro'))}</p>${c.availabilityRequiresConfirmation?`<div class="business-case-confirmation">${htmlEsc(salesT('availabilityConfirmation'))}</div>`:''}</div><div class="business-case-actions-top"><button type="button" data-sales-action="pdf">${htmlEsc(salesT('savePdf'))}</button><button type="button" data-sales-action="share">${htmlEsc(salesT('share'))}</button></div></div></header><div class="sales-step-body"><div class="business-case-layout"><div class="business-case-left"><div class="business-case-primary"><div class="bc-summary-grid"><div class="bc-kpi yellow"><div class="bc-kpi-label">${htmlEsc(salesT('totalInvestment'))}</div><div class="bc-kpi-value">${htmlEsc(fmtBRL(s.totalInvestment))}</div></div><div class="bc-kpi blue"><div class="bc-kpi-label">${htmlEsc(salesT('grossRevenue12'))}</div><div class="bc-kpi-value">${htmlEsc(fmtBRL(s.totalGrossRevenue))}</div></div><div class="bc-kpi red"><div class="bc-kpi-label">${htmlEsc(salesT('opex12'))}</div><div class="bc-kpi-value">${htmlEsc(fmtBRL(s.totalOperatingExpenses))}</div></div><div class="bc-kpi green"><div class="bc-kpi-label">${htmlEsc(salesT('netProfit12'))}</div><div class="bc-kpi-value">${htmlEsc(fmtBRL(s.netProfit))}</div></div><div class="bc-kpi purple"><div class="bc-kpi-label">${htmlEsc(salesT('roi12'))}</div><div class="bc-kpi-value">${Math.round(s.roi)}%</div></div><div class="bc-kpi green"><div class="bc-kpi-label">${htmlEsc(salesT('payback'))}</div><div class="bc-kpi-value">${htmlEsc(payback)}</div></div></div><div class="bc-detailed-callout"><div class="bc-detailed-copy"><strong>${htmlEsc(salesT('detailedPrompt'))}</strong><span>${htmlEsc(salesT('detailedPromptText'))}</span></div><button class="sales-btn detailed-model-btn" type="button" data-sales-action="open-detailed">${htmlEsc(salesT(isMobileLayout()?'openMonthlyDetail':'openDetailed'))} →</button></div></div><div class="sales-info-card business-case-scope"><h3>${htmlEsc(salesT('scopeShort'))}</h3><p>${state.language==='pt-BR'?'Custos que precisam ser validados à parte':'Costs that must be validated separately'}</p></div></div><div class="business-case-right"><div class="bc-chart-card business-case-side"><h3>${htmlEsc(salesT('trajectory'))}</h3>${businessCaseChartSvg()}<div class="sales-metric-note">${htmlEsc(salesT('preOpeningNote'))}</div></div><form id="leadContactForm" class="lead-box business-case-lead"><h3>${htmlEsc(salesT('leadTitle'))}</h3><p>${htmlEsc(salesT('leadText'))}</p><div class="lead-grid"><input id="leadName" name="name" autocomplete="name" placeholder="${htmlEsc(salesT('name'))}"><input id="leadEmail" name="email" type="email" autocomplete="email" placeholder="${htmlEsc(salesT('email'))}"><button type="submit">${htmlEsc(salesT('leadButton'))}</button></div><div id="leadStatus" class="lead-status"></div></form></div></div></div><div class="sales-nav sales-nav-final"><div class="sales-nav-group"><button class="sales-btn" type="button" data-sales-action="prev">← ${htmlEsc(salesT('back'))}</button></div></div></article>`
    }
    host.innerHTML=inner;
  }
  function trackSalesStep(){
    const events=['city_potential_viewed','revenue_viewed','investment_viewed','risk_viewed','business_case_viewed'];
    Analytics?.track?.(events[salesFlowStep]||'guided_step_viewed',{step:salesFlowStep+1,city_id:state.selectedCityId,language:state.language});
    if(salesFlowStep===4)Analytics?.track?.('result_viewed',{city_id:state.selectedCityId});
  }
  function activateSalesFlow(step=0){salesFlowActive=true;salesFlowStep=Math.max(0,Math.min(4,Number(step)||0));setScreen();renderSalesFlow();trackSalesStep();window.scrollTo({top:0,left:0,behavior:'auto'});}
  function updateDetailedReturnControls(){
    const btn=document.getElementById('backToBusinessCaseBtn');
    if(!btn)return;
    const show=!!cityById(state?.selectedCityId)&&detailedReturnToBusinessCase&&!salesFlowActive&&!isMobileLayout();
    btn.hidden=!show;
    btn.textContent=`← ${salesT('backToCase')}`;
  }
  function renderMobileDetailedModel(){
    const host=document.getElementById('mobileDetailedSections');
    const cityLabel=document.getElementById('mobileDetailedCity');
    const title=document.getElementById('mobileDetailedTitle');
    const hint=document.getElementById('mobileDetailedHint');
    const back=document.getElementById('mobileDetailedBack');
    const params=document.getElementById('mobileDetailParametersBtn');
    const c=cityById(state?.selectedCityId);
    if(cityLabel)cityLabel.textContent=c?`${c.city}, ${c.state}`:'';
    if(title)title.textContent=salesT('monthlyBreakdownTitle');
    if(hint)hint.textContent=salesT('monthlyBreakdownHint');
    if(back)back.textContent=`← ${salesT('backToCase')}`;
    if(params)params.textContent=Localization.t('parameters');
    if(!host||!model||typeof UIRenderer==='undefined'||!UIRenderer.getDetailedTableData)return;
    const data=UIRenderer.getDetailedTableData(model);
    const sectionClass={investment:'investment',operations:'revenue',expenses:'expenses',profit:'profit'};
    const sectionsHtml=data.sections.map((section,index)=>{
      const cls=sectionClass[section.id]||section.id;
      const heads=data.months.map((m,i)=>`<th>${htmlEsc(i===0?salesT('preOpeningShort'):String(m.label))}</th>`).join('');
      const rows=section.rows.map(row=>`<tr><th class="mobile-month-indicator">${htmlEsc(row.label)}</th>${row.values.map(v=>`<td class="${v.sign||''}">${htmlEsc(v.display)}</td>`).join('')}</tr>`).join('');
      const guideLabel=salesT('viewGuide');
      const guideAria=Localization.t('sectionHelpEyebrow');
      return `<details class="mobile-month-section ${cls}" ${index===0?'open':''}><summary><span class="mobile-month-section-main"><span class="mobile-month-section-name">${htmlEsc(section.title)}</span><span class="mobile-month-section-count">${section.rows.length}</span></span><button class="mobile-month-guide-link" type="button" data-section-help="${htmlEsc(section.id)}" aria-label="${htmlEsc(guideAria)} — ${htmlEsc(section.title)}">${htmlEsc(guideLabel)}</button></summary><div class="mobile-month-table-scroll"><table class="mobile-month-breakdown"><thead><tr><th class="mobile-month-indicator">${htmlEsc(salesT('indicatorShort'))}</th>${heads}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join('');
    const ctaHref=buildWhatsAppHref();
    const ctaHtml=`<section class="mobile-monthly-final-cta" aria-label="${htmlEsc(Localization.t('mobileFinalCtaTitle'))}"><h3>${htmlEsc(Localization.t('mobileFinalCtaTitle'))}</h3><p>${htmlEsc(Localization.t('mobileFinalCtaText'))}</p><a href="${htmlEsc(ctaHref)}" target="_blank" rel="noopener" data-sales-action="contact-link">${htmlEsc(Localization.t('mobileFinalCtaButton'))}</a></section>`;
    host.innerHTML=sectionsHtml+ctaHtml;
  }
  function leaveSalesFlowForDetailed(){
    detailedReturnToBusinessCase=true;
    salesFlowActive=false;
    setScreen();
    if(isMobileLayout()){
      renderMobileDetailedModel();
      mobileSetPage('detail');
    }else{
      updateDetailedReturnControls();
      window.scrollTo({top:0,left:0,behavior:'auto'});
    }
    Analytics?.track?.('detailed_model_viewed',{city_id:state.selectedCityId,view:isMobileLayout()?'monthly_mobile':'desktop_model'});
  }
  function renderDesktopNextStepCard(){
    const host=document.getElementById('desktopNextStepCard');if(!host||!model)return;
    host.innerHTML=`<a class="desktop-whatsapp-cta" href="${htmlEsc(buildWhatsAppHref())}" target="_blank" rel="noopener" data-sales-action="contact-link">${htmlEsc(Localization.t('mobileFinalCtaButton'))}</a>`;
  }
  async function shareBusinessCase(){
    const text=businessCaseShareText();if(!text)return;
    Analytics?.track?.('calculation_shared',{city_id:state.selectedCityId});
    if(navigator.share){try{await navigator.share({title:(cityById(state.selectedCityId)?.city||'Maxim')+' — Maxim',text});return}catch(_e){}}
    try{await navigator.clipboard.writeText(text);showSalesToast(salesT('shared'));}catch(_e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showSalesToast(salesT('shared'));}
  }
  function printBusinessCase(){
    if(!model)return;Analytics?.track?.('pdf_requested',{city_id:state.selectedCityId});
    const previousActive=salesFlowActive,previousStep=salesFlowStep;
    salesFlowActive=true;salesFlowStep=4;renderSalesFlow();setScreen();document.body.classList.add('print-business-case');showSalesToast(salesT('pdfHint'));
    const restore=()=>{document.body.classList.remove('print-business-case');salesFlowActive=previousActive;salesFlowStep=previousStep;setScreen();renderSalesFlow();window.removeEventListener('afterprint',restore);};
    window.addEventListener('afterprint',restore);setTimeout(()=>window.print(),80);setTimeout(()=>{if(document.body.classList.contains('print-business-case'))restore();},60000);
  }
  function handleSalesAction(action,element){
    if(action==='next'){salesFlowStep=Math.min(4,salesFlowStep+1);renderSalesFlow();trackSalesStep();window.scrollTo(0,0);return true;}
    if(action==='prev'){salesFlowStep=Math.max(0,salesFlowStep-1);renderSalesFlow();trackSalesStep();window.scrollTo(0,0);return true;}
    if(action==='change-city'){detailedReturnToBusinessCase=false;salesFlowActive=false;state.selectedCityId=null;renderStartScreen();setScreen();persist();Analytics?.track?.('change_city_clicked',{});return true;}
    if(action==='open-detailed'){leaveSalesFlowForDetailed();return true;}
    if(action==='business-case'){activateSalesFlow(4);return true;}
    if(action==='pdf'){printBusinessCase();return true;}
    if(action==='share'){shareBusinessCase();return true;}
    if(action==='contact'||action==='contact-link'){
      conversionCompleted=true;Analytics?.track?.('manager_contact_clicked',{city_id:state.selectedCityId,source:action==='contact-link'?'linked_cta':'business_case'});
      if(action==='contact')window.open(buildWhatsAppHref(),'_blank','noopener');
      else if(element?.href)window.open(element.href,'_blank','noopener');
      return true;
    }
    if(action==='parameters'){openParametersModal(element);return true;}
    return false;
  }

  function hydrate(){
    const saved=Storage.load()||{};
    const language=['pt-BR','en'].includes(saved.language)?saved.language:'pt-BR';
    state={
      language,
      currency:'BRL',
      selectedCityId:null,
      activeScenario:{id:'base',assumptions:FinancialEngine.defaultAssumptions('base')}
    };
    startFilterState='';
    startFilterCityId='';
  }
  function persist(){Storage.save({language:state.language})}

  function applySelectedCity(city){
    if(!city)return;
    const initialInvestment=Number(city.initialPayment)||0;
    state.selectedCityId=city.id;
    state.selectedCitySnapshot={...city,population:Number(city.population)||0,initialPayment:initialInvestment};
    const population=Number(city.population)||0;
    const serviceAreaPopulation=FinancialEngine.recommendedServiceAreaPopulation(population);
    copyCityMarketData(state.activeScenario.assumptions,city);
    const recommendedBudget=FinancialEngine.annualMarketingBudgetForPopulation(serviceAreaPopulation,state.activeScenario.assumptions);
    state.activeScenario.assumptions.population=population;
    state.activeScenario.assumptions.serviceAreaPopulation=serviceAreaPopulation;
    state.activeScenario.assumptions.initialInvestment=initialInvestment;
    state.activeScenario.assumptions.useRecommendedValues=true;
    state.activeScenario.assumptions.averageFare=FinancialEngine.recommendedAverageFareForPopulation(serviceAreaPopulation);
    state.activeScenario.assumptions.commission=FinancialEngine.recommendedCommissionForPopulation(serviceAreaPopulation);
    state.activeScenario.assumptions.advertisingPackage=FinancialEngine.advertisingPackageForPopulation(serviceAreaPopulation);
    state.activeScenario.assumptions.marketingBudget=recommendedBudget;
    state.activeScenario.assumptions.autoPopulationUsingService=false;
    startFilterState=city.state;
    startFilterCityId=city.id;
  }

  let parametersReturnFocus=null;

  function getRecommendedParameters(){
    const population=Number(state.activeScenario?.assumptions?.population)||Number(cityById(state.selectedCityId)?.population)||0;
    const serviceAreaPopulation=FinancialEngine.recommendedServiceAreaPopulation(population);
    const marketProfile=currentMarketProfile();
    return {
      serviceAreaPopulation,
      marketingBudget:FinancialEngine.annualMarketingBudgetForPopulation(serviceAreaPopulation,marketProfile),
      averageFare:FinancialEngine.recommendedAverageFareForPopulation(serviceAreaPopulation),
      commission:FinancialEngine.recommendedCommissionForPopulation(serviceAreaPopulation)
    };
  }

  function setParametersFieldsDisabled(disabled){
    const fields=document.getElementById('parametersFields');
    if(fields)fields.classList.toggle('is-disabled',disabled);
    ['serviceAreaPopulationInput','annualInvestmentBudgetInput','averageFareParameterInput','driverCommissionParameterInput'].forEach(id=>{
      const input=document.getElementById(id);
      if(input)input.disabled=disabled;
    });
  }

  function setParameterInputs(values){
    const serviceArea=document.getElementById('serviceAreaPopulationInput');
    const budget=document.getElementById('annualInvestmentBudgetInput');
    const fare=document.getElementById('averageFareParameterInput');
    const commission=document.getElementById('driverCommissionParameterInput');
    if(serviceArea)serviceArea.value=String(Math.max(0,Number(values.serviceAreaPopulation)||0));
    if(budget)budget.value=String(Math.max(0,Number(values.marketingBudget)||0));
    if(fare){fare.max=String(FinancialEngine.MAX_AVERAGE_FARE);fare.value=String(Math.min(FinancialEngine.MAX_AVERAGE_FARE,Math.max(0,Number(values.averageFare)||0)));}
    if(commission){const v=Number(values.commission);commission.value=String(Math.min(FinancialEngine.MAX_DRIVER_COMMISSION,Math.max(FinancialEngine.MIN_DRIVER_COMMISSION,Number.isFinite(v)?v:FinancialEngine.RECOMMENDED_DRIVER_COMMISSION)));}
  }

  function readParameterInputs(){
    return {
      serviceAreaPopulation:Number(document.getElementById('serviceAreaPopulationInput')?.value),
      marketingBudget:Number(document.getElementById('annualInvestmentBudgetInput')?.value),
      averageFare:Number(document.getElementById('averageFareParameterInput')?.value),
      commission:Number(document.getElementById('driverCommissionParameterInput')?.value)
    };
  }

  function updateBudgetAssessment(){
    const el=document.getElementById('investmentBudgetAssessment');
    if(!el)return;
    const cityPopulation=Number(state.activeScenario?.assumptions?.population)||0;
    const serviceAreaDraft=Number(document.getElementById('serviceAreaPopulationInput')?.value)||FinancialEngine.recommendedServiceAreaPopulation(cityPopulation);
    const assessmentPopulation=FinancialEngine.isMicroCityPopulation(cityPopulation)?Math.max(cityPopulation,serviceAreaDraft):cityPopulation;
    const recommended=FinancialEngine.annualMarketingBudgetForPopulation(assessmentPopulation,currentMarketProfile());
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
    ['parametersBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=label;button.setAttribute('aria-label',label);}
    });
    const cityLabel=Localization.t('changeCity');
    ['changeCityBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=cityLabel;button.setAttribute('aria-label',cityLabel);}
    });
  }

  function renderAccessibilityLabels(){
    const set=(selector,key,title=false)=>{document.querySelectorAll(selector).forEach(el=>{const value=Localization.t(key);el.setAttribute('aria-label',value);if(title)el.title=value;});};
    set('#mobileLanguageSelect,#startLanguageSelect,#mobileStartLanguageButton','languageLabel');
    set('.top-action-pair','calculatorControls');
    set('#openChartModal','openLargeChart',true);
    set('#chartLegendInline','chartSeriesControls');
    set('#mobileApp','mobileSmallApp');
    set('.parameters-modal-close,.section-help-close,.chart-modal-close','closeDialog');
    set('.parameters-compact-pair','tripEconomicsParameters');
  }

  function updateServiceAreaFieldVisibility(){
    const population=Number(state.activeScenario?.assumptions?.population)||0;
    const wrap=document.getElementById('serviceAreaPopulationField');
    const input=document.getElementById('serviceAreaPopulationInput');
    if(wrap)wrap.hidden=!FinancialEngine.isMicroCityPopulation(population);
    if(input)input.min=String(Math.max(1,population));
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
    modal.dataset.customServiceArea=String(current.serviceAreaPopulation||current.population||0);
    modal.dataset.customBudget=String(current.marketingBudget);
    modal.dataset.customFare=String(current.averageFare);
    modal.dataset.customCommission=String(current.commission);
    updateServiceAreaFieldVisibility();
    setParameterInputs(useRecommended?recommended:current);
    setParametersFieldsDisabled(useRecommended);
    updateBudgetAssessment();
    if(validation){validation.hidden=true;validation.textContent='';}
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    Analytics?.track?.('parameters_opened',{city_id:state.selectedCityId});
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
      if(Number.isFinite(current.serviceAreaPopulation))modal.dataset.customServiceArea=String(current.serviceAreaPopulation);
      if(Number.isFinite(current.marketingBudget))modal.dataset.customBudget=String(current.marketingBudget);
      if(Number.isFinite(current.averageFare))modal.dataset.customFare=String(current.averageFare);
      if(Number.isFinite(current.commission))modal.dataset.customCommission=String(current.commission);
      setParameterInputs(getRecommendedParameters());
    }else{
      setParameterInputs({
        serviceAreaPopulation:Number(modal.dataset.customServiceArea),
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
    const cityPopulation=Number(state.activeScenario.assumptions.population)||0;
    if(FinancialEngine.isMicroCityPopulation(cityPopulation)&&(!Number.isFinite(values.serviceAreaPopulation)||values.serviceAreaPopulation<cityPopulation))message=Localization.t('validationServiceAreaPopulation');
    else if(!Number.isFinite(values.marketingBudget)||values.marketingBudget<0)message=Localization.t('validationAnnualBudget');
    else if(!Number.isFinite(values.averageFare)||values.averageFare<=0||values.averageFare>FinancialEngine.MAX_AVERAGE_FARE)message=Localization.t('validationFare');
    else if(!Number.isFinite(values.commission)||values.commission<FinancialEngine.MIN_DRIVER_COMMISSION||values.commission>FinancialEngine.MAX_DRIVER_COMMISSION)message=Localization.t('validationCommission');
    if(message){
      if(validation){validation.textContent=message;validation.hidden=false;}
      return;
    }
    
    const a=state.activeScenario.assumptions;
    a.useRecommendedValues=useRecommended;
    a.serviceAreaPopulation=FinancialEngine.isMicroCityPopulation(a.population)?values.serviceAreaPopulation:a.population;
    a.marketingBudget=values.marketingBudget;
    a.averageFare=values.averageFare;
    a.commission=values.commission;
    closeParametersModal();
    recalc();
    Analytics?.track?.('parameters_changed',{city_id:state.selectedCityId,recommended:useRecommended,marketing_budget:values.marketingBudget,average_fare:values.averageFare,commission:values.commission});
  }

  function setScreen(){
    const hasCity=!!cityById(state.selectedCityId);
    const inSalesFlow=hasCity&&salesFlowActive;
    document.body.classList.toggle('city-start-mode',!hasCity);
    document.body.classList.toggle('sales-flow-mode',inSalesFlow);
    document.documentElement.classList.toggle('sales-flow-mode',inSalesFlow);
    const start=document.getElementById('startScreen');if(start)start.hidden=hasCity;
    const dashboard=document.getElementById('dashboard');if(dashboard)dashboard.hidden=!hasCity||inSalesFlow;
    const topbar=document.querySelector('.topbar');if(topbar)topbar.hidden=!hasCity||inSalesFlow;
    const sales=document.getElementById('salesFlow');if(sales)sales.hidden=!inSalesFlow;
    const appShell=document.getElementById('app');if(appShell)appShell.classList.toggle('sales-flow-suppressed',inSalesFlow);
    const mobileApp=document.getElementById('mobileApp');if(mobileApp)mobileApp.classList.toggle('sales-flow-suppressed',inSalesFlow);
    if(!hasCity){if(mobileApp)mobileApp.dataset.page='start';}
    updateDetailedReturnControls();
  }

  function renderSelectedCityBanner(){
    const box=document.getElementById('selectedCityBanner');
    const topbar=document.getElementById('topbarCityMeta');
    const c=cityById(state.selectedCityId);
    const effectiveInvestment=state.activeScenario?.assumptions?.initialInvestment??c?.initialPayment??0;
    const serviceArea=Number(model?.summary?.serviceAreaPopulation||state.activeScenario?.assumptions?.serviceAreaPopulation||c?.population||0);
    const regionalChip=c&&serviceArea>Number(c.population)?`<div class="city-chip city-chip-regional"><strong>${Localization.t('serviceAreaPopulationLabel')}:</strong> ${fmtNumber(serviceArea)} · ${Localization.t('regionalScenarioShort')}</div>`:'';
    const html=c ? `<div class="city-chip"><strong>${Localization.t('selectedCity')}:</strong> ${c.city}, ${c.state}</div><div class="city-chip"><strong>${Localization.t('populationHeader')}:</strong> ${fmtNumber(c.population)}</div>${regionalChip}<div class="city-chip"><strong>${Localization.t('initialPaymentHeader')}:</strong> ${fmtBRL(effectiveInvestment)}</div>` : '';
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
    const rows=filtered.map(c=>`<tr data-city-row="${c.id}" class="${c.id===startFilterCityId?'selected':''}"><td>${c.state}</td><td><span class="city-name-cell">${c.city}</span></td><td>${fmtNumber(c.population)}</td><td>${fmtBRL(c.initialPayment)}</td></tr>`).join('');
    table.innerHTML=`<thead><tr><th>${Localization.t('state')}</th><th>${Localization.t('city')}</th><th>${Localization.t('populationHeader')}</th><th>${Localization.t('initialPaymentHeader')}</th></tr></thead><tbody>${rows}</tbody>`;
  }


  function isMobileLayout(){
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }







  function mobileSetPage(page){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    app.dataset.page=page||'start';
    if(isMobileLayout()){
      window.scrollTo({top:0,left:0,behavior:'auto'});
      if(app.dataset.page==='detail')renderMobileDetailedModel();
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


  const htmlEsc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
















  function renderMobileApp(){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    renderMobileStartScreen();
    if(model&&app.dataset.page==='detail')renderMobileDetailedModel();
  }

  function recalc(){
    state.activeScenario.assumptions=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const v=Validation.validateAssumptions(state.activeScenario.assumptions);
    errors=v.errors;
    model=FinancialEngine.calculate(state.activeScenario.assumptions);
    model.currency='BRL';
    UIRenderer.renderAll(state,model,errors);
    renderSelectedCityBanner();
    renderParameterButtonLabels();
    renderAccessibilityLabels();
    renderStartScreen();
    renderMobileApp();
    setScreen();
    renderSalesFlow();
    renderDesktopNextStepCard();
    persist();
  }


  function bind(){
    document.body.addEventListener('keydown',e=>{
      const modal=document.getElementById('parametersModal');
      if(!modal?.hidden&&e.key==='Escape'){e.preventDefault();closeParametersModal();}
      if(!modal?.hidden&&e.key==='Enter'&&e.target?.tagName!=='BUTTON'){e.preventDefault();confirmParameters();}
    });
    document.body.addEventListener('click',e=>{
      const salesTrigger=e.target.closest?.('[data-sales-action]');
      if(salesTrigger&&handleSalesAction(salesTrigger.dataset.salesAction,salesTrigger)){e.preventDefault();return}
      const parametersTrigger=e.target.closest('#parametersBtn');
      if(parametersTrigger){openParametersModal(parametersTrigger);return}
      if(e.target.closest('[data-close-parameters-modal], #cancelParametersBtn')){closeParametersModal();return}
      if(e.target.closest('#confirmParametersBtn')){confirmParameters();return}
      const cityRow=e.target.closest('[data-city-row]');
      if(cityRow){const city=cityById(cityRow.dataset.cityRow);if(city){startFilterState=city.state;startFilterCityId=city.id;}renderStartScreen();return}
      if(e.target.id==='startCalculateBtn'||e.target.id==='mobileCalculateBtn'){
        const city=cityById(startFilterCityId);
        if(!city)return;
        detailedReturnToBusinessCase=false;salesFlowActive=true;salesFlowStep=0;leadFormStarted=false;conversionCompleted=false;applySelectedCity(city);recalc();
        Analytics?.track?.('calculator_started',{city_id:city.id,state:city.state,language:state.language});
        Analytics?.track?.('city_selected',{city_id:city.id,state:city.state,population:Number(city.population)||0});
        trackSalesStep();
        window.scrollTo({top:0,behavior:'auto'});
        return;
      }
      if(e.target.closest('#changeCityBtn')){
        detailedReturnToBusinessCase=false;salesFlowActive=false;state.selectedCityId=null;renderStartScreen();setScreen();persist();Analytics?.track?.('change_city_clicked',{});return;
      }
    });
    document.getElementById('startLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileStartLanguageButton')?.addEventListener('click',()=>{state.language=state.language==='pt-BR'?'en':'pt-BR';Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;recalc();persist()});
    document.getElementById('salesFlowLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;Localization.setLanguage(state.language);recalc();persist()});
    document.body.addEventListener('focusin',e=>{if(e.target.closest?.('#leadContactForm')&&!leadFormStarted){leadFormStarted=true;Analytics?.track?.('lead_form_started',{city_id:state.selectedCityId});}});
    document.body.addEventListener('submit',e=>{
      const form=e.target.closest?.('#leadContactForm');if(!form)return;e.preventDefault();
      const name=String(document.getElementById('leadName')?.value||'').trim();const email=String(document.getElementById('leadEmail')?.value||'').trim();const status=document.getElementById('leadStatus');
      if(status)status.textContent='';conversionCompleted=true;Analytics?.track?.('lead_submitted',{city_id:state.selectedCityId,has_name:!!name,has_email:!!email});Analytics?.track?.('manager_contact_clicked',{city_id:state.selectedCityId,source:'lead_form'});window.open(buildWhatsAppHref({name,email}),'_blank','noopener');
    });
    document.getElementById('recommendedValuesCheckbox')?.addEventListener('change',e=>toggleRecommendedDraft(e.target.checked));
    document.getElementById('annualInvestmentBudgetInput')?.addEventListener('input',updateBudgetAssessment);
    document.getElementById('serviceAreaPopulationInput')?.addEventListener('input',updateBudgetAssessment);
    document.getElementById('startStateSelect').addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('startCitySelect').addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileStateSelect')?.addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileCitySelect')?.addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
  }
  function init(){hydrate();bind();recalc();Analytics?.track?.('app_open',{language:state.language});window.addEventListener('beforeunload',()=>{if(state.selectedCityId&&!conversionCompleted)Analytics?.track?.('app_abandoned',{city_id:state.selectedCityId,sales_step:salesFlowActive?salesFlowStep+1:0,detailed_model:!salesFlowActive});});}
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
