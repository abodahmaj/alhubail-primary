/* No account data or session tokens persist in browser storage. */
(function(){'use strict';
 window.createSchoolConnection=function(url){let active=connection_(url);return {get ready(){return active.ready;},close:function(){active.close();},request:async function(req){let result=await active.request(req);if(result?.error?.code==='CONNECTION_LIMIT'){active.close();active=connection_(url);await active.ready;result=await active.request(req);}return result;}};};
 function connection_(url){
  if(typeof url!=='string'||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))throw Error('INVALID_BACKEND');
  const channel='alhubail-auth-v1';
  const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const nonce=randomId(),frame=document.createElement('iframe');frame.src=url;frame.hidden=true;frame.title='اتصال آمن بقاعدة المدرسة';frame.setAttribute('aria-hidden','true');
  let source=null,origin=null,closed=false,interval,readyTimeout,readyResolve,readyReject;const pending=new Map();
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  function hello(){if(closed||origin)return;try{source=frame.contentWindow.frames[0].frames[0];if(source)source.postMessage({channel,type:'hello',nonce},'*');}catch(e){/* frame not ready; no secrets sent */}}
  function receive(e){
   const m=e.data;if(closed||e.source!==source||!/^https:\/\/[a-z0-9-]+-script\.googleusercontent\.com$/.test(e.origin)||!m||m.channel!==channel||m.nonce!==nonce)return;
   if(m.type==='ready'&&!origin){origin=e.origin;clearInterval(interval);clearTimeout(readyTimeout);readyResolve();return;}
   if(e.origin!==origin||m.type!=='response'||!pending.has(m.requestId))return;
   const item=pending.get(m.requestId);pending.delete(m.requestId);clearTimeout(item.timer);item.resolve(m.result);
  }
  window.addEventListener('message',receive);document.body.appendChild(frame);
  interval=setInterval(hello,350);readyTimeout=setTimeout(()=>{readyReject(Error('BACKEND_TIMEOUT'));close();},25000);hello();
  function close(){if(closed)return;closed=true;clearInterval(interval);clearTimeout(readyTimeout);window.removeEventListener('message',receive);frame.remove();pending.forEach(p=>{clearTimeout(p.timer);p.reject(Error('CONNECTION_CLOSED'));});pending.clear();}
  return {ready,close,request:async function(request){await ready;if(closed)throw Error('CONNECTION_CLOSED');if(pending.size>=10)throw Error('TOO_MANY_REQUESTS');const requestId=randomId();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('REQUEST_TIMEOUT'));},30000);pending.set(requestId,{resolve,reject,timer});source.postMessage({channel,type:'request',nonce,requestId,request},origin);});}};
 };
})();
