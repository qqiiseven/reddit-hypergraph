/* RSC construction from Iacopini et al. (2019): independent Bernoulli
 * edges and triples, then close every triple's three edges. Geometric
 * skipping samples the same Bernoulli ensemble without scanning O(N^3).
 * Uses the existing synchronous contagion engine; no outcomes are forced. */
(function(root){'use strict';
const M=root.PropagationModel||(typeof require==='function'?require('./propagation-model.js'):null);
function network(n=2000,seed=2026){
 const c2=x=>x*(x-1)/2,c3=x=>x*(x-1)*(x-2)/6;
 const edges=[],groups=[],seen=new Set();let r=0;const rand=()=>M.random(seed,0,r++);
 const p2=12/((n-1)*(n-2)),p1=8/(n-13);
 const search=(lo,hi,fn,value)=>{while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fn(mid)<=value)lo=mid;else hi=mid-1;}return lo;};
 const add=(a,b)=>{if(a>b)[a,b]=[b,a];const key=a*n+b;if(!seen.has(key)){seen.add(key);edges.push([a,b]);}};
 function sample(total,p,visit){let index=-1;const log=Math.log1p(-p);while(true){index+=1+Math.floor(Math.log1p(-rand())/log);if(index>=total)break;visit(index);}}
 sample(c2(n),p1,rank=>{const a=search(0,n-2,x=>c2(n)-c2(n-x),rank);add(a,a+1+rank-(c2(n)-c2(n-a)));});
 sample(c3(n),p2,rank=>{const a=search(0,n-3,x=>c3(n)-c3(n-x),rank);const remainder=rank-(c3(n)-c3(n-a));const b=search(a+1,n-2,x=>c2(n-a-1)-c2(n-x),remainder);const c=b+1+remainder-(c2(n-a-1)-c2(n-b));groups.push([a,b,c]);add(a,b);add(a,c);add(b,c);});
 return {n,nodes:Array.from({length:n},(_,id)=>({id})),edges,groups,k:2*edges.length/n,kD:3*groups.length/n,seed,p1,p2};
}
function parameters(net,initial=.35,lambda=.75){const mu=.05;return {initial,lambda,lambdaDelta:2.5,beta:lambda*mu/net.k,gamma:2.5*mu/net.kD,mu,steps:1000};}
function viewport(net,size=96){
 const incident=Array.from({length:net.n},()=>[]);net.groups.forEach((g,i)=>g.forEach(n=>incident[n].push(i)));
 const ids=[0],used=new Set(ids);for(let q=0;q<ids.length&&ids.length<size;q++){for(const gi of incident[ids[q]])for(const id of net.groups[gi])if(!used.has(id)&&ids.length<size){used.add(id);ids.push(id);}}
 for(let id=0;ids.length<size;id++)if(!used.has(id)){used.add(id);ids.push(id);}
 const nodes=ids.map((id,i)=>({id,x:35+(i%12)*42,y:32+Math.floor(i/12)*39})),lookup=new Map(nodes.map(n=>[n.id,n]));
 const edges=net.edges.filter(e=>e.every(id=>used.has(id))),groups=net.groups.map((g,i)=>({members:g,index:i})).filter(g=>g.members.every(id=>used.has(id)));
 // Local layout affects only display, never transmission or sampling.
 for(let step=0;step<400;step++){const forces=new Map(ids.map(id=>[id,{x:0,y:0}]));for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d2=Math.max(25,dx*dx+dy*dy),f=18/d2;forces.get(a.id).x+=dx*f;forces.get(a.id).y+=dy*f;forces.get(b.id).x-=dx*f;forces.get(b.id).y-=dy*f;}for(const [ai,bi]of edges){const a=lookup.get(ai),b=lookup.get(bi),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,f=(d-40)*.07;forces.get(ai).x+=dx/d*f;forces.get(ai).y+=dy/d*f;forces.get(bi).x-=dx/d*f;forces.get(bi).y-=dy/d*f;}for(const a of nodes){const f=forces.get(a.id);a.x+=Math.max(-3,Math.min(3,f.x+(270-a.x)*.008));a.y+=Math.max(-3,Math.min(3,f.y+(167-a.y)*.008));}}
 const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),scale=Math.min(490/(xmax-xmin),285/(ymax-ymin));for(const p of nodes){p.x=270+(p.x-(xmin+xmax)/2)*scale;p.y=167+(p.y-(ymin+ymax)/2)*scale;}
 return {nodes,lookup,edges,groups};
}
const api={network,parameters,viewport};root.PaperRSC=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
