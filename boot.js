(function(){
 const LOG='yuusha_v14_selfheal_log';
 function record(msg){try{const a=JSON.parse(localStorage.getItem(LOG)||'[]');a.unshift({t:new Date().toISOString(),m:String(msg)});localStorage.setItem(LOG,JSON.stringify(a.slice(0,30)))}catch(_){}}
 function show(msg){record(msg);const b=document.getElementById('bootError'),o=document.getElementById('bootErrorText');if(b&&o){o.textContent=String(msg);b.style.display='block'}}
 window.__SELF_HEAL={safeMode:new URLSearchParams(location.search).get('safe')==='1',record,show};
 window.__selfHealSafeRestart=()=>{const u=new URL(location.href);u.searchParams.set('v','19');u.searchParams.set('safe','1');location.href=u.toString()};
 window.__selfHealClearSave=()=>{try{const backup={};Object.keys(localStorage).filter(k=>k.startsWith('yuusha_v')).forEach(k=>backup[k]=localStorage.getItem(k));localStorage.setItem('yuusha_v14_quarantine',JSON.stringify(backup));Object.keys(localStorage).filter(k=>k.startsWith('yuusha_v')&&!['yuusha_v14_quarantine',LOG].includes(k)).forEach(k=>localStorage.removeItem(k));show('セーブを隔離しました。安全モードで再起動してください。')}catch(e){show(e.message)}};
 addEventListener('error',e=>show((e.message||'Unknown error')+(e.filename?'\n'+e.filename+':'+e.lineno+':'+e.colno:'')));
 addEventListener('unhandledrejection',e=>show('Promise error: '+String(e.reason||'Unknown')));
})();