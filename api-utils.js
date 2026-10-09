// Preserve order and text while removing empty prompt placeholders.
export function compactMessages(messages) {
 const out=[];
 for(const m of messages){
  if(typeof m.content!=='string'||!m.content.trim())continue;
  const last=out.at(-1);
  if(last?.role===m.role)last.content+='\n\n'+m.content;
  else out.push({role:m.role,content:m.content});
 }
 return out;
}
export function safeApiError(raw, secrets=[], messages=[]) {
 let x;try{x=JSON.parse(raw);}catch{return '接口未返回结构化错误，请检查地址或服务状态';}
 let text=String(x?.error?.message||x?.message||x?.error?.code||'接口拒绝请求，未提供错误说明');
 for(const value of [...secrets,...messages.map(m=>m.content)].filter(v=>typeof v==='string'&&v.length>2))text=text.split(value).join('[已隐藏]');
 return text.replace(/Bearer\s+\S+/gi,'Bearer [已隐藏]').replace(/sk-[\w-]+/g,'[密钥已隐藏]').replace(/https?:\/\/\S+/g,'[地址已隐藏]').replace(/["“][^"”\n]*["”]/g,'[引用已隐藏]').slice(0,500);
}
