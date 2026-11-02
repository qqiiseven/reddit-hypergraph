(function(root){'use strict';
function validate(input,k){
 if(![2,3].includes(k))throw Error('分区数只能为 2 或 3。');
 if(!input||!Array.isArray(input.nodes)||!Array.isArray(input.edges))throw Error('需要 nodes 和 edges 数组。');
 const name=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=12&&!/[\u0000-\u001f\u007f]/.test(s);
 if(input.nodes.length<4||input.nodes.length>12||input.nodes.length%k)throw Error('需要 4–12 个节点，且节点数能被分区数整除。');
 if(input.nodes.some(n=>!name(n))||new Set(input.nodes).size!==input.nodes.length)throw Error('节点名须唯一且为 1–12 字符。');
 if(input.edges.length<1||input.edges.length>24||new Set(input.edges.map(e=>e?.id)).size!==input.edges.length)throw Error('需要 1–24 条名称唯一的超边。');
 const edges=input.edges.map(e=>{if(!e||!name(e.id)||!Array.isArray(e.members)||!e.members.length||new Set(e.members).size!==e.members.length||e.members.some(n=>!input.nodes.includes(n)))throw Error('超边名称、成员或引用无效。');const weight=e.weight===undefined?1:e.weight;if(!Number.isInteger(weight)||weight<1||weight>9)throw Error('权重须为 1–9 的整数。');return {id:e.id,members:e.members.slice(),weight};});
 return {nodes:input.nodes.slice(),edges};
}
function checkAssignment(data,a,k){if(a.length!==data.nodes.length||a.some(v=>!Number.isInteger(v)||v<0||v>=k)||Array.from({length:k},(_,i)=>a.filter(v=>v===i).length).some(v=>v!==data.nodes.length/k))throw Error('每个分区必须恰好装入同样数量的节点。');return true;}
function rows(data,a){const groups=new Map(data.nodes.map((n,i)=>[n,a[i]]));return data.edges.map(e=>{const bins=[...new Set(e.members.map(n=>groups.get(n)))].sort(),counts=bins.map(b=>e.members.filter(n=>groups.get(n)===b).length),pairCount=(e.members.length**2-counts.reduce((s,n)=>s+n*n,0))/2;return {...e,bins,lambda:bins.length,cut:e.weight*Number(bins.length>1),connectivity:e.weight*(bins.length-1),pair:e.weight*pairCount};});}
function score(data,a,objective='connectivity'){if(!['connectivity','cut','pair'].includes(objective))throw Error('Unknown objective');return rows(data,a).reduce((sum,e)=>sum+e[objective],0);}
function swap(a,i,j){const out=a.slice();[out[i],out[j]]=[out[j],out[i]];return out;}
function bestSwap(data,a,objective){let best=null,current=score(data,a,objective);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(a[i]===a[j])continue;const assignment=swap(a,i,j),cost=score(data,assignment,objective);if(cost<current&&(!best||cost<best.cost))best={i,j,assignment,cost,gain:current-cost};}return best;}
function solve(data,k,objective='connectivity'){
 data=validate(data,k);const size=data.nodes.length/k,n=data.nodes.length,a=Array(n).fill(0),counts=Array(k).fill(0);let best=null,pairBest=null,examined=0;
 // Fix the first node to partition 0. Equal-capacity partition labels are interchangeable.
 a[0]=0;counts[0]=1;
 function visit(i){if(i===n){examined++;const detail=rows(data,a),cost=detail.reduce((s,e)=>s+e[objective],0),pair=detail.reduce((s,e)=>s+e.pair,0);if(!best||cost<best.cost)best={cost,assignment:a.slice()};if(!pairBest||pair<pairBest.pair||(pair===pairBest.pair&&cost<pairBest.cost))pairBest={pair,cost,assignment:a.slice()};return;}for(let b=0;b<k;b++)if(counts[b]<size){a[i]=b;counts[b]++;visit(i+1);counts[b]--;}}
 visit(1);return {best,pairBest,examined};
}
function seeded(data,k,seed){let value=seed>>>0;const random=()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};const a=data.nodes.map((_,i)=>Math.floor(i/(data.nodes.length/k)));for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const presets={
 forest:{name:'饼干露营夜',description:'糯米、兔叽、团团要一起烤饼干；栗子、呱呱、竹竹一起搭帐篷。让完整的小队住进同一间小屋，任务卡就会亮起来。',k:2,nodes:'ABCDEF'.split(''),edges:[{id:'烤星星饼干',members:['A','B','C'],weight:3},{id:'搭小帐篷',members:['D','E','F'],weight:3},{id:'交换果酱',members:['A','E'],weight:1}]},
 teamwork:{name:'协作小组',description:'三项核心任务交织着跨组协作。把任务尽量留在组内，同时每组人数保持相同。',k:3,nodes:'ABCDEFGHIJKL'.split(''),edges:[{id:'调研',members:['A','B','C','D'],weight:3},{id:'设计',members:['E','F','G','H'],weight:3},{id:'开发',members:['I','J','K','L'],weight:3},{id:'评审',members:['A','E','I'],weight:1},{id:'可视化',members:['C','G','K'],weight:1},{id:'汇报',members:['D','H','L'],weight:1}]},
 conference:{name:'高阶关系的代价',description:'同一场多人会议，在普通图中变成许多条连接。比较两种优化目标会如何改变分配。',k:3,nodes:'ABCDEFGHI'.split(''),edges:[{id:'T1',members:['A','G','F','C','E','H'],weight:1},{id:'T2',members:['F','E','H','G','C','B'],weight:2},{id:'T3',members:['H','A','I','B','F'],weight:3},{id:'T4',members:['A','B','H','F','C','I'],weight:1},{id:'T5',members:['D','A','G','B'],weight:1},{id:'T6',members:['E','G','D','C','B'],weight:2},{id:'T7',members:['E','D','C','H','I','B'],weight:3}]},
 trap:{name:'走出局部最优',description:'一次交换找不到改进，不代表已经达到全局最优。先逐步优化，再揭晓精确答案。',k:2,nodes:'ABCDEFGH'.split(''),edges:[{id:'T1',members:['F','E','D','H'],weight:2},{id:'T2',members:['H','A'],weight:3},{id:'T3',members:['B','G'],weight:3},{id:'T4',members:['H','G','F','C'],weight:3},{id:'T5',members:['D','A','H','B'],weight:1},{id:'T6',members:['G','H'],weight:2},{id:'T7',members:['E','D'],weight:3}]}
};
const api={validate,checkAssignment,rows,score,swap,bestSwap,solve,seeded,presets};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PartitionModel=api;
})(typeof window!=='undefined'?window:globalThis);
