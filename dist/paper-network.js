(()=>{'use strict';
const M=window.PropagationModel,R=window.PaperRSC,net=R.network(),view=R.viewport(net),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let params=R.parameters(net);const worker=new Worker('paper-rsc-worker.js');let busy=true;
let seed=17,initial=.35,result,t=0,from=0,timer=null;
const cache=new Map();let wanted=null,inFlight=null;const keyOf=p=>[p.seed,p.lambda,p.initial].join(':');
function debug(){window.networkPlayerDebug={net,view,params:{...params},seed,result,t,from,busy,cached:[...cache.keys()]};}
const refs={};
function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function initGraph(key){
const svg=$('network-map-'+key),circles=[],halos=[],groups=[];
if(key==='hyper')view.groups.forEach(({members:g,index:i})=>{const p=el('polygon',{points:g.map(n=>view.lookup.get(n).x+','+view.lookup.get(n).y).join(' '),class:'network-group'});p.append(el('title',{},'超边 E'+(i+1)+'：'+g.map(n=>'U'+(n+1)).join('、')));svg.append(p);groups.push(p);});
view.edges.forEach(([a,b])=>svg.append(el('line',{x1:view.lookup.get(a).x,y1:view.lookup.get(a).y,x2:view.lookup.get(b).x,y2:view.lookup.get(b).y,stroke:'#bed0e0','stroke-width':.8,opacity:.65})));
view.nodes.forEach(n=>{const halo=el('circle',{cx:n.x,cy:n.y,r:10,fill:'none','stroke-width':2,opacity:0});svg.append(halo);halos.push(halo);const c=el('circle',{cx:n.x,cy:n.y,r:5.8,class:'network-person'});c.append(el('title',{},'U'+(n.id+1)));svg.append(c);circles.push(c);});
refs[key]={circles,halos,groups};}
function graph(mode){const {circles,halos,groups}=refs[mode];const f=result[mode][t],prev=result[mode][from],events=result[mode].slice(from+1,t+1),tr=new Set(events.flatMap(f=>f.triggered));
 groups.forEach((g,i)=>{g.setAttribute('class','network-group'+(mode==='baseline'?' absent':tr.has(view.groups[i].index)?' fired':''));});
 circles.forEach((c,j)=>{const i=view.nodes[j].id;const born=t>0&&!prev.state[i]&&f.state[i],left=t>0&&prev.state[i]&&!f.state[i];c.setAttribute('class','network-person'+(f.state[i]?' active':'')+(born?' born':''));c.firstChild.textContent='U'+(i+1)+' · '+(f.state[i]?'正在参与':'未参与')+(born?' · 较上一帧加入':left?' · 较上一帧退出':'');halos[j].setAttribute('opacity',born||left?1:0);halos[j].setAttribute('stroke',born?'#00a69b':'#df966b');});
 $('network-population-'+mode).textContent='窗口 '+view.nodes.reduce((sum,n)=>sum+f.state[n.id],0)+'/96 · 全网 '+f.count+'/'+net.n;
 $('network-time').value=t;$('network-time-label').textContent='t = '+t;
 $('network-balance-'+mode).textContent='当前参与 '+f.count.toLocaleString('en-US')+' / '+net.n.toLocaleString('en-US')+' 人 · '+(100*f.count/net.n).toFixed(1)+'%';
 const change=f.count-prev.count;let note=$('network-change-'+mode);if(!note){note=document.createElement('small');note.id='network-change-'+mode;$('network-balance-'+mode).after(note);}note.textContent=t===0?'初始状态':'本段净'+(change>=0?'增加 ':'减少 ')+Math.abs(change)+' 人（'+prev.count+' → '+f.count+'）';

}
function chart(mode){const s=$('network-curve-'+mode);s.replaceChildren();const x=v=>45+v/params.steps*490,y=v=>185-v/net.n*139;
 [0,net.n/4,net.n/2,net.n*3/4,net.n].forEach(n=>s.append(el('line',{x1:45,x2:535,y1:y(n),y2:y(n),stroke:'#e7eef5'}),el('text',{x:37,y:y(n)+4,'text-anchor':'end','font-size':11,fill:'#8095ac'},Math.round(n/net.n*100)+'%')));
 [0,200,400,600,800,1000].forEach(n=>s.append(el('text',{x:x(n),y:207,'text-anchor':'middle','font-size':11,fill:'#8095ac'},n)));
 s.append(el('text',{x:45,y:24,'font-size':12,fill:'#6a839e'},'全网正在参与的人 / '+net.n),el('text',{x:535,y:229,'font-size':11,fill:'#6a839e','text-anchor':'end'},'模拟时间步'));
 for(const key of [mode]){const color=key==='hyper'?'#009b9a':'#6d92c6';s.append(el('path',{d:result[key].map((f,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(f.count).toFixed(2)).join(' '),fill:'none',stroke:color,'stroke-width':key===mode?2.5:1.6,opacity:key===mode?1:.5}));s.append(el('circle',{cx:x(t),cy:y(result[key][t].count),r:key===mode?5:3,fill:color,stroke:'white','stroke-width':1.5}));}
 s.append(el('line',{x1:x(t),x2:x(t),y1:36,y2:185,stroke:'#6986a1','stroke-dasharray':'3 4',class:'time-cursor'}));
 const label=(100*result[mode][t].count/net.n).toFixed(1)+'%';s.append(el('rect',{x:Math.min(470,Math.max(46,x(t)-27)),y:27,width:62,height:21,rx:5,fill:mode==='hyper'?'#e3f6f3':'#e9f1fb'}),el('text',{x:Math.min(501,Math.max(77,x(t)+4)),y:42,'text-anchor':'middle','font-size':12,fill:'#275b6b'},label));
}
function frame(){for(const mode of ['baseline','hyper']){graph(mode);chart(mode);}$('network-explanation').textContent=t===0?'网络显示同一局部视窗，曲线统计全网 2,000 人；窗口内节点也与窗口外节点相连。':'t='+from+' → '+t+'：净变化对比这一段的起点与终点；超边高亮汇总本段触发，节点显示当前状态。';debug();}
function stop(){clearInterval(timer);timer=null;$('network-play').textContent='▶ 播放变化';}
function play(){if(busy)return;if(timer){stop();return;}if(t===params.steps){t=0;from=0;}$('network-play').textContent='Ⅱ 暂停';frame();timer=setInterval(()=>{from=t;t=Math.min(params.steps,t+Number($('network-speed').value));if(t>=params.steps)stop();frame();},120);}
function setBusy(value){busy=value;for(const id of ['network-play','network-step','network-end','network-reset','network-time'])$(id).disabled=value;$('network-player').setAttribute('aria-busy',value);debug();}
function applyResult(data){result=data;t=0;from=0;setBusy(false);$('network-seed-label').textContent='随机种子：'+seed+'；网络种子：'+net.seed+'。全网平均两两度 '+net.k.toFixed(2)+'，平均三人群体度 '+net.kD.toFixed(2)+'。个人通道 β='+params.beta.toFixed(5)+'，群体通道 β△='+params.gamma.toFixed(5)+'，退出概率 μ=0.05。';$('network-parameter-note').textContent=params.lambda===.75?'λ=0.75，λ△=2.5，与论文图 3b 相同；20% 是强群体平均场分界，不适用于两两模型。':'λ=1.50，λ△=2.5：两两传播已超过理论阈值 1；下方论文图 3b 固定为 λ=0.75。';frame();}
function schedule(){if(inFlight)return;let task;if(wanted&&!cache.has(keyOf(wanted)))task=wanted;else for(const lambda of [.75,1.5])for(const value of [.35,.1,.8]){const p={seed,lambda,initial:value};if(!task&&!cache.has(keyOf(p)))task=p;}if(!task)return;inFlight=keyOf(task);worker.postMessage({id:inFlight,...task});}
function run(){stop();params=R.parameters(net,initial,+$('network-lambda').value);wanted={seed,initial,lambda:params.lambda};document.querySelectorAll('[data-initial]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.initial===initial));const data=cache.get(keyOf(wanted));if(data)applyResult(data);else{setBusy(true);$('network-explanation').textContent='正在准备所选情景…';}schedule();}
worker.onmessage=({data})=>{inFlight=null;if(data.error){if(data.id===keyOf(wanted))$('network-explanation').textContent='计算失败：'+data.error;return;}cache.set(data.id,data.result);while(cache.size>12)cache.delete(cache.keys().next().value);if(data.id===keyOf(wanted))applyResult(data.result);else debug();schedule();};
worker.onerror=()=>{$('network-explanation').textContent='计算未完成，请刷新页面重试。';};
function seek(next){stop();const target=Math.max(0,Math.min(params.steps,next));from=target>t?t:Math.max(0,target-1);t=target;frame();}
$('network-play').onclick=play;$('network-step').onclick=()=>seek(t+Number($('network-speed').value));$('network-end').onclick=()=>seek(params.steps);$('network-reset').onclick=()=>{stop();t=0;from=0;frame();};$('network-time').oninput=()=>seek(+$('network-time').value);document.querySelectorAll('[data-initial]').forEach(b=>b.onclick=()=>{initial=+b.dataset.initial;run();});$('network-lambda').onchange=run;$('network-seed').onclick=()=>{seed++;run();};$('network-speed').onchange=()=>{$('network-step').textContent='前进 '+$('network-speed').value+' 步';};
for(const mode of ['baseline','hyper'])$('network-curve-'+mode).onclick=e=>{if(busy)return;const matrix=$('network-curve-'+mode).getScreenCTM();if(!matrix)return;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());seek(Math.round((pt.x-45)/490*params.steps));};
document.addEventListener('applicationchange',e=>{if(e.detail!=='propagation')stop();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});initGraph('baseline');initGraph('hyper');run();
})();
