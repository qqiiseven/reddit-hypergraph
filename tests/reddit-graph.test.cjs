const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const G=require('../dist/reddit-graph-model.js'),M=require('../dist/model.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/reddit-data.js'),'utf8'),context);
const cases=JSON.parse(JSON.stringify(context.window.RedditDemoData.cases));

test('Reddit hulls preserve the actual community memberships for every case',()=>{
  for(const c of cases){
    const before=JSON.stringify(c),data=G.create(c);
    assert.equal(data.nodes.length,c.peers.length+1);
    data.edges.forEach((edge,i)=>{
      const actual=c.peers.filter(p=>p.communities.includes(c.groups[i].community)).map(p=>p.label).concat('target');
      assert.equal(JSON.stringify(edge.members),JSON.stringify(actual));
      const hull=G.outline(data,edge);
      for(const n of data.nodes.filter(n=>edge.members.includes(n.id)))for(let k=0;k<32;k++)assert.ok(M.contains(hull,n.x+n.r*Math.cos(k*Math.PI/16),n.y+n.r*Math.sin(k*Math.PI/16)));
    });
    assert.equal(JSON.stringify(c),before);
  }
});

test('dragging reshapes incident hulls without changing recorded relations or predictions',()=>{
  for(const c of cases){
    const before=JSON.stringify(c),data=G.create(c),initial=JSON.parse(JSON.stringify(data)),relations=JSON.stringify(data.edges),n=data.nodes[0];
    const edge=data.edges.find(e=>e.members.includes(n.id)),oldHull=JSON.stringify(G.outline(data,edge));
    assert.ok(G.move(data,n.id,60,data.height-60));
    assert.notEqual(JSON.stringify(G.outline(data,edge)),oldHull);
    assert.equal(JSON.stringify(data.edges),relations);
    assert.equal(JSON.stringify(c),before);
    assert.deepEqual(G.create(c),initial);
  }
});

test('drag bounds, node collisions and invalid coordinates cannot corrupt layout',()=>{
  const data=G.create(cases[0]),node=data.nodes[0],other=data.nodes[1];
  const start={...node};assert.equal(G.move(data,node.id,other.x,other.y),false);assert.deepEqual(node,start);
  assert.equal(G.move(data,node.id,NaN,100),false);assert.equal(G.move(data,'unknown',100,100),false);
  assert.ok(G.move(data,node.id,-10000,10000));assert.equal(node.x,48);assert.equal(node.y,data.height-48);
  assert.ok(G.move(data,'target',data.width-48,data.height-48));
});
