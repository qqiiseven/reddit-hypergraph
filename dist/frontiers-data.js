/* Research metadata and explicit teaching data; no pretrained model is run here. */
(function(root){
  'use strict';
  const papers=[
    {id:'images',name:'图像集合可视分析',title:'Interactive hypergraph visual analytics for exploring large and complex image collections',venue:'Information Visualization · 2026',status:'已发表',date:'2026-06-29 在线发表',url:'https://journals.sagepub.com/doi/10.1177/14738716261459480',summary:'从原始图像构建超图，联动空间视图、图片网格和关联矩阵，帮助探索图像之间重叠的内容或情境关系。论文还提出 CoverEdge Similarity，并邀请 8 位领域专家开展定性评估。',boundary:'这里使用 6 张自行绘制的场景图，成员关系由教学数据指定，不是论文图片，也未运行图像分组算法。'},
    {id:'generation',name:'SuperHype',title:'SuperHype: Hypergraph Generation via Graph-Superposition Decomposition',venue:'ICML 2026',status:'已发表',date:'2026 · PMLR 306',url:'https://proceedings.mlr.press/v306/gantes26a.html',code:'https://github.com/Lucas-Gantes/SuperHype',summary:'用图叠加分解表示超图，再通过生成模型学习和生成群体关系。在五个数据集上评估局部与全局连接模式的保真度。这里的扩散是生成模型的去噪过程，不是人群传播。',boundary:'本页只对预设的教学结构进行有种子的重组采样，未训练或调用 SuperHype。分布根据当前示例实时计算，不能用来评估论文模型。'},
    {id:'evidence',name:'HyperRAG',title:'HyperRAG: Reasoning N-ary Facts over Hypergraphs for Retrieval Augmented Generation',venue:'WWW 2026',status:'已接收',date:'作者页面注明 WWW 2026 接收',url:'https://arxiv.org/abs/2602.14470',summary:'用超图组织多实体事实；HyperRetriever 结合问题检索推理链，HyperMemory 为搜索提供记忆引导。它与 HyperGraphRAG 是不同的研究。',boundary:'本页事实完全虚构。交互仅演示共享实体与证据连接，不调用大模型，不执行检索算法。实体角色和事实描述必须一起保留；单独的无标签集合并不表达完整语义。事件节点等其他建模方式同样可以保留这些事实。'},
    {id:'vision',name:'VizRAG',title:'VizRAG: Enhancing Retrieval-Augmented Generation with Hypergraph Visualization',venue:'2026.07 · arXiv',status:'预印本',date:'2026-07-22 提交；未据此标记为正式发表',url:'https://arxiv.org/abs/2607.19830',summary:'将超图的视觉表达引入多模态 RAG，研究图形中的结构信息如何支持模型理解，并提出 HyperViz 工具处理视觉拥挤与呈现偏差。',boundary:'左右两幅图来自同一份关联数据。这里演示集合包围与二部关联表示的等价结构，不调用多模态模型，也不声称一种布局必然更准确。'},
    {id:'multimodal',name:'Hyper-M2RAG',title:'Hypergraph-based Multimodal Retrieval-Augmented Generation with Incremental Refinement',venue:'ACM Multimedia 2026',status:'已接收',date:'作者页面注明 ACM MM 2026 接收',url:'https://arxiv.org/abs/2608.16628',code:'https://github.com/ShenAoChen2001/MMHRAG',summary:'用多模态超边组织文字、图片和表格间的关联，并用锚点驱动的增量更新补齐跨页上下文。',boundary:'本页提供研究简介和原文入口，未实现文档检索系统。'},
    {id:'fusion',name:'HyperAHSF',title:'Hypergraph-Based Multi-View Multi-Label Classification via Adaptive High-Order Semantic Fusion',venue:'AAAI 2026',status:'已发表',date:'2026-03-14 发表',url:'https://ojs.aaai.org/index.php/AAAI/article/view/39719',summary:'既在每个特征视角内部构建相似样本群组，也通过跨视角超边连接同一样本的多种表示，再融合信息进行多标签分类。',boundary:'本页提供研究简介和原文入口，未实现分类模型。'},
    {id:'reasoning',name:'HyperReCo',title:'HyperReCo: Retrieving and Connecting Evidence with Hypergraph Neural Networks for LLM Multi-hop Reasoning',venue:'2026.09 · arXiv',status:'预印本',date:'2026-09-26 提交；未据此标记为正式发表',url:'https://arxiv.org/abs/2609.32327',summary:'将文档表示为实体集合上的超边，通过超图神经网络学习与问题相关的证据关联，再解码成显式超路径以连接多跳推理的证据。',boundary:'本页提供研究简介和原文入口，未运行神经网络或推理实验。'}
  ];
  const scenes=[
    {id:'P1',place:'广场',object:'红车',color:'#d77c6f'},
    {id:'P2',place:'广场',object:'蓝车',color:'#6d9cbe'},
    {id:'P3',place:'广场',object:'自行车',color:'#789e96'},
    {id:'P4',place:'河畔',object:'红车',color:'#d77c6f'},
    {id:'P5',place:'街角',object:'红车',color:'#d77c6f'},
    {id:'P6',place:'河畔',object:'蓝车',color:'#6d9cbe'}
  ];
  const imageEdges=[{id:'place',label:'广场',color:'#5289dc',members:['P1','P2','P3']},{id:'object',label:'红车',color:'#e19a67',members:['P1','P4','P5']}];
  const reference={nodes:'ABCDEFGH'.split(''),edges:[['A','B','C'],['C','D','E','F'],['E','G','H']]};
  // Reassign membership with the same edge sizes: a teaching sampler, NOT SuperHype.
  function sample(seed){
    let value=seed>>>0;
    const random=()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};
    const nodes=reference.nodes.slice();
    const shuffled=nodes.slice();for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    const edges=[shuffled.slice(0,3),shuffled.slice(3,7),[shuffled[7],shuffled[0],shuffled[3]]];
    if(seed%2===0){edges[1]=[shuffled[0],shuffled[3],shuffled[4],shuffled[5]];edges[2]=[shuffled[0],shuffled[6],shuffled[7]];}
    return {nodes,edges};
  }
  function histogram(values){const counts={};values.forEach(v=>counts[v]=(counts[v]||0)+1);return counts;}
  function stats(graph){return {sizes:histogram(graph.edges.map(e=>e.length)),degrees:histogram(graph.nodes.map(n=>graph.edges.filter(e=>e.includes(n)).length))};}
  const relation={nodes:['A','B','C','D','E'],edges:[{id:'E1',members:['A','B','C'],color:'#5289dc'},{id:'E2',members:['C','D','E'],color:'#e19a67'}]};
  const api={papers,scenes,imageEdges,reference,sample,stats,relation};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontiersData=api;
})(typeof window!=='undefined'?window:globalThis);
