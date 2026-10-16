'use strict';
const App=(()=>{
  let state, model, errors={}, undo=[], redo=[];
  let mobileChart=null;
  let businessCaseChart=null;
  let mobileStickyCtaObserver=null;
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
      s5Eyebrow:'SEU BUSINESS CASE',s5Title:'Seu business case para {city}',s5Intro:'Projeção de 12 meses com base no cenário atual.',scenarioRecommended:'Cenário recomendado',businessInsights:'PRINCIPAIS INSIGHTS',insightCompetition:'Concorrência',insightInvestment:'Volume do investimento',insightReturn:'Retorno projetado',nextStepEyebrow:'PRÓXIMO PASSO',nextStepTitle:'Pronto para discutir este business case?',nextStepText:'Vamos validar as condições locais e alinhar os próximos passos para o lançamento.',
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
      s5Eyebrow:'YOUR BUSINESS CASE',s5Title:'Your business case for {city}',s5Intro:'12-month projection based on the current scenario.',scenarioRecommended:'Recommended scenario',businessInsights:'KEY INSIGHTS',insightCompetition:'Competition',insightInvestment:'Investment amount',insightReturn:'Projected return',nextStepEyebrow:'NEXT STEP',nextStepTitle:'Ready to discuss this business case?',nextStepText:'Let us validate local conditions and align the next steps for launch.',
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
  function cityConfirmationLabel(city){return city?.availabilityRequiresConfirmation?salesT('availabilityConfirmation'):'';}
  function cityConfirmationBadge(city){const label=cityConfirmationLabel(city);return label?`<span class="city-confirmation-badge">${htmlEsc(label)}</span>`:'';}
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
  function salesIcon(name){
    const icons={
      investment:'<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v3h4v-3"/></svg>',
      demand:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.5-3.5 2.6-5.5 5.5-5.5s5 2 5.5 5.5M14 14.5c3.3 0 5.3 1.6 6 4.5"/></svg>',
      calendar:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3"/></svg>',
      tag:'<svg viewBox="0 0 24 24"><path d="M3 12l9 9 9-9-9-9H5a2 2 0 0 0-2 2v7z"/><circle cx="8" cy="8" r="1.5"/></svg>',
      percent:'<svg viewBox="0 0 24 24"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>',
      profit:'<svg viewBox="0 0 24 24"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/></svg>',
      calculator:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"/><rect x="8" y="6" width="8" height="3" rx="1"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
      key:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M15 8l3 3M17 6l3 3"/></svg>',
      megaphone:'<svg viewBox="0 0 24 24"><path d="M4 13V9l11-4v12L4 13z"/><path d="M15 9h2a3 3 0 0 1 0 6h-2M6 13l1.5 6h3L9 14"/></svg>',
      headset:'<svg viewBox="0 0 24 24"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="6" rx="2"/><rect x="17" y="12" width="4" height="6" rx="2"/></svg>',
      sms:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M6 9h12M6 13h8"/></svg>',
      chip:'<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>',
      warning:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>',
      city:'<svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V8h12v12M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01"/></svg>',
      pin:'<svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.2"/></svg>'
    };
    return `<span class="sales-icon sales-icon-${name}">${icons[name]||''}</span>`;
  }
  function renderBusinessCaseChart(){
    const canvas=document.getElementById('businessCaseChart');
    if(!canvas||!window.Chart||!Charts?.buildConfig||!model)return;
    const config=Charts.buildConfig(model);
    config.options={...config.options,responsive:true,maintainAspectRatio:false,resizeDelay:0,animation:false};
    if(config.options.plugins?.legend)config.options.plugins.legend.display=false;
    if(businessCaseChart){try{businessCaseChart.destroy()}catch(_e){} businessCaseChart=null;}
    businessCaseChart=new Chart(canvas,config);
  }
  function businessInsightHtml(s){
    const pt=state.language==='pt-BR';
    const competition=competitionLabel(s.competitionLevel);
    const investTone=s.totalInvestment>=100000?(pt?'Investimento elevado':'Higher investment'):s.totalInvestment>=50000?(pt?'Investimento moderado':'Moderate investment'):(pt?'Investimento mais enxuto':'Lean investment');
    const returnText=s.paybackPeriod?(pt?`Retorno estimado no mês ${s.paybackPeriod}, com ROI de ${Math.round(s.roi)}% em 12 meses.`:`Estimated payback in month ${s.paybackPeriod}, with ${Math.round(s.roi)}% ROI in 12 months.`):(pt?'Retorno não atingido em 12 meses.':'Payback not achieved within 12 months.');
    return `<section class="bc-insights"><div class="bc-insights-title">${htmlEsc(salesT('businessInsights'))}</div><div class="bc-insights-grid"><div><strong>${htmlEsc(salesT('insightCompetition'))}</strong><span>${htmlEsc(competition)}</span></div><div><strong>${htmlEsc(salesT('insightInvestment'))}</strong><span>${htmlEsc(investTone)}</span></div><div><strong>${htmlEsc(salesT('insightReturn'))}</strong><span>${htmlEsc(returnText)}</span></div></div></section>`;
  }
  function responsibilityPanel(kind,title,items){
    const more=state.language==='pt-BR'?'Ver responsabilidades completas':'View full responsibilities';
    return `<section class="f7-panel role-panel ${kind}"><header>${salesIcon(kind==='maxim'?'chip':'demand')}<div><small>${kind==='maxim'?'MAXIM':(state.language==='pt-BR'?'PARCEIRO':'PARTNER')}</small><h3>${htmlEsc(title)}</h3></div></header><ul class="role-summary">${items.map(x=>`<li>${htmlEsc(x[0])}</li>`).join('')}</ul><details class="role-details"><summary>${more}</summary><div class="role-details-body">${items.map(x=>`<section><h4>${htmlEsc(x[0])}</h4><p>${htmlEsc(x[1])}</p></section>`).join('')}</div></details></section>`;
  }
  function businessChartLegend(){
    const pt=state.language==='pt-BR';
    return `<div class="business-chart-legend" aria-label="${pt?'Legenda do gráfico':'Chart legend'}"><span><i class="legend-monthly" aria-hidden="true"></i>${htmlEsc(Localization.t('monthlyNetProfit'))}</span><span><i class="legend-cumulative" aria-hidden="true"></i>${htmlEsc(Localization.t('accumulatedNetProfit'))}</span><small>${pt?'Mensal: verde = positivo; vermelho = negativo.':'Monthly: green = positive; red = negative.'}</small></div>`;
  }
  function renderSalesFlow(){
    const shell=document.getElementById('salesFlow'),host=document.getElementById('salesFlowContent');
    if(!shell||!host||!model||!cityById(state.selectedCityId))return;
    const c=cityById(state.selectedCityId),s=model.summary,m12=model.months.find(x=>x.monthNo===12)||model.months[model.months.length-1];
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
      const serviceAreaPopulation=Number(s.serviceAreaPopulation||c.population); const showServiceArea=serviceAreaPopulation!==Number(c.population);
      inner=`<article class="sales-step sales-step-card final7" data-sales-step="0"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s1Eyebrow'))}</div><h1>${htmlEsc(salesT('s1Title',{city:c.city}))}</h1><p>${htmlEsc(salesT('s1Intro'))}</p></header><div class="sales-step-body"><div class="f7-potential-layout"><div class="f7-potential-grid ${showServiceArea?'with-service-area':''}"><div class="f7-potential-kpi neutral">${salesIcon('city')}<div><span>${htmlEsc(salesT('population'))}</span><strong>${htmlEsc(fmtNumber(c.population))}</strong></div></div>${showServiceArea?`<div class="f7-potential-kpi neutral">${salesIcon('pin')}<div><span>${htmlEsc(salesT('serviceArea'))}</span><strong>${htmlEsc(fmtNumber(serviceAreaPopulation))}</strong></div></div>`:''}<div class="f7-potential-kpi blue">${salesIcon('calendar')}<div><span>${htmlEsc(salesT('ridesM12'))}</span><strong>${htmlEsc(fmtNumber(s.targetRidesDay))}</strong></div></div><div class="f7-potential-kpi yellow">${salesIcon('profit')}<div><span>${htmlEsc(salesT('investment'))}</span><strong>${htmlEsc(fmtBRLCompact(s.totalInvestment))}</strong></div></div></div><aside class="f7-potential-reading"><span>${htmlEsc(salesT('competition'))}</span><strong>${htmlEsc(competition)}</strong><p>${htmlEsc(marketUncertainty?salesT('pendingText'):(state.language==='pt-BR'?'O cenário considera o nível de competição disponível na base e o incorpora ao ritmo de crescimento e ao investimento recomendado.':'The scenario considers the available competition level and incorporates it into growth pace and recommended investment.'))}</p></aside></div></div>${salesNavHtml('nextRevenue',false)}</article>`;
    }else if(salesFlowStep===1){
      const monthly=fmtNumber(m12.ridesPerMonth), fare=fmtBRL(m12.averageFare), comm=Number(m12.commission).toLocaleString(state.language==='pt-BR'?'pt-BR':'en-US',{maximumFractionDigits:1}), gross=fmtBRL(m12.commissionFromRides);
      const cards=[['demand',state.language==='pt-BR'?'Demanda local':'Local demand',state.language==='pt-BR'?'Usuários geram solicitações todos os dias.':'Users generate ride requests every day.'],['calendar',Localization.t('ridesPerMonth'),state.language==='pt-BR'?'Motoristas aceitam e concluem os pedidos gerados pela demanda.':'Drivers accept and complete requests generated by demand.'],['tag',Localization.t('averageRidePrice').replace(/,?\s*R\$/i,''),state.language==='pt-BR'?'Define o valor médio considerado em cada corrida concluída.':'Defines the average value considered for each completed ride.'],['percent',salesT('drivers')==='Motoristas parceiros'?'Comissão dos motoristas':'Driver commission',state.language==='pt-BR'?'A comissão configurada sobre cada corrida concluída forma a receita bruta.':'The commission configured on each completed ride forms gross revenue.'],['profit',Localization.t('netProfit'),state.language==='pt-BR'?'Após o investimento projetado e as despesas operacionais, obtemos o resultado líquido.':'After projected investment and operating expenses, we obtain the net result.']];
      inner=`<article class="sales-step sales-step-card final7" data-sales-step="1"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s2Eyebrow'))}</div><h1>${state.language==='pt-BR'?'Como o serviço gera receita mês a mês':'How the service generates revenue month by month'}</h1><p>${state.language==='pt-BR'?'O modelo conecta demanda, pedidos concluídos, preço médio da corrida e comissão dos motoristas para projetar receita e resultado ao longo do primeiro ano.':'The model connects demand, completed rides, average ride price and driver commission to project revenue and results through the first year.'}</p></header><div class="sales-step-body f7-s2-body"><div class="f7-chain">${cards.map((x,i)=>`<div class="f7-chain-card c${i}">${salesIcon(x[0])}<h3>${htmlEsc(x[1])}</h3><p>${htmlEsc(x[2])}</p></div>${i<cards.length-1?'<span class="f7-arrow">→</span>':''}`).join('')}</div><section class="f7-logic"><div class="f7-logic-head">${salesIcon('calculator')}<div><h3>${state.language==='pt-BR'?'Lógica do modelo':'Model logic'}</h3><p>${state.language==='pt-BR'?'A receita bruta mensal é calculada a partir dos pedidos concluídos, do preço médio da corrida e da comissão dos motoristas.':'Monthly gross revenue is calculated from completed rides, average ride price and driver commission.'}</p></div></div><div class="f7-formula-row"><span class="blue">${htmlEsc(Localization.t('ridesPerMonth'))}</span><b>×</b><span class="neutral">${htmlEsc(Localization.t('averageRidePrice').replace(/,?\s*R\$/i,''))}</span><b>×</b><span class="blue">${state.language==='pt-BR'?'Comissão dos motoristas':'Driver commission'}</span><b>=</b><span class="blue strong">${htmlEsc(Localization.t('grossRevenue'))}</span></div><small>${state.language==='pt-BR'?'Mês':'Month'} 12: ${monthly} × ${fare} × ${comm}% = ${gross}</small><div class="f7-logic-divider">${state.language==='pt-BR'?'RESULTADO PROJETADO — 12 MESES':'PROJECTED RESULT — 12 MONTHS'}</div><div class="f7-formula-row second"><span class="blue">${htmlEsc(Localization.t('grossRevenue'))}</span><b>−</b><span class="yellow">${htmlEsc(salesT('totalInvestment'))}</span><b>−</b><span class="red">${htmlEsc(Localization.t('summaryOperatingExpenses'))}</span><b>=</b><span class="green strong">${htmlEsc(Localization.t('netProfit'))}</span></div></section><div class="revenue-summary"><div><span>${htmlEsc(salesT('ridesM12'))}</span><strong>${fmtNumber(m12.ridesPerDay)}</strong></div><div><span>${htmlEsc(salesT('grossRevenue12'))}</span><strong>${fmtBRLCompact(s.totalGrossRevenue)}</strong></div></div></div>${salesNavHtml('nextCosts')}</article>`;
    }else if(salesFlowStep===2){
      const includeItems=[['key',state.language==='pt-BR'?'Taxa de licença inicial':'Initial licence fee',`${fmtBRL(s.initialPayment)} · ${state.language==='pt-BR'?'saída de caixa de pré-abertura':'pre-opening cash outflow'}`,'inv'],['megaphone',Localization.t('marketingInvestment'),`${fmtBRL(s.totalMarketingInvestment)} · ${state.language==='pt-BR'?'orçamento anual de marketing e desenvolvimento':'annual marketing and development budget'}`,'inv'],['headset',Localization.t('assistente'),state.language==='pt-BR'?'R$ 250 ou R$ 500/mês, conforme a faixa aplicável.':'R$ 250 or R$ 500/month, according to the applicable tier.','exp'],['sms',Localization.t('smsNotifications'),state.language==='pt-BR'?'Custo conforme o volume de pedidos concluídos.':'Cost according to completed ride volume.','exp'],['chip',Localization.t('maximRevenue'),state.language==='pt-BR'?'Aplicada conforme a faixa mensal da base de cálculo.':'Applied according to the monthly calculation tier.','exp']];
      const excluded=[[ 'warning', state.language==='pt-BR'?'Tributos e obrigações fiscais':'Taxes and fiscal obligations', state.language==='pt-BR'?'ISSQN, impostos sobre vendas, retenções e outras obrigações fiscais aplicáveis.':'ISSQN, sales taxes, withholding and other applicable tax obligations.'],['city',state.language==='pt-BR'?'Estrutura e custos locais do parceiro':'Partner local structure and costs',state.language==='pt-BR'?'Equipe local, contabilidade, banco, internet, transporte, mídia local adicional e outros serviços necessários à operação.':'Local team, accounting, banking, internet, transport, additional local media and other services required for the operation.'],['pin',state.language==='pt-BR'?'Adequações e obrigações antes do lançamento':'Pre-launch adaptations and obligations',state.language==='pt-BR'?'Exigências municipais, atualização do mapa, materiais locais, adaptações operacionais e despesas específicas da cidade precisam ser confirmadas.':'Municipal requirements, map updates, local materials, operational adaptations and city-specific expenses must be confirmed.']];
      const maxim=[['Plataforma e tecnologia',salesT('maxim1')],['Suporte operacional',salesT('maxim2')],['Preparação e desenvolvimento',salesT('maxim3')],['Acompanhamento dedicado',salesT('maxim4')]];
      const partner=[['Desenvolver a operação local',salesT('partner1')],['Promover o serviço',salesT('partner2')],['Formar a comunidade de motoristas',salesT('partner3')],['Manter os dados locais atualizados',salesT('partner4')],['Acompanhar mercado e operação',salesT('partner5')]];
      const titleOr=(pt,en)=>state.language==='pt-BR'?pt:en;
      inner=`<article class="sales-step sales-step-card final7" data-sales-step="2"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s3Eyebrow'))}</div><h1>${htmlEsc(salesT('s3Title'))}</h1><p>${htmlEsc(salesT('s3Intro'))}</p></header><div class="sales-step-body f7-s3-body"><div class="f7-resp-grid"><section class="f7-panel included"><header>${salesIcon('warning')}<div><h3>${htmlEsc(salesT('included'))}</h3><p>${titleOr('Custos e taxas já considerados na projeção','Costs and fees already included in the projection')}</p></div></header><div class="f7-included-grid">${includeItems.map((x,i)=>`<div class="f7-mini ${x[3]}">${salesIcon(x[0])}<div><strong>${htmlEsc(x[1])}</strong><span>${htmlEsc(x[2])}</span></div></div>`).join('')}</div></section><section class="f7-panel excluded"><header>${salesIcon('warning')}<div><h3>${htmlEsc(salesT('notIncluded'))}</h3><p>${titleOr('Itens que precisam ser confirmados para a operação local','Items that must be confirmed for the local operation')}</p></div></header><div class="f7-excluded-list">${excluded.map(x=>`<div>${salesIcon(x[0])}<div><strong>${htmlEsc(x[1])}</strong><span>${htmlEsc(x[2])}</span></div></div>`).join('')}</div></section>${responsibilityPanel('maxim',salesT('maximProvides'),maxim.map((x,i)=>[titleOr(x[0],['Platform and technology','Operational support','Launch preparation and development','Dedicated guidance'][i]),x[1]]))}${responsibilityPanel('partner',salesT('partnerDoes'),partner.map((x,i)=>[titleOr(x[0],['Develop the local operation','Promote the service','Build the driver community','Keep local data updated','Monitor market and operation'][i]),x[1]]))}</div></div>${salesNavHtml('nextRisks')}</article>`;
    }else if(salesFlowStep===3){
      const risks=[['riskMarket','riskMarketText','riskMarketAction'],['riskDemand','riskDemandText','riskDemandAction'],['riskTariff','riskTariffText','riskTariffAction'],['riskMap','riskMapText','riskMapAction'],['riskLegal','riskLegalText','riskLegalAction']];
      inner=`<article class="sales-step sales-step-card final7" data-sales-step="3"><header class="sales-step-head"><div class="sales-step-eyebrow">${htmlEsc(salesT('s4Eyebrow'))}</div><h1>${htmlEsc(salesT('s4Title'))}</h1><p>${htmlEsc(salesT('s4Intro'))}</p></header><div class="sales-step-body"><div class="risk-list refined">${risks.map((r,i)=>`<div class="risk-card refined"><div class="risk-top"><div class="risk-badge">${i+1}</div><div class="risk-copy"><h3>${htmlEsc(salesT(r[0]))}</h3><p>${htmlEsc(salesT(r[1]))}</p></div></div><div class="risk-action"><strong>${state.language==='pt-BR'?'Controle':'Control'}</strong><span>${htmlEsc(salesT(r[2]).replace(/^Controle:\s*/,'').replace(/^Control:\s*/,''))}</span></div></div>`).join('')}</div><div class="market-uncertainty risk-disclaimer-card"><div class="risk-badge">i</div><div><strong>${htmlEsc(salesT('riskDisclaimer'))}</strong>${marketUncertainty?`<p>${htmlEsc(salesT('pendingText'))}</p>`:''}</div></div></div>${salesNavHtml('nextCase')}</article>`;
    }else{
      const payback=s.paybackPeriod?`${salesT('month')} ${s.paybackPeriod}`:salesT('notWithin');
      const status=`<div class="bc-status-row"><span class="bc-status good">✓ ${htmlEsc(model.assumptions.useRecommendedValues?salesT('scenarioRecommended'):(state.language==='pt-BR'?'Cenário personalizado':'Custom scenario'))}</span>${c.availabilityRequiresConfirmation?`<span class="bc-status warning">! ${htmlEsc(salesT('availabilityConfirmation'))}</span>`:''}</div>`;
      const kpis=[['yellow','investment',salesT('totalInvestment'),fmtBRL(s.totalInvestment),'investment'],['blue','profit',salesT('grossRevenue12'),fmtBRL(s.totalGrossRevenue),'operations'],['red','calculator',salesT('opex12'),fmtBRL(s.totalOperatingExpenses),'expenses'],['green','profit',salesT('netProfit12'),fmtBRL(s.netProfit),'profit'],['purple','percent',salesT('roi12'),`${Math.round(s.roi)}%`,'roi'],['green','calendar',salesT('payback'),payback,'payback']];
      inner=`<article class="sales-step sales-step-card final7" data-sales-step="4"><header class="sales-step-head f7-case-head"><div><div class="sales-step-eyebrow">${htmlEsc(salesT('s5Eyebrow'))}</div><h1>${htmlEsc(salesT('s5Title',{city:c.city}))}</h1>${status}<p>${htmlEsc(salesT('s5Intro'))}</p></div></header><div class="sales-step-body f7-case-body"><div class="f7-case-main"><div class="f7-case-left"><div class="f7-kpi-grid">${kpis.map(k=>`<button class="f7-kpi ${k[0]}" type="button" data-section-help="${k[4]}">${salesIcon(k[1])}<span>${htmlEsc(k[2])}</span><strong>${htmlEsc(k[3])}</strong><i>i</i></button>`).join('')}</div></div><div class="f7-case-right"><section class="f7-chart-card"><div class="f7-chart-head"><div><strong>${state.language==='pt-BR'?'VISÃO GERAL DO FLUXO DE CAIXA':'CASH FLOW OVERVIEW'}</strong><span>${Localization.t('chartSubtitle')}</span></div><span class="f7-m12">M12: ${fmtBRLCompact(m12.accumulated)}</span></div><div class="f7-chart-box"><canvas id="businessCaseChart" role="img" aria-label="${htmlEsc(Localization.t('chartSubtitle'))}"></canvas></div>${businessChartLegend()}<div class="f7-payback-note">ⓘ ${s.paybackPeriod?(state.language==='pt-BR'?`O saldo acumulado atinge zero ou se torna positivo pela primeira vez no mês ${s.paybackPeriod}.`:`Cumulative cash flow first reaches zero or becomes positive in month ${s.paybackPeriod}.`):(state.language==='pt-BR'?'O investimento não é recuperado dentro dos 12 meses projetados.':'The investment is not recovered within the 12-month projection.')}</div></section></div></div>${businessInsightHtml(s)}</div><div class="sales-nav sales-nav-final"><button class="sales-btn" type="button" data-sales-action="prev">← ${htmlEsc(salesT('back'))}</button><div class="f7-case-actions"><button class="sales-btn detailed-model-btn" type="button" data-sales-action="open-detailed">${htmlEsc(salesT(isMobileLayout()?'openMonthlyDetail':'openDetailed'))} →</button><details class="contact-disclosure"><summary>${htmlEsc(Localization.t("mobileFinalCtaButton"))}</summary><form id="leadContactForm" class="f7-next-step"><div><small>${htmlEsc(salesT('nextStepEyebrow'))}</small><strong>${htmlEsc(salesT('nextStepTitle'))}</strong><span>${htmlEsc(salesT('nextStepText'))}</span></div><div class="lead-grid"><input id="leadName" name="name" autocomplete="name" aria-label="${htmlEsc(salesT('name'))}" placeholder="${htmlEsc(salesT('name'))}"><input id="leadEmail" name="email" type="email" autocomplete="email" aria-label="${htmlEsc(salesT('email'))}" placeholder="${htmlEsc(salesT('email'))}"><button type="submit">${htmlEsc(salesT('leadButton'))} →</button></div><div id="leadStatus" class="lead-status"></div></form></details></div></div></article>`;
    }
    host.innerHTML=inner;
    if(salesFlowStep===4)requestAnimationFrame(()=>requestAnimationFrame(renderBusinessCaseChart));
  }
  function trackSalesStep(){
    const events=['city_potential_viewed','revenue_viewed','investment_viewed','risk_viewed','business_case_viewed'];
    Analytics?.track?.(events[salesFlowStep]||'guided_step_viewed',{step:salesFlowStep+1,city_id:state.selectedCityId,language:state.language});
    if(salesFlowStep===2)Analytics?.track?.('opex_viewed',{step:3,city_id:state.selectedCityId,language:state.language});
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
    if(action==='change-city'){detailedReturnToBusinessCase=false;salesFlowActive=false;state.selectedCityId=null;delete document.body.dataset.mobileSlide;renderStartScreen();setScreen();persist();Analytics?.track?.('change_city_clicked',{});return true;}
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
    state.activeScenario.assumptions.marketingDistributionPreset='auto';
    state.activeScenario.assumptions.marketingDistribution=FinancialEngine.marketingSharesForPopulation(serviceAreaPopulation);
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
      marketingBudget:(document.getElementById('annualInvestmentBudgetInput')?.value.trim()===''?NaN:Number(document.getElementById('annualInvestmentBudgetInput')?.value)),
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
    const budget=Math.max(0,(document.getElementById('annualInvestmentBudgetInput')?.value.trim()===''?NaN:Number(document.getElementById('annualInvestmentBudgetInput')?.value))||0);
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

  function renderAccessibilityLabels(){
    const set=(selector,key,title=false)=>{document.querySelectorAll(selector).forEach(el=>{const value=Localization.t(key);el.setAttribute('aria-label',value);if(title)el.title=value;});};
    set('#mobileLanguageSelect,#startLanguageSelect,#mobileStartLanguageButton','languageLabel');
    set('.top-action-pair','calculatorControls');
    set('#openChartModal','openLargeChart',true);
    set('#chartLegendInline','chartSeriesControls');
    set('#mobileApp','mobileSmallApp');
    set('.parameters-modal-close,.section-help-close,.chart-modal-close','closeDialog');
    set('.parameters-compact-pair','tripEconomicsParameters');
    set('.mobile-arrow-next,[data-mobile-target].mobile-slide-button:not(.mobile-slide-button-top)','nextScreen');
    set('.mobile-arrow-prev,.mobile-slide-button-top','previousScreen');
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
    pushUndo();
    const a=state.activeScenario.assumptions;
    a.useRecommendedValues=useRecommended;
    a.serviceAreaPopulation=FinancialEngine.isMicroCityPopulation(a.population)?values.serviceAreaPopulation:a.population;
    a.marketingBudget=values.marketingBudget;
    a.averageFare=values.averageFare;
    a.commission=values.commission;
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=FinancialEngine.marketingSharesForPopulation(a.serviceAreaPopulation||a.population);
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
    if(!hasCity){delete document.body.dataset.mobileSlide;if(mobileApp)mobileApp.dataset.page='start';}
    else if(!inSalesFlow&&isMobileLayout()&&!document.body.dataset.mobileSlide){document.body.dataset.mobileSlide='kpi';if(mobileApp)mobileApp.dataset.page='kpi';}
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
      btn.setAttribute('aria-label',Localization.t('nextScreen'));
      btn.innerHTML='<span>↓</span>';
      hero.appendChild(btn);
    }

    if(!document.getElementById('mobileChartPrev')){
      const btn=document.createElement('button');
      btn.id='mobileChartPrev';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-top';
      btn.setAttribute('data-mobile-target','.hero-row');
      btn.setAttribute('aria-label',Localization.t('previousScreen'));
      btn.innerHTML='<span>↑</span>';
      chart.prepend(btn);
    }
    if(!document.getElementById('mobileChartNext')){
      const btn=document.createElement('button');
      btn.id='mobileChartNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','#mobileInsightsSummary');
      btn.setAttribute('aria-label',Localization.t('nextScreen'));
      btn.innerHTML='<span>↓</span>';
      chart.appendChild(btn);
    }

    let combined=document.getElementById('mobileInsightsSummary');
    if(!combined){
      combined=document.createElement('section');
      combined.id='mobileInsightsSummary';
      combined.className='side-card mobile-insights-summary-card';
      combined.innerHTML=`
        <button type="button" class="mobile-slide-button mobile-slide-button-top" data-mobile-target=".chart-card" aria-label="${htmlEsc(Localization.t('previousScreen'))}"><span>↑</span></button>
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
    const next=page||'kpi';
    app.dataset.page=next;
    document.body.dataset.mobileSlide=next;
    if(isMobileLayout()){
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      window.scrollTo(0,0);
      if(next==='detail'){
        renderMobileDetailedModel();
      }else{
        renderMobileKpis();
        renderMobileSummaryAndDetail();
        setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},20);
        setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},160);
      }
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
      city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
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
    const serviceArea=Number(model.summary.serviceAreaPopulation||c?.population||0);
    const regionalMeta=c&&serviceArea>Number(c.population)?` · ${Localization.t('serviceAreaPopulationLabel')}: ${fmtNumber(serviceArea)}`:'';
    const pay=fmtBRL(model.summary.initialPayment||0);
    const paybackText=mobileMonthLabel(model.summary.paybackPeriod);
    const monthlyBreakEven=mobileMonthLabel(model.summary.breakEvenPeriod);
    const profitCompact=fmtBRLCompact(model.summary.netProfit);
    const cards=[
      {cls:'city',icon:'city',label:Localization.t('selectedCity'),value:cityTitle,sub:`${Localization.t('populationHeader')}: ${pop}${regionalMeta} · ${Localization.t('initialPaymentHeader')}: ${pay}`},
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
    const href=buildWhatsAppHref();
    if(finalCta){finalCta.textContent=Localization.t('mobileFinalCtaButton');finalCta.href=href;finalCta.dataset.salesAction='contact-link';}
    if(stickyCta){stickyCta.textContent=Localization.t('mobileStickyCta');stickyCta.href=href;stickyCta.dataset.salesAction='contact-link';}
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
      ['grossRevenue',model.summary.totalGrossRevenue,'currency','summary-positive-row'],
      ['totalOperatingExpenses',model.summary.totalOperatingExpenses,'currency','summary-expense-row'],
      ['netProfit',model.summary.netProfit,'currency','summary-positive-row'],
      ['roi12',model.summary.roi,'%','summary-positive-row'],
      ['paybackPeriod',model.summary.paybackPeriod?`${Localization.t('month')} ${model.summary.paybackPeriod}`:Localization.t('notAchieved12'),'','summary-positive-row']
    ];
    dst.innerHTML=rows.map(([key,val,type,cls])=>{
      const value=typeof val==='number'?(type==='%'?Math.round(val)+'%':fmtBRL(val)):val;
      const labelKey=key==='totalOperatingExpenses'?'summaryOperatingExpenses':key;
      return `<div class="summary-row ${cls||''}"><span>${htmlEsc(Localization.t(labelKey))}</span><span>${htmlEsc(value)}</span></div>`;
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
      if(document.getElementById('mobileApp').dataset.page==='detail')renderMobileDetailedModel();
      if(isMobileLayout()&&document.getElementById('mobileApp').dataset.page!=='detail')setTimeout(renderMobileChart,50);
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
    renderAccessibilityLabels();
    renderStartScreen();
    syncMobilePresentation();
    renderMobileApp();
    setScreen();
    renderSalesFlow();
    renderDesktopNextStepCard();
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
      const salesTrigger=e.target.closest?.('[data-sales-action]');
      if(salesTrigger&&handleSalesAction(salesTrigger.dataset.salesAction,salesTrigger)){e.preventDefault();return}
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
        pushUndo();detailedReturnToBusinessCase=false;salesFlowActive=true;salesFlowStep=0;leadFormStarted=false;conversionCompleted=false;applySelectedCity(city);recalc();
        Analytics?.track?.('calculator_started',{city_id:city.id,state:city.state,language:state.language});
        Analytics?.track?.('city_selected',{city_id:city.id,state:city.state,population:Number(city.population)||0});
        trackSalesStep();
        window.scrollTo({top:0,behavior:'auto'});
        return;
      }
      if(e.target.closest('#changeCityBtn')||e.target.closest('#mobileChangeCityBtn')){
        detailedReturnToBusinessCase=false;salesFlowActive=false;state.selectedCityId=null;delete document.body.dataset.mobileSlide;renderStartScreen();setScreen();persist();Analytics?.track?.('change_city_clicked',{});return;
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
    document.getElementById('salesFlowLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;Localization.setLanguage(state.language);recalc();persist()});
    document.body.addEventListener('focusin',e=>{if(e.target.closest?.('#leadContactForm')&&!leadFormStarted){leadFormStarted=true;Analytics?.track?.('lead_form_started',{city_id:state.selectedCityId});}});
    document.body.addEventListener('submit',e=>{
      const form=e.target.closest?.('#leadContactForm');if(!form)return;e.preventDefault();
      const name=String(document.getElementById('leadName')?.value||'').trim();const email=String(document.getElementById('leadEmail')?.value||'').trim();const status=document.getElementById('leadStatus');
      if(status)status.textContent='';conversionCompleted=true;Analytics?.track?.('lead_submitted',{city_id:state.selectedCityId,has_name:!!name,has_email:!!email});Analytics?.track?.('manager_contact_clicked',{city_id:state.selectedCityId,source:'lead_form'});window.open(buildWhatsAppHref({name,email}),'_blank','noopener');
    });
    window.addEventListener('resize',()=>{if(isMobileLayout()&&cityById(state.selectedCityId)&&!salesFlowActive&&!document.body.dataset.mobileSlide)document.body.dataset.mobileSlide='kpi';});
    document.getElementById('recommendedValuesCheckbox')?.addEventListener('change',e=>toggleRecommendedDraft(e.target.checked));
    document.getElementById('annualInvestmentBudgetInput')?.addEventListener('input',updateBudgetAssessment);
    document.getElementById('serviceAreaPopulationInput')?.addEventListener('input',updateBudgetAssessment);
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
  function init(){hydrate();bind();bindMobileGestures();recalc();Analytics?.track?.('app_open',{language:state.language});window.addEventListener('beforeunload',()=>{if(state.selectedCityId&&!conversionCompleted)Analytics?.track?.('app_abandoned',{city_id:state.selectedCityId,sales_step:salesFlowActive?salesFlowStep+1:0,detailed_model:!salesFlowActive});});}
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
