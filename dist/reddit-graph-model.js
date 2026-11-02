/* Layout is independent of the recorded Reddit memberships and predictions. */
(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.HyperModel;
  function create(c){
    const three={1:[135,150],2:[605,150],3:[370,95],4:[335,365],5:[245,275],6:[495,275],7:[370,285]};
    const four={1:[186,125],2:[558,116],3:[375,374],4:[195,395],5:[255,260],6:[462,134],7:[306,323],8:[552,395],9:[282,140],10:[492,260],11:[438,320],12:[375,140],13:[306,200],14:[435,200]};
    const positions=c.groups.length===4?four:three;
    const nodes=c.peers.map(p=>({id:p.label,x:positions[p.mask][0],y:positions[p.mask][1],r:15}));
    nodes.push({id:'target',x:370,y:c.groups.length===4?260:210,r:23});
    const edges=c.groups.map((g,i)=>({id:'E'+(i+1),members:[...c.peers.filter(p=>p.communities.includes(g.community)).map(p=>p.label),...(c.current.includes(g.community)?['target']:[])]}));
    return {nodes,edges,width:740,height:c.groups.length===4?560:440};
  }
  function move(data,id,x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    const node=data.nodes.find(n=>n.id===id);if(!node)return false;
    x=Math.max(48,Math.min(data.width-48,x));y=Math.max(55,Math.min(data.height-48,y));
    if(data.nodes.some(n=>n!==node&&Math.hypot(n.x-x,n.y-y)<n.r+node.r+18))return false;
    node.x=x;node.y=y;return true;
  }
  function outline(data,edge){return M.outline(data.nodes,edge.members,38);}
  const api={create,move,outline};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RedditGraphModel=api;
})(typeof window!=='undefined'?window:globalThis);
