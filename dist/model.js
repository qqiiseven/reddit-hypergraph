(function (root) {
  'use strict';
  const palette = ['#4389ff', '#ff965d', '#64b85a', '#04b9c5', '#9a78ed', '#d98bba'];
  function composition() {
    return { nodes: [
      ['A',350,90],['B',460,190],['C',240,190],['D',520,300],['E',350,345],['F',180,300],['G',180,100],['H',590,190]
    ].map(([id,x,y])=>({id,x,y})), edges: [
      {id:'E1',members:['A','B','C','G'],color:palette[0]},
      {id:'E2',members:['B','D','E','H'],color:palette[1]},
      {id:'E3',members:['C','E','F'],color:palette[2]}
    ] };
  }
  function events(include=true) {
    return {nodes:[['A',250,215],['B',370,90],['C',490,215],['D',155,70],['E',110,200],['F',585,70],['G',630,200],['H',265,365],['I',475,365]].map(([id,x,y])=>({id,x,y})),edges:[
      {id:'E1',members:['A','B','D','E'],color:palette[0]},
      {id:'E2',members:['B','C','F','G'],color:palette[1]},
      {id:'E3',members:['A','C','H','I'],color:palette[2]},
      ...(include?[{id:'E4',members:['A','B','C'],color:palette[3]}]:[])
    ]};
  }
  function project(edges) {
    const pairs=new Set();
    for(const e of edges) for(let i=0;i<e.members.length;i++) for(let j=i+1;j<e.members.length;j++) pairs.add([e.members[i],e.members[j]].sort().join('|'));
    return [...pairs].sort().map(s=>s.split('|'));
  }
  function incidence(nodes,edges){return nodes.map(n=>edges.map(e=>Number(e.members.includes(n.id))));}
  function hull(points){
    const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    if(p.length<3)return p;
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lower=[],upper=[];
    for(const q of p){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q);}
    for(const q of p.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q);}
    lower.pop();upper.pop();return lower.concat(upper);
  }
  function outline(nodes,members,r=40){
    const pts=[];
    for(const n of nodes.filter(n=>members.includes(n.id)))for(let i=0;i<32;i++){const a=i*Math.PI/16;pts.push([n.x+Math.cos(a)*r,n.y+Math.sin(a)*r]);}
    return hull(pts);
  }
  function contains(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function supportProbability(beta,gamma,supporters,enabled=true){
    if(beta<0||beta>1||gamma<0||gamma>1||![0,1,2].includes(supporters))throw Error('Invalid probability inputs');
    return 1-Math.pow(1-beta,supporters)*(enabled&&supporters===2?1-gamma:1);
  }
  function influenceProbability(a,b,gamma,bSupports=true,enabled=true){
    if([a,b,gamma].some(p=>!Number.isFinite(p)||p<0||p>1))throw Error('Invalid probability inputs');
    return 1-(1-a)*(bSupports?1-b:1)*(enabled&&bSupports?1-gamma:1);
  }
  function directed(){return {
    nodes:[['A',100,80],['B',100,190],['C',100,315],['D',340,125],['E',340,250],['F',565,125],['G',565,250],['H',660,365]].map(([id,x,y])=>({id,x,y})),
    edges:[{id:'D1',tail:['A','B','C'],head:['D','E'],color:'#9277d5'},{id:'D2',tail:['D','E'],head:['F','G'],color:'#26a5b6'},{id:'D3',tail:['C','G'],head:['H'],color:'#db9a56'}]
  };}
  function projectionLayout(){return {A:[100,150],B:[220,47],C:[340,150],D:[46,25],E:[112,75],F:[394,25],G:[328,75],H:[220,265],I:[220,193]};}
  function partitionExample(){
    const edges=[{id:'P1',members:['A','B','C'],color:'#9a78ed'},{id:'P2',members:['D','E','F'],color:'#04b9c5'}];
    const before={A:0,D:0,E:0,B:1,C:1,F:1},after={A:0,B:0,C:0,D:1,E:1,F:1};
    const cost=assignment=>edges.filter(e=>new Set(e.members.map(n=>assignment[n])).size>1).length;
    return {edges,before,after,beforeCost:cost(before),afterCost:cost(after)};
  }
  // A small damped spring system. Rest lengths are captured at drag start;
  // topology never changes. Nearby members respond to a drag and settle on release.
  class SpringLayout {
    constructor(data){
      this.nodes=data.nodes;this.edges=data.edges;this.pinned=null;this.age=0;
      this.anchors=new Map(this.nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
      this.velocity=new Map(this.nodes.map(n=>[n.id,{x:0,y:0}]));
      this.links=project(this.edges).map(([a,b])=>{const x=this.nodes.find(n=>n.id===a),y=this.nodes.find(n=>n.id===b);return {a:x,b:y,rest:Math.hypot(x.x-y.x,x.y-y.y)};});
      this.radii=new Map(this.edges.map(e=>[e.id,{value:0,v:0}]));
    }
    pin(id,x,y){this.pinned=id;this.target={x,y};this.age=0;}
    move(x,y){this.target={x,y};this.age=0;}
    release(){if(this.pinned){const n=this.nodes.find(n=>n.id===this.pinned);this.anchors.set(n.id,{x:n.x,y:n.y});this.pinned=null;}this.age=0;}
    step(dt=1){
      dt=Math.min(1.5,Math.max(.25,dt));this.age+=dt;
      const force=new Map(this.nodes.map(n=>{const a=this.anchors.get(n.id);return [n.id,{x:(a.x-n.x)*.027,y:(a.y-n.y)*.027}];}));
      for(const l of this.links){const dx=l.b.x-l.a.x,dy=l.b.y-l.a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-l.rest)*.018;const a=force.get(l.a.id),b=force.get(l.b.id);a.x+=dx/d*f;a.y+=dy/d*f;b.x-=dx/d*f;b.y-=dy/d*f;}
      for(let i=0;i<this.nodes.length;i++)for(let j=i+1;j<this.nodes.length;j++){const a=this.nodes[i],b=this.nodes[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.1,Math.hypot(dx,dy));if(d<66){const f=(66-d)*.24,ux=d<1?1:dx/d,uy=d<1?0:dy/d;force.get(a.id).x-=ux*f;force.get(a.id).y-=uy*f;force.get(b.id).x+=ux*f;force.get(b.id).y+=uy*f;}}
      let motion=0;
      for(const n of this.nodes){const v=this.velocity.get(n.id);if(n.id===this.pinned){const x=Math.max(50,Math.min(690,this.target.x)),y=Math.max(55,Math.min(385,this.target.y));v.x=(x-n.x)/dt;v.y=(y-n.y)/dt;n.x=x;n.y=y;}else{const f=force.get(n.id);v.x=(v.x+f.x*dt)*Math.pow(.82,dt);v.y=(v.y+f.y*dt)*Math.pow(.82,dt);n.x=Math.max(50,Math.min(690,n.x+v.x*dt));n.y=Math.max(55,Math.min(385,n.y+v.y*dt));}motion+=Math.abs(v.x)+Math.abs(v.y);}
      for(const e of this.edges){const r=this.radii.get(e.id),speed=e.members.reduce((s,id)=>{const v=this.velocity.get(id);return s+Math.hypot(v.x,v.y);},0),target=this.pinned?Math.min(11,speed*.32):0;r.v=(r.v+(target-r.value)*.18*dt)*Math.pow(.76,dt);r.value=Math.max(-8,Math.min(15,r.value+r.v*dt));motion+=Math.abs(r.v);}
      return Boolean(this.pinned)||this.age<12||(motion>.05&&this.age<300);
    }
  }
  const api={palette,composition,events,directed,projectionLayout,partitionExample,project,incidence,hull,outline,contains,supportProbability,influenceProbability,SpringLayout};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HyperModel=api;
})(typeof window!=='undefined'?window:globalThis);
