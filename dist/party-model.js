(function(root){'use strict';
function world(together=false){return {nodes:'ABCDEF'.split(''),edges:[{id:'莓果野餐',members:['A','B','D']},{id:'森林音乐会',members:['B','C','E']},{id:'夜晚观星',members:['A','C','F']},...(together?[{id:'三人同游',members:['A','B','C']}]:[])]};}
function project(data){const set=new Set();for(const e of data.edges)for(let i=0;i<e.members.length;i++)for(let j=i+1;j<e.members.length;j++)set.add(JSON.stringify([e.members[i],e.members[j]].sort()));return [...set].sort();}
function inspect(data,team){if(team.length!==3||new Set(team).size!==3||team.some(n=>!data.nodes.includes(n)))throw Error('请选择三位不同的伙伴。');const links=new Set(project(data)),pairs=[];for(let i=0;i<team.length;i++)for(let j=i+1;j<team.length;j++)pairs.push({members:[team[i],team[j]],linked:links.has(JSON.stringify([team[i],team[j]].sort()))});const evidence=data.edges.filter(e=>team.every(n=>e.members.includes(n)));return {allPairs:pairs.every(p=>p.linked),pairs,together:evidence.length>0,evidence};}
const api={world,project,inspect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PartyModel=api;
})(typeof window!=='undefined'?window:globalThis);
