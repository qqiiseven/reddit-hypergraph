importScripts('propagation-model.js','paper-rsc.js');
const net=PaperRSC.network();
self.onmessage=({data})=>{
 try{
  const params=PaperRSC.parameters(net,data.initial,data.lambda),result=PropagationModel.compare(net,params,data.seed),transfer=[];
  for(const key of ['baseline','hyper'])for(const f of result[key]){f.state=Uint8Array.from(f.state);transfer.push(f.state.buffer);}
  self.postMessage({id:data.id,result},transfer);
 }catch(error){self.postMessage({id:data.id,error:String(error)});}
};
