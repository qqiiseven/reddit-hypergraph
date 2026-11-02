(function(root){'use strict';
const initial=()=>({nodes:['A','B','C','D','E','F'],edges:[{id:'E1',members:['A','B','C']},{id:'E2',members:['C','D','E']},{id:'E3',members:['B','E','F']}]});
const name=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=12&&!/[\u0000-\u001f\u007f]/.test(x);
function validate(input){
 if(!input||!Array.isArray(input.nodes)||!Array.isArray(input.edges))throw Error('需要 nodes 数组和 edges 数组。');
 if(input.nodes.length>16||input.edges.length>12)throw Error('上限为 16 个节点、12 条超边。');
 if(input.nodes.some(n=>!name(n))||new Set(input.nodes).size!==input.nodes.length)throw Error('节点名称须唯一，长度 1–12 字符，不能有首尾空格或控制字符。');
 if(new Set(input.edges.map(e=>e?.id)).size!==input.edges.length)throw Error('超边名称不能重复。');
 for(const e of input.edges){if(!e||!name(e.id)||!Array.isArray(e.members)||!e.members.length)throw Error('每条超边需要有效名称和非空 members 数组。');if(new Set(e.members).size!==e.members.length||e.members.some(n=>!input.nodes.includes(n)))throw Error('超边包含重复成员或未定义的节点。');}
 return {nodes:input.nodes.slice(),edges:input.edges.map(e=>({id:e.id,members:e.members.slice()}))};
}
function removeNode(data,id){return validate({nodes:data.nodes.filter(n=>n!==id),edges:data.edges.map(e=>({id:e.id,members:e.members.filter(n=>n!==id)})).filter(e=>e.members.length)});}
function toggle(data,edge,node){const out=validate(data),e=out.edges.find(e=>e.id===edge);if(!e||!out.nodes.includes(node))throw Error('节点或超边不存在。');if(e.members.includes(node)){if(e.members.length===1)throw Error('超边至少保留一个成员；可直接删除整条超边。');e.members=e.members.filter(n=>n!==node);}else e.members.push(node);return out;}
function pairs(data){const map=new Map();for(const e of data.edges)for(let i=0;i<e.members.length;i++)for(let j=i+1;j<e.members.length;j++){const p=[e.members[i],e.members[j]].sort(),key=JSON.stringify(p);if(!map.has(key))map.set(key,{members:p,edges:[]});map.get(key).edges.push(e.id);}return [...map.values()];}
function csv(data){const cell=s=>'"'+String(s).replace(/"/g,'""')+'"';return '\ufeff'+[['node',...data.edges.map(e=>e.id)],...data.nodes.map(n=>[n,...data.edges.map(e=>+e.members.includes(n))])].map(r=>r.map(cell).join(',')).join('\r\n');}
const api={initial,validate,removeNode,toggle,pairs,csv};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LabModel=api;
})(typeof window!=='undefined'?window:globalThis);
