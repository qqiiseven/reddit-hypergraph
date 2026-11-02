(function(root){
  'use strict';
  const methods={hgnnp:'HGNN+ · 群体 + 个人',mlp:'MLP · 只看个人',overlap:'社区重叠基线',popular:'热门社区基线'};
  function history(d,u,t){return [...new Set(d.memberships.slice(0,t+1).flatMap(p=>p[u]))].sort((a,b)=>a-b);}
  function validate(d,p){
    const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
    if(!p||!same(p.userIds,d.userIds)||!same(p.communities,d.communities))throw Error('预测结果与社区数据的用户或社区顺序不一致。');
    if(!p.provenance?.network_source_sha256||p.provenance.network_source_sha256!==d.provenance?.source_sha256)throw Error('预测结果与社区数据不是同一份导出。');
    if(!p.periods||!Object.keys(p.periods).length||!p.metrics?.summary||!p.metrics?.config)throw Error('缺少预测窗口或评估指标。');
    for(const [key,r] of Object.entries(p.periods)){
      const t=Number(key);
      if(!Number.isInteger(t)||t<0||t>=d.periods.length-1||!Array.isArray(r.truth)||r.truth.length!==d.userIds.length)throw Error('预测窗口或用户数量无效。');
      for(const method of Object.keys(methods))if(!Array.isArray(r.rankings?.[method])||r.rankings[method].length!==d.userIds.length)throw Error('预测方法的用户数量不匹配。');
      for(let u=0;u<d.userIds.length;u++){
        const seen=new Set(history(d,u,t)),truth=d.memberships[t+1][u].filter(c=>!seen.has(c)).sort((a,b)=>a-b);
        if(!same(r.truth[u],truth))throw Error('真实下一期记录与预测文件不一致。');
        for(const method of Object.keys(methods)){
          const rows=r.rankings[method][u];
          if(!Array.isArray(rows)||rows.length>5||new Set(rows.map(r=>r?.[0])).size!==rows.length||rows.some(r=>!Array.isArray(r)||r.length!==2||!Number.isInteger(r[0])||r[0]<0||r[0]>=d.communities.length||seen.has(r[0])||!Number.isFinite(r[1])))throw Error('推荐列表包含无效分数、重复社区或历史社区。');
          if(!seen.size&&rows.length)throw Error('无历史用户不应有推荐结果。');
        }
      }
    }
    for(const method of Object.keys(methods)){
      const r=p.metrics.summary[method];
      if(!r||!Number.isInteger(r.user_periods)||r.user_periods<0||['recall5','hit5','ndcg5'].some(k=>!Number.isFinite(r[k])||r[k]<0||r[k]>1))throw Error('测试集指标无效。');
    }
    return p;
  }
  function record(d,p,u,t,method){
    if(!Number.isInteger(u)||u<0||u>=d.userIds.length||!p.periods[t]||!methods[method])throw Error('用户、窗口或模型无效。');
    const seen=history(d,u,t),r=p.periods[t],rankings=r.rankings[method][u],truth=r.truth[u];
    return {seen,rankings,truth,actual:d.memberships[t+1][u],hits:rankings.filter(([c])=>truth.includes(c)).length,known:seen.length>0,eligible:seen.length>0&&truth.length>0};
  }
  function candidates(d,p,t,method,filter){
    if(!['all','new','hit','miss'].includes(filter))throw Error('未知筛选条件。');
    return d.userIds.map((_,u)=>u).filter(u=>{if(filter==='all')return true;const r=record(d,p,u,t,method);return filter==='new'?r.truth.length>0:filter==='hit'?r.hits>0:r.eligible&&r.hits===0;});
  }
  function initialUser(d,t){const u=d.userIds.findIndex((_,u)=>{const n=history(d,u,t).length;return n>=3&&n<=10;});return u<0?0:u;}
  const api={methods,history,validate,record,candidates,initialUser};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RedditForecastModel=api;
})(typeof window!=='undefined'?window:globalThis);
