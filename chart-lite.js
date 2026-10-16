'use strict';
/*
 * Small local Chart.js-compatible renderer used by this calculator.
 * It implements only the bar-chart API required by the app, so charts work
 * when the project is opened directly from disk and no CDN is available.
 */
(function(global){
  if(global.Chart)return;

  const instances=new Set();
  let resizeTimer=0;

  function finite(value){
    const n=Number(value);
    return Number.isFinite(n)?n:0;
  }

  function colorAt(value,index,fallback){
    if(Array.isArray(value))return value[index]||fallback;
    return value||fallback;
  }

  function niceStep(range,target){
    if(!Number.isFinite(range)||range<=0)return 1;
    const rough=range/Math.max(2,target||5);
    const power=Math.pow(10,Math.floor(Math.log10(rough)));
    const fraction=rough/power;
    let nice=1;
    if(fraction>=7.5)nice=10;
    else if(fraction>=3.5)nice=5;
    else if(fraction>=1.5)nice=2;
    return nice*power;
  }

  function roundedRect(ctx,x,y,w,h,r){
    const radius=Math.max(0,Math.min(Math.abs(w)/2,Math.abs(h)/2,finite(r)));
    ctx.beginPath();
    ctx.moveTo(x+radius,y);
    ctx.lineTo(x+w-radius,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
    ctx.lineTo(x+w,y+h-radius);
    ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
    ctx.lineTo(x+radius,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
    ctx.lineTo(x,y+radius);
    ctx.quadraticCurveTo(x,y,x+radius,y);
    ctx.closePath();
  }

  function scheduleAll(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>instances.forEach(item=>item.resize()),60);
  }
  global.addEventListener('resize',scheduleAll,{passive:true});

  class LocalBarChart{
    constructor(canvas,config){
      this.canvas=typeof canvas==='string'?document.getElementById(canvas):canvas;
      this.config=config||{};
      this.data=this.config.data||{labels:[],datasets:[]};
      this.options=this.config.options||{};
      this._visibility=[];
      this._destroyed=false;
      this._raf=0;
      this._observer=null;
      instances.add(this);
      if(global.ResizeObserver&&this.canvas){
        this._observer=new ResizeObserver(()=>this.resize());
        const target=this.canvas.parentElement||this.canvas;
        this._observer.observe(target);
      }
      this.update();
    }

    isDatasetVisible(index){
      return this._visibility[index]!==false;
    }

    setDatasetVisibility(index,visible){
      this._visibility[index]=!!visible;
    }

    resize(){
      this.update('none');
    }

    update(){
      if(this._destroyed)return;
      cancelAnimationFrame(this._raf);
      this._raf=requestAnimationFrame(()=>this._draw());
    }

    destroy(){
      this._destroyed=true;
      cancelAnimationFrame(this._raf);
      if(this._observer)this._observer.disconnect();
      instances.delete(this);
      const ctx=this.canvas&&this.canvas.getContext&&this.canvas.getContext('2d');
      if(ctx)ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }

    _dimensions(){
      if(!this.canvas)return {width:0,height:0};
      const rect=this.canvas.getBoundingClientRect();
      const parent=this.canvas.parentElement;
      let width=rect.width||this.canvas.clientWidth||(parent&&parent.clientWidth)||300;
      let height=rect.height||this.canvas.clientHeight||(parent&&parent.clientHeight)||150;
      if(width<40&&parent)width=parent.clientWidth||300;
      if(height<40&&parent)height=parent.clientHeight||150;
      return {width:Math.max(40,Math.round(width)),height:Math.max(40,Math.round(height))};
    }

    _draw(){
      if(this._destroyed||!this.canvas||!this.canvas.getContext)return;
      const size=this._dimensions();
      if(size.width<=40||size.height<=40){
        // ResizeObserver or the next explicit update redraws when space is available.
        return;
      }
      const ratio=Math.max(1,Math.min(2,global.devicePixelRatio||1));
      const pixelWidth=Math.round(size.width*ratio);
      const pixelHeight=Math.round(size.height*ratio);
      if(this.canvas.width!==pixelWidth)this.canvas.width=pixelWidth;
      if(this.canvas.height!==pixelHeight)this.canvas.height=pixelHeight;
      const ctx=this.canvas.getContext('2d');
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.clearRect(0,0,size.width,size.height);

      const labels=(this.data&&this.data.labels)||[];
      const datasets=((this.data&&this.data.datasets)||[]).filter((_,i)=>this.isDatasetVisible(i));
      if(!labels.length||!datasets.length)return;

      const compact=size.width<420;
      const left=compact?45:52;
      const right=7;
      const top=7;
      const bottom=compact?25:24;
      const plotW=Math.max(10,size.width-left-right);
      const plotH=Math.max(10,size.height-top-bottom);
      const values=[];
      datasets.forEach(ds=>(ds.data||[]).forEach(v=>values.push(finite(v))));
      let min=Math.min(0,...values);
      let max=Math.max(0,...values);
      if(min===max){
        if(max===0){min=0;max=1;}
        else {min=Math.min(0,max*.8);max=Math.max(0,max*1.2);}
      }
      const rawRange=max-min;
      const maxTicks=finite(this.options?.scales?.y?.ticks?.maxTicksLimit)||5;
      const step=niceStep(rawRange,maxTicks-1);
      min=Math.floor(min/step)*step;
      max=Math.ceil(max/step)*step;
      if(min===max)max=min+step;
      const range=max-min;
      const yFor=value=>top+(max-value)/range*plotH;
      const zeroY=yFor(0);
      const fontFamily=(getComputedStyle(this.canvas).fontFamily||'Arial, sans-serif');
      const yFont=compact?9:10;
      const xFont=compact?9:9;
      const formatY=this.options?.scales?.y?.ticks?.callback;

      ctx.save();
      ctx.font=`${yFont}px ${fontFamily}`;
      ctx.textAlign='right';
      ctx.textBaseline='middle';
      ctx.fillStyle='#667085';
      ctx.strokeStyle='#e5e7eb';
      ctx.lineWidth=1;

      const firstTick=Math.ceil(min/step)*step;
      let tickCount=0;
      for(let value=firstTick;value<=max+step*.25&&tickCount<12;value+=step,tickCount++){
        const y=Math.round(yFor(value))+.5;
        ctx.beginPath();
        ctx.moveTo(left,y);
        ctx.lineTo(size.width-right,y);
        ctx.stroke();
        let text;
        try{text=typeof formatY==='function'?formatY(value):String(Math.round(value));}
        catch(_e){text=String(Math.round(value));}
        ctx.fillText(String(text),left-6,y);
      }

      if(min<0&&max>0){
        ctx.strokeStyle='#cfd6df';
        ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(left,Math.round(zeroY)+.5);
        ctx.lineTo(size.width-right,Math.round(zeroY)+.5);
        ctx.stroke();
      }
      ctx.restore();

      const groupW=plotW/labels.length;
      const categoryPct=Math.max(.2,Math.min(1,finite(datasets[0]?.categoryPercentage)||.72));
      const barPct=Math.max(.2,Math.min(1,finite(datasets[0]?.barPercentage)||.62));
      const usable=groupW*categoryPct;
      const barSlot=usable/datasets.length;
      const barW=Math.max(1,barSlot*barPct);

      labels.forEach((label,index)=>{
        const center=left+groupW*(index+.5);
        datasets.forEach((dataset,dsIndex)=>{
          const value=finite(dataset.data&&dataset.data[index]);
          const valueY=yFor(value);
          const y=Math.min(valueY,zeroY);
          const h=Math.max(0.75,Math.abs(zeroY-valueY));
          const x=center-usable/2+barSlot*dsIndex+(barSlot-barW)/2;
          ctx.save();
          roundedRect(ctx,x,y,barW,h,Math.min(4,finite(dataset.borderRadius)||0));
          ctx.fillStyle=colorAt(dataset.backgroundColor,index,'rgba(23,59,99,.35)');
          ctx.fill();
          if(finite(dataset.borderWidth)>0){
            ctx.strokeStyle=colorAt(dataset.borderColor,index,'#173b63');
            ctx.lineWidth=Math.min(2,finite(dataset.borderWidth));
            ctx.stroke();
          }
          ctx.restore();
        });
      });

      ctx.save();
      ctx.font=`${xFont}px ${fontFamily}`;
      ctx.fillStyle='#667085';
      ctx.textAlign='center';
      ctx.textBaseline='top';
      const xY=size.height-bottom+6;
      labels.forEach((label,index)=>{
        const center=left+groupW*(index+.5);
        ctx.fillText(String(label),center,xY);
      });
      ctx.restore();
    }
  }

  global.Chart=LocalBarChart;
})(window);
