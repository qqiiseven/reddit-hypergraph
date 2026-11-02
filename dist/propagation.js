/* Local simulation UI; no backend, telemetry, or remote dependency. */
(()=>{'use strict';
const M=window.PropagationModel,net=M.network(),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let params,result,stats,t=0,timer=null,view='single',seed=17,hover=-1,applied=true;
const fmt=v=>(100*v).toFixed(1)+'%';
function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function controls(){for(const key of ['initial','beta','gamma','mu'])$(key+'-value').textContent=key==='initial'?Math.round(net.n*+$('initial').value/100)+' 人 · '+$('initial').value+'%':Number($(key).value).toFixed(key==='mu'?2:3);}
function read(){return {initial:+$('initial').value/100,beta:+$('beta').value,gamma:+$('gamma').value,mu:+$('mu').value,steps:300};}
const refs=[];
function initGraph(id,isHyper){const svg=$(id),r={nodes:[],groups:[],edges:[],isHyper};
 if(isHyper)net.groups.forEach((g,i)=>{const p=el('polygon',{points:g.map(n=>net.nodes[n].x+','+net.nodes[n].y).join(' '),fill:'#70b5c410',stroke:'#68a8ba25','stroke-width':.8,'stroke-linejoin':'round',class:'group'});p.append(el('title',{},'E'+(i+1)+' · 成员 '+g.map(n=>'U'+String(n+1).padStart(2,'0')).join('、')));svg.append(p);r.groups.push(p);});
 net.edges.forEach(([a,b])=>{const p=el('line',{x1:net.nodes[a].x,y1:net.nodes[a].y,x2:net.nodes[b].x,y2:net.nodes[b].y,stroke:isHyper?'#9cb9cc':'#abc0d5','stroke-opacity':isHyper?.16:.55,'stroke-width':.8});svg.append(p);r.edges.push(p);});
 net.nodes.forEach(n=>{const c=el('circle',{cx:n.x,cy:n.y,r:5.3,fill:'#dbe9f5',stroke:'#a1bdd8','stroke-width':.8,class:'person'});c.append(el('title',{},'U'+String(n.id+1).padStart(2,'0')));c.addEventListener('mouseenter',()=>{hover=n.id;drawGraphs();});c.addEventListener('mouseleave',()=>{hover=-1;drawGraphs();});svg.append(c);r.nodes.push(c);});refs.push(r);
}
function paint(r,f){const triggered=new Set(f.triggered);r.nodes.forEach((c,i)=>{c.setAttribute('fill',f.state[i]?'#ec907b':'#dbe9f5');c.setAttribute('stroke',i===hover?'#24425e':f.state[i]?'#d97865':'#9fbedb');c.setAttribute('r',i===hover?8:5.3);});
 r.groups.forEach((p,i)=>{const selected=hover>=0&&net.groups[i].includes(hover),tr=triggered.has(i);p.setAttribute('fill',selected?'#49b8c333':tr?'#f49b6f55':'#7cb2c00c');p.setAttribute('stroke',selected?'#2e9dac':tr?'#e79565':'#7aa8b533');p.setAttribute('stroke-width',selected?2:tr?1.5:.6);});
 r.edges.forEach((l,i)=>{const selected=hover>=0&&net.edges[i].includes(hover);l.setAttribute('stroke',selected?'#4389de':'#abc0d5');l.setAttribute('stroke-opacity',selected?1:r.isHyper?.16:.5);l.setAttribute('stroke-width',selected?1.8:.8);});
}
function drawGraphs(){paint(refs[0],result.baseline[t]);paint(refs[1],result.hyper[t]);}
function frame(){t=Math.max(0,Math.min(params.steps,t));$('timeline').value=t;$('time').textContent=t;drawGraphs();for(const [key,prefix]of [['baseline','base'],['hyper','hyper']]){const f=result[key][t];$(prefix+'-count').textContent=f.count;$(prefix+'-event').innerHTML=`<span>本步两两新增 <b>+${f.pair}</b></span>${prefix==='hyper'?`<span class="joint">仅群体触发 +${f.joint}</span>`:''}<span>恢复 <b>−${f.recovered}</b></span>`;}drawCurve();}
function path(values,x,y){return values.map((v,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(v).toFixed(2)).join(' ');}
function drawCurve(){const svg=$('curve');svg.replaceChildren();const x=v=>48+v/params.steps*690,y=v=>202-v*170;
 for(let v=0;v<=1.0001;v+=.25){svg.append(el('line',{x1:48,y1:y(v),x2:738,y2:y(v),stroke:'#eaf0f6'}));svg.append(el('text',{x:38,y:y(v)+4,'font-size':10,fill:'#889aaf','text-anchor':'end'},Math.round(v*100)+'%'));}
 for(let v=0;v<=300;v+=60)svg.append(el('text',{x:x(v),y:221,'font-size':10,fill:'#889aaf','text-anchor':'middle'},v));
 svg.append(el('text',{x:48,y:15,'font-size':10,fill:'#8b9cb0'},'参与比例'));svg.append(el('text',{x:738,y:237,'font-size':9,fill:'#8b9cb0','text-anchor':'end'},'离散时间步'));
 for(const [key,color]of [['baseline','#5087d7'],['hyper','#e58a72']]){let values;if(view==='ensemble'){const ps=stats[key].paths;values=ps.map(p=>p.mean);const band=path(ps.map(p=>p.hi),x,y)+' '+ps.map((p,i)=>'L'+x(params.steps-i).toFixed(2)+','+y(ps[params.steps-i].lo).toFixed(2)).join(' ')+' Z';svg.append(el('path',{d:band,fill:color,opacity:.12}));}else values=result[key].map(f=>f.count/net.n);
 svg.append(el('path',{d:path(values,x,y),fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round'}));svg.append(el('circle',{cx:x(t),cy:y(values[t]),r:4,fill:color,stroke:'white','stroke-width':1.5}));}
 svg.append(el('line',{x1:x(t),x2:x(t),y1:28,y2:202,stroke:'#6985a9','stroke-dasharray':'3 4','stroke-width':.8}));
 svg.append(el('text',{x:Math.max(60,Math.min(710,x(t))),y:23,'font-size':10,fill:'#617d9d','text-anchor':'middle'},'t = '+t));
}
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶ 播放';}
function play(){if(!applied)return;if(timer){stop();return;}if(t>=params.steps)t=0;$('play').textContent='Ⅱ 暂停';timer=setInterval(()=>{t+=+$('speed').value;if(t>=params.steps){t=params.steps;stop();}frame();},100);}
function summary(){const b=stats.baseline,h=stats.hyper;$('ensemble-bars').innerHTML=[['两两',b.tail,'#5087d7'],['群体',h.tail,'#e58a72']].map(([name,v,color])=>`<div class="metric"><span>${name}</span><div class="bar-track"><div class="bar" style="width:${v*100}%;background:${color}"></div></div><b style="color:${color}">${fmt(v)}</b></div>`).join('');$('survival').textContent=`到第 300 步仍有参与者：两两 ${b.survived}/20 · 群体 ${h.survived}/20`;
 $('result-note').textContent=params.gamma===0?'群体作用为 0：相同随机事件下，两侧完整轨迹一致。':`末段参与比例差 ${(100*(h.tail-b.tail)).toFixed(1)} 个百分点。这是指定机制下的模拟差异，不是预测提升。`;
 $('chart-label').textContent=view==='single'?'当前随机种子：'+seed:'阴影：10%–90% 经验分位范围';
}
function run(auto=false){stop();params=read();seed=Math.max(0,Math.min(999999,Math.trunc(Number($('seed').value)||0)));$('seed').value=seed;result=M.compare(net,params,seed);stats=M.ensemble(net,params,seed,20);t=0;applied=true;$('dirty').textContent='参数已应用';$('play').disabled=false;$('step').disabled=false;controls();summary();frame();if(auto)play();window.propagationDebug={net,params,result,stats,seed};}
['initial','beta','gamma','mu'].forEach(k=>$(k).addEventListener('input',()=>{controls();stop();applied=false;$('dirty').textContent='参数已更改 · 请重新模拟';$('play').disabled=true;$('step').disabled=true;}));
 $('seed').addEventListener('input',()=>{stop();applied=false;$('dirty').textContent='随机种子已更改 · 请重新模拟';$('play').disabled=true;$('step').disabled=true;});
 $('run').onclick=()=>run(true);$('play').onclick=play;$('step').onclick=()=>{stop();t++;frame();};$('timeline').oninput=()=>{stop();t=+$('timeline').value;frame();};
 $('low').onclick=()=>{$('initial').value=5;run(true);};$('high').onclick=()=>{$('initial').value=35;run(true);};$('zero').onclick=()=>{$('gamma').value=0;run(true);};
 $('new-seed').onclick=()=>{$('seed').value=seed+20;run(true);};$('reset').onclick=()=>{for(const [k,v]of Object.entries({initial:35,beta:.015,gamma:.1,mu:.12,seed:17}))$(k).value=v;run();};
 for(const v of ['single','ensemble'])$(v+'-view').onclick=()=>{view=v;for(const k of ['single','ensemble'])$(k+'-view').classList.toggle('selected',k===v);summary();drawCurve();};
 $('export').onclick=()=>{const blob=new Blob([JSON.stringify({source:'https://github.com/iaciac/simplagion',note:'Synthetic triangular lattice; discrete stochastic simulation, not empirical data',network:net,parameters:params,seed,result,ensemble:stats},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='simplagion-comparison-seed-'+seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('network-meta').textContent=`${net.n} 人 · ${net.edges.length} 条两两边 · ${net.groups.length} 条三人超边 · 两侧相同布局与初始状态`;
 initGraph('base-graph',false);initGraph('hyper-graph',true);run();
})();
