/*!
 * Contains hypergraph-plotter by Phileas Dazeley-Gaist, MIT License.
 * Copyright (c) Phileas Dazeley-Gaist
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// Visual adapter only: it never writes source memberships or model predictions.
import { HypergraphPlotter } from './vendor/hypergraph-plotter/hypergraph-plotter.js';

function mount(container, { users, communities, period, onUser, onSettings, settings }) {
  const host = container.querySelector('.blob-canvas');
  const hint = container.querySelector('.graph-focus');
  const width = host.clientWidth || 760;
  const height = host.clientHeight || 460;
  const plot = new HypergraphPlotter(host, {
    width, height, physicsPlaying: false, layoutType: settings.layout,
    plotTheme: 'name-labeled', vertexSize: .13, labelFontSize: 10,
    vertexOutlineWidth: 1.2, nodeFillType: 'custom', nodeFillCustom: '#ffffff',
    showSubsetBoundary: settings.boundaries, boundaryScale: 2.1,
    blobOpacity: .11, blobOutlineWidth: 1.5,
    // The library's hub curves are a hyperedge representation, not reply edges.
    showSubsetEdge: settings.connections, edgeWidth: 1,
    showHyperedgeLabels: true, showHubs: false,
    allowPan: true, allowZoom: true, allowDrag: true,
    pinOnDrag: true, hidePinDashes: true, canvasBg: 'white',
    kAttract: .08, kRepel: 7500, kHyperedgeRepel: 14000,
    kCenter: .003, damping: .85, maxSpeed: 8,
  });
  plot.stopSimulation();
  const userById = new Map(users.map(u => [String(u.u), u]));
  const groupById = new Map(communities.map(c => [String(c.c), c]));
  let focusEdge = null, pinnedEdge = null, focusUser = null, suppressClick = false;
  const defaultHint = '悬停用户或社区标签查看真实归属；点击用户进入参与轨迹。';
  const draw = plot.draw.bind(plot);
  function decorate() {
    const active = focusEdge !== null ? groupById.get(String(focusEdge)) : null;
    plot.verticesLayer.querySelectorAll('.vertex').forEach(el => {
      const user = userById.get(el.dataset.id);
      if (!user) return;
      el.dataset.user = String(user.u);
      el.dataset.plotterNode = 'true';
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${user.label}，${user.cs.length} 个画面社区，查看轨迹`);
      el.querySelector('title').textContent = `${user.label}\n${user.cs.map(c=>groupById.get(String(c))?.name).join('、')}`;
      el.style.opacity = active && !user.cs.includes(active.c) ? '.12' : '1';
      const circle = el.querySelector('circle, rect');
      circle.setAttribute('stroke', focusUser === user.u ? '#162e29' : active?.color || '#536860');
      circle.setAttribute('stroke-width', focusUser === user.u ? '3' : '1.2');
    });
    [...plot.labelsLayer.children].forEach((el,i)=>{
      el.style.opacity=active && !users[i].cs.includes(active.c)?'.12':'1';
    });
    plot.blobsLayer.querySelectorAll('path').forEach(el=>{
      const id=+el.dataset.id;
      const belongs=focusUser!==null && userById.get(String(focusUser)).cs.includes(id);
      el.setAttribute('fill-opacity', active ? (id===active.c?'.22':'.025') : focusUser!==null ? (belongs?'.18':'.025') : '.11');
      el.setAttribute('stroke-opacity', active ? (id===active.c?'1':'.12') : focusUser!==null ? (belongs?'1':'.12') : '.7');
      el.setAttribute('stroke-width',active?.c===id||belongs?'2.4':'1.5');
    });
    container.querySelectorAll('[data-edge-focus]').forEach(b=>{
      b.classList.toggle('focused',+b.dataset.edgeFocus===active?.c);
      b.setAttribute('aria-pressed',String(+b.dataset.edgeFocus===pinnedEdge));
    });
  }
  plot.draw=()=>{draw();decorate();};
  // Stable initial coordinates; force layout remains strictly a visual calculation.
  plot.setData({
    vertices: users.map((u,i)=>({id:String(u.u),label:String(i+1).padStart(2,'0'),
      x:width/2+150*Math.cos(i*2.399963229728653),
      y:height/2+150*Math.sin(i*2.399963229728653)})),
    hyperedges: communities.map(c=>({id:String(c.c),label:c.name,color:c.color,
      vertices:users.filter(u=>u.cs.includes(c.c)).map(u=>String(u.u))})),
  });
  plot.zoomToFit(42);
  plot.svg.setAttribute('role','group');
  plot.svg.setAttribute('aria-label',`${period} 社区超图，${users.length} 位展示用户`);
  function edgeFocus(id) {
    focusEdge=id; focusUser=null;
    const group=id===null?null:groupById.get(String(id));
    hint.textContent=group?`${group.name} · 当前画面 ${users.filter(u=>u.cs.includes(group.c)).length} 人 · 本期全样本 ${group.size.toLocaleString()} 人。高亮圆点才是真实成员。`:defaultHint;
    decorate();
  }
  plot.onNodeDragged=(_,stage)=>{
    if(stage==='start') suppressClick=false;
    if(stage==='drag') suppressClick=true;
  };
  plot.svg.addEventListener('click',e=>{
    if(suppressClick){suppressClick=false;return;}
    const vertex=e.target.closest('.vertex');
    if(vertex) onUser(+vertex.dataset.id);
  });
  plot.svg.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.closest('.vertex')){
      e.preventDefault();onUser(+e.target.closest('.vertex').dataset.id);
    }
  });
  plot.svg.addEventListener('pointerover',e=>{
    const vertex=e.target.closest('.vertex');
    if(!vertex)return;
    const user=userById.get(vertex.dataset.id);
    focusUser=user.u;focusEdge=null;
    hint.textContent=`${user.label} · 真实归属：${user.cs.map(c=>groupById.get(String(c)).name).join('、')}`;
    decorate();
  });
  plot.svg.addEventListener('pointerleave',()=>edgeFocus(pinnedEdge));
  container.querySelectorAll('[data-edge-focus]').forEach(b=>{
    const c=+b.dataset.edgeFocus;
    b.onpointerenter=b.onfocus=()=>edgeFocus(c);
    b.onpointerleave=b.onblur=()=>edgeFocus(pinnedEdge);
    b.onclick=()=>{pinnedEdge=pinnedEdge===c?null:c;edgeFocus(pinnedEdge);};
  });
  container.querySelector('[data-plot-control="layout"]').onchange=e=>{
    settings.layout=e.target.value;onSettings(settings);
    plot.setOptions({layoutType:settings.layout});
    if(settings.layout==='spring-embedding')for(let i=0;i<180;i++)plot.physicsLayout.tick();
    plot.draw();plot.zoomToFit(42);
  };
  for(const [key,option] of [['boundaries','showSubsetBoundary'],['connections','showSubsetEdge']]){
    container.querySelector(`[data-plot-control="${key}"]`).onchange=e=>{
      settings[key]=e.target.checked;onSettings(settings);plot.setOptions({[option]:settings[key]});
    };
  }
  container.querySelector('[data-zoom="in"]').onclick=()=>plot.adjustZoom(1.2);
  container.querySelector('[data-zoom="out"]').onclick=()=>plot.adjustZoom(1/1.2);
  container.querySelector('[data-zoom="fit"]').onclick=()=>plot.zoomToFit(42);
  container.querySelector('[data-plot-export]').onclick=()=>{
    const svg=plot.getSVGString();
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`crossing-${period}-hypergraph.svg`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>plot.zoomToFit(42));
  resize?.observe(host);
  edgeFocus(null);
  return {destroy(){resize?.disconnect();plot.destroy();}, plot};
}

window.CrossingHypergraph={mount};
