(function(root){
  'use strict';
  function validate(d,names){
    const fail=(path,message)=>{throw Error(path+'：'+message);};
    const keys=(obj,expected)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).sort().join(',')===expected.slice().sort().join(',');
    if(!keys(d,['schema_version','period_days','users']))fail('数据','需要且只允许 schema_version、period_days、users 三个字段');
    if(d.schema_version!==1)fail('schema_version','请填写数字 1');
    if(d.period_days!==28)fail('period_days','请填写数字 28，每期四周');
    if(!Array.isArray(d.users)||!d.users.length||d.users.length>100)fail('users','需要 1–100 位用户');
    const ids=new Set();let periods;
    d.users.forEach((u,i)=>{
      const path='users['+i+']';
      if(!keys(u,['id','history']))fail(path,'每位用户需要且只允许 id、history 字段');
      if(typeof u.id!=='string'||!(/^[A-Za-z0-9_\-\u4e00-\u9fff]{1,40}$/).test(u.id))fail(path+'.id','使用 1–40 个汉字、字母、数字、下划线或短横线');
      if(ids.has(u.id))fail(path+'.id','用户 ID 不能重复');ids.add(u.id);
      if(!Array.isArray(u.history)||!u.history.length||u.history.length>11)fail(path+'.history','需要 1–11 期历史，按从早到晚排列');
      periods??=u.history.length;
      if(u.history.length!==periods)fail(path+'.history','所有用户必须有相同期数；无活动期请填空社区和 0 度数');
      u.history.forEach((r,t)=>{
        const at=path+'.history['+t+']';
        if(!keys(r,['communities','reply_degree']))fail(at,'每期需要且只允许 communities、reply_degree 字段');
        if(!Array.isArray(r.communities)||r.communities.length>names.length||r.communities.some(c=>typeof c!=='string'))fail(at+'.communities','需要社区名称数组');
        if(new Set(r.communities).size!==r.communities.length)fail(at+'.communities','同一期内社区不能重复');
        for(const c of r.communities)if(!names.includes(c))fail(at+'.communities','不支持“'+c+'”；请从社区列表选择，大小写须一致');
        if(!Number.isInteger(r.reply_degree)||r.reply_degree<0||r.reply_degree>100000)fail(at+'.reply_degree','需要 0–100000 的整数，不能省略');
        if(!r.communities.length&&r.reply_degree)fail(at+'.reply_degree','无社区记录时，回复度数必须为 0');
      });
    });
    return d;
  }
  function summary(d){return {users:d.users.length,periods:d.users[0].history.length,communities:new Set(d.users.flatMap(u=>u.history.flatMap(r=>r.communities))).size,memberships:d.users.reduce((n,u)=>n+u.history.reduce((s,r)=>s+r.communities.length,0),0)};}
  const api={validate,summary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RedditCustomModel=api;
})(typeof window!=='undefined'?window:globalThis);
