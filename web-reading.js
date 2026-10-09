import {uid} from './core.js?v=1.5';
import {diagnostics} from './diagnostics.js?v=1.5';
export function webURL(value){const u=new URL(value.trim());if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('请填写完整的 http / https 网页地址');return u.href;}
export function webBook(v,old={}){return {...old,id:old.id||uid(),kind:'book',sourceType:'web',title:v.title.trim()||new URL(webURL(v.url)).hostname,url:webURL(v.url),coverUrl:v.coverUrl?.trim()?webURL(v.coverUrl):'',group:v.group?.trim()||'',createdAt:old.createdAt||Date.now()};}
export function webReadingMethods({esc,btn,field}){return {
 webRender(){const r=this.readingRow(this.webKey);return `<main class="shr-wide shr-web">${this.header(r.title,btn('web:exit','书架'))}<div class="shr-toolbar">${btn('web:site','网页')}${btn('web:paste','粘贴阅读')}${btn('web:excerpt','摘抄')}${btn('web:progress','记进度')}${btn('web:edit','资料')}<a href="${esc(r.chapterUrl||r.url)}" target="_blank" rel="noopener noreferrer">原站打开 ↗</a></div>${this.webText?`<div class="shr-scroll shr-web-text" tabindex="0">${esc(this.webText)}</div>`:`<p class="shr-note">来源：${esc(new URL(r.url).hostname)}。网页不显示或登录失败时，请用“原站打开”。内页跳转后的地址需在“记进度”中粘贴。</p><iframe title="原站阅读" src="${esc(r.chapterUrl||r.url)}" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerpolicy="no-referrer"></iframe>`}<small class="shr-web-foot">${esc(r.chapter||'尚未记录章节')} · 鲜虾记录，不代表平台同步</small></main>`;},
 async webAction(a,id){
 diagnostics.log('reading.web',{operation:a});
 if(a==='add'||a==='edit'){const r=a==='edit'?this.readingRow(this.webKey):null;this.modal(r?'网页书籍资料':'添加网页书籍',`${field('title','书名',r?.title||'')}${field('url','书籍网页地址',r?.url||'')}${field('coverUrl','封面图片地址（可留空）',r?.coverUrl||'')}${field('group','分组',r?.group||'')}${r?'':this.readingPlaceField(this.readingDefault||'browser')}<p>只保存封面地址、来源和阅读记录，不下载书籍。夸克里看的第三方网站，请复制实际网页地址。</p>`,btn('web:save','保存'),r);return;}
 if(a==='save'){const v=this.values(),old=this.modalData,r=webBook(v,old||{});if(new URL(r.url).origin===location.origin)throw Error('请填写阅读平台地址，不能嵌入酒馆自身');if(this.reading.rows('book').some(x=>x.url===r.url&&x.id!==r.id))throw Error('这个网页已经在书架中');await this.reading.put(old?.place||v.place,r);this.closeModal();this.render();return;}
 if(a==='open'){this.webKey=id;this.webText='';this.render();return;}
 if(a==='exit'){this.webKey=null;this.webText='';this.render();return;}
 if(a==='site'){this.webText='';this.render();return;}
 const r=this.readingRow(this.webKey);
 if(a==='paste'){this.modal('临时阅读',`<p>在原站复制本章文字，粘贴后用鲜虾排版阅读。正文只在本次打开期间保留，关闭窗口后清空。</p><label class="shr-field">正文<textarea name="text" rows="9"></textarea></label>`,btn('web:read','开始阅读'));return;}
 if(a==='read'){const text=this.values().text.trim();if(!text)throw Error('请先粘贴正文');if(text.length>200000)throw Error('请分章节粘贴，单次最多 20 万字');this.webText=text;this.closeModal();this.render();return;}
 if(a==='excerpt'){const selection=window.getSelection(),reader=this.root.querySelector('.shr-web-text');const text=reader&&selection?.anchorNode&&reader.contains(selection.anchorNode)?selection.toString():'';this.readingEditor();for(const [name,value] of Object.entries({text,source:r.title,chapter:r.chapter||''})){this.root.querySelector(`[name="${name}"]`).value=value;}this.webExcerpt={sourceUrl:r.chapterUrl||r.url,bookId:r.id};return;}
 if(a==='progress'){this.modal('记录阅读位置',`${field('chapter','章节 / 位置',r.chapter||'')}${field('chapterUrl','当前章节网页地址',r.chapterUrl||r.url)}<p>这条记录保存在鲜虾；不会写入晋江或夸克账户。</p>`,btn('web:progressSave','保存'),r);return;}
 if(a==='progressSave'){const v=this.values(),chapterUrl=webURL(v.chapterUrl);if(new URL(chapterUrl).origin===location.origin)throw Error('不能嵌入酒馆自身');await this.reading.put(r.place,{...r,chapter:v.chapter.trim(),chapterUrl,lastRead:Date.now()});this.closeModal();this.render();}
 }
};}
