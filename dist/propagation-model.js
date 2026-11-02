/* Browser implementation of the discrete simplicial contagion rules described in
 * Iacopini et al. (2019), https://github.com/iaciac/simplagion.
 * Independently implemented; see propagation-notes.txt for differences. */
(function(root){
  'use strict';
  function random(seed,t,channel){let a=(seed^Math.imul(t+1,0x9e3779b9)^Math.imul(channel+1,0x85ebca6b))>>>0;a=Math.imul(a^(a>>>16),0x7feb352d);a=Math.imul(a^(a>>>15),0x846ca68b);return ((a^(a>>>16))>>>0)/4294967296;}
  function network(cols=12,rows=8){
    const nodes=[],groups=[],edges=[],seen=new Set();
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)nodes.push({id:y*cols+x,x:35+x*42+(y%2)*12,y:32+y*39});
    for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const a=y*cols+x,b=a+1,c=a+cols,d=c+1;groups.push([a,b,c],[b,c,d]);}
    for(const g of groups)for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=Math.min(g[i],g[j]),b=Math.max(g[i],g[j]),k=a+':'+b;if(!seen.has(k)){seen.add(k);edges.push([a,b]);}}
    return {nodes,groups,edges,n:nodes.length,k:2*edges.length/nodes.length,kD:3*groups.length/nodes.length};
  }
  function initial(net,fraction,seed){const order=Array.from({length:net.n},(_,i)=>i).sort((a,b)=>random(seed,0,a)-random(seed,0,b));const s=Array(net.n).fill(0);order.slice(0,Math.round(net.n*fraction)).forEach(i=>s[i]=1);return s;}
  function run(net,p,group=true,seed=17){
    let state=initial(net,p.initial,seed);const frames=[{state:state.slice(),count:state.reduce((a,b)=>a+b,0),pair:0,joint:0,recovered:0,triggered:[]}];
    for(let t=0;t<p.steps;t++){
      const pair=new Set(),joint=new Set(),triggered=[];
      net.edges.forEach(([a,b],i)=>{if(state[a]!==state[b]&&random(seed,t,i)<p.beta)pair.add(state[a]?b:a);});
      if(group&&p.gamma>0)net.groups.forEach((g,i)=>{if(g.reduce((s,n)=>s+state[n],0)===2&&random(seed,t,100000+i)<p.gamma){joint.add(g.find(n=>!state[n]));triggered.push(i);}});
      const next=state.slice();let recovered=0;
      for(let i=0;i<net.n;i++){if(state[i]){if(random(seed,t,200000+i)<p.mu){next[i]=0;recovered++;}}else if(pair.has(i)||joint.has(i))next[i]=1;}
      frames.push({state:next,count:next.reduce((a,b)=>a+b,0),pair:pair.size,joint:[...joint].filter(i=>!pair.has(i)).length,recovered,triggered});state=next;
    }return frames;
  }
  function compare(net,p,seed=17){return {baseline:run(net,p,false,seed),hyper:run(net,p,true,seed)};}
  function tail(frames,n=50){return frames.slice(-n).reduce((s,f)=>s+f.count,0)/Math.min(n,frames.length);}
  function ensemble(net,p,seed=17,repeats=20){
    const runs=Array.from({length:repeats},(_,i)=>compare(net,p,seed+i));
    const summary=key=>{const paths=[];for(let t=0;t<=p.steps;t++){const xs=runs.map(r=>r[key][t].count/net.n).sort((a,b)=>a-b);paths.push({mean:xs.reduce((s,v)=>s+v,0)/repeats,lo:xs[Math.floor((repeats-1)*.1)],hi:xs[Math.ceil((repeats-1)*.9)]});}return {paths,tail:runs.reduce((s,r)=>s+tail(r[key])/net.n,0)/repeats,survived:runs.filter(r=>r[key].at(-1).count>0).length};};
    return {repeats,baseline:summary('baseline'),hyper:summary('hyper')};
  }
  const api={random,network,initial,run,compare,tail,ensemble};root.PropagationModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
