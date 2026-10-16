'use strict';
const Analytics=(()=>{
  const SESSION_KEY='br_maxim_analytics_session_v1';
  const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  let sessionId='';
  const memory=[];
  try{sessionId=sessionStorage.getItem('br_maxim_session_id')||id();sessionStorage.setItem('br_maxim_session_id',sessionId);}catch(_e){sessionId=id();}
  function cleanProperties(input={}){
    const out={};
    Object.entries(input||{}).forEach(([key,value])=>{
      // Never store contact fields or arbitrary free text in product analytics.
      if(/name|email|phone|whatsapp|message|note/i.test(key))return;
      if(value===undefined||value===null)return;
      if(typeof value==='string')out[key]=value.slice(0,120);
      else if(typeof value==='number'||typeof value==='boolean')out[key]=value;
    });
    return out;
  }
  function track(event,properties={}){
    const payload={event:String(event),timestamp:new Date().toISOString(),session_id:sessionId,...cleanProperties(properties)};
    memory.push(payload);
    if(memory.length>200)memory.splice(0,memory.length-200);
    try{
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push(payload);
    }catch(_e){}
    try{
      const current=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'[]');
      current.push(payload);
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(current.slice(-200)));
    }catch(_e){}
    try{window.dispatchEvent(new CustomEvent('maxim:analytics',{detail:payload}));}catch(_e){}
    return payload;
  }
  function getSessionEvents(){try{const stored=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'[]');return stored.length?stored:memory.slice()}catch(_e){return memory.slice()}}
  return{track,getSessionEvents,sessionId:()=>sessionId};
})();
