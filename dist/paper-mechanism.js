(()=>{'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const contact='group';let active={A:true,B:true};
const beta=.1,betaGroup=.3;
const chance=(n,joint)=>1-(1-beta)**n*(joint?1-betaGroup:1);
const pct=p=>(100*p).toFixed(1)+'%';
function node(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function diagram(id,withGroup){
 const svg=$(id);svg.replaceChildren();const joint=withGroup&&contact==='group',firing=joint&&active.A&&active.B;
 svg.append(node('title',{},joint?'三人共同群体；A、B 均参与时存在额外通道':'相同的三条两两连接'));
 if(joint)svg.append(node('path',{d:'M 46 50 Q 164 6 284 50 Q 323 86 261 164 Q 166 263 77 164 Q 11 85 46 50 Z',fill:firing?'#c7efea':'#edf8f7',stroke:'#39b3ad','stroke-width':1.5}));
 const pts={A:[72,65],B:[258,65],C:[165,183]};
 for(const[a,b]of [['A','B'],['A','C'],['B','C']]){const on=b==='C'&&active[a];svg.append(node('line',{x1:pts[a][0],y1:pts[a][1],x2:pts[b][0],y2:pts[b][1],stroke:on?'#6898d4':'#cbd8e5','stroke-width':on?2.5:1.5}));if(on)svg.append(node('circle',{cx:(pts[a][0]+pts[b][0])/2,cy:(pts[a][1]+pts[b][1])/2,r:4,fill:'#548cdb'}));}
 if(joint){svg.append(node('rect',{x:107,y:100,width:116,height:28,rx:14,fill:firing?'#087f84':'white',stroke:'#52b8b3'}),node('text',{x:165,y:119,'text-anchor':'middle',fill:firing?'white':'#328c8c','font-size':12},firing?'共同通道已触发':'共同通道待触发'));
 if(firing)svg.append(node('path',{d:'M165 131 L165 152 M160 147 L165 153 L170 147',fill:'none',stroke:'#087f84','stroke-width':2}));}
 for(const[k,[x,y]]of Object.entries(pts)){const on=k!=='C'&&active[k];svg.append(node('circle',{cx:x,cy:y,r:22,fill:on?'#548cdb':'white',stroke:on?'#548cdb':'#91a8bf','stroke-width':2}),node('text',{x,y:y+6,'text-anchor':'middle','font-size':19,'font-weight':600,fill:on?'white':'#36516c'},k));if(k==='C')svg.append(node('text',{x,y:224,'text-anchor':'middle','font-size':11,fill:'#6f859b'},'尚未参与 · 不自动变色'));}
}
function render(){
 const n=Number(active.A)+Number(active.B),joint=contact==='group'&&n===2;
 diagram('pair-mechanism',false);diagram('group-mechanism',true);
 $('pair-chance').textContent=pct(chance(n,false));$('group-chance').textContent=pct(chance(n,joint));
 $('pair-caption').textContent=n===2?'两个个人传播通道，彼此独立。':n===1?'只有一个个人传播通道。':'没有活跃邻居，暂无传播通道。';
 $('group-caption').textContent=contact!=='group'?'没有共同群体，结果与两两模型相同。':joint?'A、B 同属这条超边且均已参与，额外通道生效。':'超边仍在；A、B 尚未同时参与，额外通道未生效。';
 const rows=[['都未参与',false,false],['仅 A',true,false],['仅 B',false,true],['A 和 B',true,true]];
 $('response-rows').replaceChildren();
 for(const[label,a,b]of rows){const row=document.createElement('button');row.className='response-row';row.setAttribute('role','row');row.setAttribute('aria-label','查看'+label);row.setAttribute('aria-current',a===active.A&&b===active.B?'true':'false');const count=+a+(+b);for(const [i,value]of [label,pct(chance(count,false)),pct(chance(count,contact==='group'&&a&&b))].entries()){const cell=document.createElement('span');cell.setAttribute('role','cell');cell.textContent=value;if(i===2&&a&&b&&contact==='group')cell.className='joint-value';row.append(cell);}row.onclick=()=>{active={A:a,B:b};render();};$('response-rows').append(row);}
 $('weight-explanation').innerHTML=contact==='group'?'<strong>单人时都为 10%，两人时却是 43.3%。</strong>若把两条普通边都加重至约 24.7%，虽能凑出 43.3%，单人结果却也变成 24.7%，不再是 10%。':'<strong>去掉共同群体，四种状态全部一致。</strong>两两连接和活跃人数都没变；改变的是是否保留三个人共同作用的通道。';
 $('mechanism-takeaway').textContent=contact==='group'?'超边的作用：把“这几个人一起产生的影响”作为独立机制保留下来。':'普通图中的三角形一样；只有保留共同群体，才能区分这两种接触结构。';
 document.querySelectorAll('[data-person]').forEach(b=>{const k=b.dataset.person;b.setAttribute('aria-pressed',active[k]);b.textContent=k+(active[k]?' 已参与':' 未参与');});
}
document.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{const k=b.dataset.person;active[k]=!active[k];render();});
$('see-evidence').onclick=()=>{for(const k of ['baseline','weak','strong']){const b=document.querySelector('[data-series="'+k+'"]');if(b.getAttribute('aria-pressed')!=='true')b.click();}$('lambda').value=8;$('lambda').dispatchEvent(new Event('input'));$('paper-evidence').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
render();
})();
