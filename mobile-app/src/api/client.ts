export type Session={access_token:string;refresh_token:string};
export function createClient(base:string, hooks:{getAccess:()=>string|null;getRefresh:()=>Promise<string|null>;save:(s:Session)=>Promise<void>;logout:()=>Promise<void>}, fetcher:typeof fetch=fetch){
 let flight:Promise<void>|null=null;
 async function refresh(){if(!flight){flight=(async()=>{try{const refresh_token=await hooks.getRefresh();if(!refresh_token)throw Error('Sesión ausente');const r=await fetcher(base+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token})});if(!r.ok)throw Error('Sesión vencida');await hooks.save(await r.json());}catch(e){await hooks.logout();throw e;}})().finally(()=>{flight=null})}return flight;}
 async function request(path:string,init:RequestInit={},elevated?:string){const first=hooks.getAccess();const send=()=>fetcher(base+path,{...init,headers:{...init.headers,Authorization:'Bearer '+(elevated||hooks.getAccess()||'')}});let r=await send();if(r.status===401&&!elevated){if(hooks.getAccess()===first)await refresh();r=await send()}return r;}
 return {request,refresh};
}
