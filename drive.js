/* Private Apps Script connection; no Google tokens are stored in the website. */
const DriveStore=(()=>{
  const kinds=['documents','classes','links','activities'];
  let data=Object.fromEntries(kinds.map(k=>[k,[]])),revision='',ready=false;
  let peer=null,peerOrigin='',channel='',frame=null,popup=null,connecting=null;
  const pending=new Map();let requestId=0,handshake=null;
  function notify(){window.dispatchEvent(new Event('drive-state'))}
  function reset(){ready=false;peer=null;revision='';data=Object.fromEntries(kinds.map(k=>[k,[]]));notify()}
  function accept(snapshot){
    if(!snapshot?.state||!snapshot.revision)throw new Error('Rekod Drive tidak dapat dibaca.');
    for(const k of kinds)if(!Array.isArray(snapshot.state[k]))throw new Error('Format rekod tidak sah.');
    data=snapshot.state;revision=snapshot.revision;ready=true;notify();
  }
  window.addEventListener('message',event=>{
    const message=event.data;
    if(!message||message.channel!==channel)return;
    let origin;try{origin=new URL(event.origin)}catch{return}
    if(origin.protocol!=='https:'||!(origin.hostname==='script.google.com'||origin.hostname.endsWith('.googleusercontent.com')))return;
    if(message.type==='panitia-ready'&&handshake){peer=event.source;peerOrigin=event.origin;handshake.resolve();return}
    if(event.source!==peer||event.origin!==peerOrigin||message.type!=='panitia-response')return;
    const task=pending.get(message.id);if(!task)return;
    pending.delete(message.id);clearTimeout(task.timer);
    if(message.error)task.reject(new Error(message.error));else task.resolve(message.result);
  });
  function rpc(request){
    if(!peer)throw new Error('Sambungan Drive belum siap. Klik menu untuk menyambung semula.');
    const id=++requestId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Respons Drive terlalu lama. Klik menu subjek untuk menyemak rekod sebelum mencuba lagi.'))},90000);
      pending.set(id,{resolve,reject,timer});
      peer.postMessage({type:'panitia-request',channel,id,request},peerOrigin);
    });
  }
  async function refresh(){accept(await rpc({op:'load'}))}
  async function connect(url,{background=false}={}){
    if(ready)return;
    if(connecting)return connecting;
    const endpoint=new URL(url);
    if(endpoint.origin!=='https://script.google.com'||!endpoint.pathname.endsWith('/exec'))throw new Error('Alamat sambungan Drive tidak sah.');
    reset();channel=crypto.randomUUID();endpoint.searchParams.set('bridge','github');endpoint.searchParams.set('channel',channel);
    connecting=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{handshake=null;reject(new Error(background?'Klik menu untuk membuka sambungan Drive.':'Selesaikan log masuk Google dalam tetingkap sambungan, kemudian klik menu sekali lagi.'))},background?18000:180000);
      handshake={resolve:()=>{clearTimeout(timer);handshake=null;resolve()}};
      if(background){
        frame?.remove();frame=document.createElement('iframe');frame.hidden=true;frame.title='Sambungan Drive';frame.src=endpoint.href;document.body.appendChild(frame);
      }else{
        endpoint.searchParams.set('popup','1');popup=window.open(endpoint.href,'panitiaDrive','popup,width=620,height=700');
        if(!popup){clearTimeout(timer);handshake=null;reject(new Error('Benarkan pop-up Google untuk menyambungkan Drive.'))}
        else {
          endpoint.searchParams.delete('popup');
          const retry=setInterval(()=>{
            if(!handshake){clearInterval(retry);if(ready)popup?.close();return}
            frame?.remove();frame=document.createElement('iframe');frame.hidden=true;frame.title='Sambungan Drive';frame.src=endpoint.href;document.body.appendChild(frame);
          },5000);
        }
      }
    }).then(refresh).finally(()=>{connecting=null});
    return connecting;
  }
  async function base64(file){
    if(!(file instanceof Blob)||file.size>5*1024*1024||await file.slice(0,5).text()!=='%PDF-')throw new Error('Pilih PDF yang sah, maksimum 5 MB.');
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('PDF gagal dibaca.'));r.readAsDataURL(file)});
  }
  function uniqueId(){let id;do{const a=crypto.getRandomValues(new Uint32Array(2));id=(a[0]&0x1fffff)*4294967296+a[1]}while(!id||kinds.some(k=>data[k].some(d=>d.id===id)));return id}
  async function write(op,kind,value){
    if(!ready)throw new Error('Sambungan Drive belum siap.');
    const {fileBlob,...record}=value;
    const request={op,kind,value:record,revision};
    if(op==='add'&&kind==='documents')request.base64=await base64(fileBlob);
    accept(await rpc(request));return record.id;
  }
  return {
    connect,refresh,
    disconnect:()=>{frame?.remove();popup?.close();reset()},
    state:()=>({ready,folder:window.PANITIA_CONFIG?.folderId}),
    all:async k=>structuredClone(data[k]),
    one:async(k,id)=>structuredClone(data[k].find(d=>d.id===Number(id))),
    add:(k,v)=>write('add',k,{...v,id:uniqueId()}),
    put:(k,v)=>write('put',k,v),
    remove:async(k,id)=>{accept(await rpc({op:'remove',kind:k,id,revision}))},
    clear:async k=>{accept(await rpc({op:'clear',kind:k,revision}))},
    pdf:async id=>{const result=await rpc({op:'pdf',id});return new Blob([Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0))],{type:'application/pdf'})}
  };
})();
