const STORAGE_KEY='suporte-n3-sql-portal-v2';

const DEFAULT_CATEGORIES=[
  {id:'cat-select',name:'SELECT',color:'#4ea8de'},{id:'cat-insert',name:'INSERT',color:'#48b860'},
  {id:'cat-update',name:'UPDATE',color:'#d4943a'},{id:'cat-delete',name:'DELETE',color:'#e04050'},
  {id:'cat-create',name:'CREATE',color:'#8b5cf6'},{id:'cat-alter',name:'ALTER',color:'#06b6d4'},
  {id:'cat-drop',name:'DROP',color:'#ef4444'},{id:'cat-procedure',name:'PROCEDURE',color:'#f59e0b'},
  {id:'cat-function',name:'FUNCTION',color:'#10b981'},{id:'cat-trigger',name:'TRIGGER',color:'#ec4899'},
  {id:'cat-view',name:'VIEW',color:'#6366f1'},{id:'cat-index',name:'INDEX',color:'#14b8a6'},
  {id:'cat-other',name:'OTHER',color:'#8888a0'}
];

const DEFAULT_DATA={
  version:'2.0',
  folders:[
    {id:'folder-consultas',name:'Consultas',parentId:null,createdAt:'2026-07-01T10:00:00.000Z'},
    {id:'folder-clientes',name:'Clientes hospedados',parentId:null,createdAt:'2026-07-01T10:00:00.000Z'},
    {id:'folder-diagnostico',name:'Diagnóstico',parentId:'folder-clientes',createdAt:'2026-07-01T10:00:00.000Z'}
  ],
  categories:DEFAULT_CATEGORIES,
  scripts:[
    {id:'script-ativos',name:'Clientes ativos por período',categoryId:'cat-select',folderId:'folder-consultas',content:"SELECT c.id, c.nome, c.criado_em\nFROM clientes c\nWHERE c.ativo = 1\n  AND c.criado_em BETWEEN :data_inicio AND :data_fim\nORDER BY c.criado_em DESC;",createdAt:'2026-07-10T10:00:00.000Z',updatedAt:'2026-07-20T10:00:00.000Z'},
    {id:'script-tamanho',name:'Tamanho das tabelas',categoryId:'cat-select',folderId:'folder-diagnostico',content:"SELECT schemaname, relname,\n       pg_size_pretty(pg_total_relation_size(relid)) AS tamanho_total\nFROM pg_catalog.pg_statio_user_tables\nORDER BY pg_total_relation_size(relid) DESC;",createdAt:'2026-07-11T10:00:00.000Z',updatedAt:'2026-07-19T10:00:00.000Z'},
    {id:'script-index',name:'Índices não utilizados',categoryId:'cat-index',folderId:'folder-diagnostico',content:"SELECT OBJECT_NAME(i.object_id) AS tabela, i.name AS indice,\n       s.user_seeks, s.user_scans, s.user_updates\nFROM sys.indexes i\nLEFT JOIN sys.dm_db_index_usage_stats s\n  ON s.object_id = i.object_id AND s.index_id = i.index_id\nWHERE i.is_primary_key = 0;",createdAt:'2026-07-12T10:00:00.000Z',updatedAt:'2026-07-18T10:00:00.000Z'},
    {id:'script-duplicados',name:'E-mails duplicados',categoryId:'cat-select',folderId:'folder-consultas',content:"SELECT email, COUNT(*) AS ocorrencias\nFROM usuarios\nWHERE email IS NOT NULL\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY ocorrencias DESC;",createdAt:'2026-07-13T10:00:00.000Z',updatedAt:'2026-07-17T10:00:00.000Z'}
  ],
  settings:{remoteUrl:'',autoSync:false,theme:'light',language:'pt',lastSync:null}
};

const translations={
  pt:{home:'Início',workspace:'ESPAÇO DE TRABALHO',allScripts:'Todos os scripts',folders:'PASTAS',categories:'CATEGORIAS',newScript:'Novo script'},
  en:{home:'Home',workspace:'WORKSPACE',allScripts:'All scripts',folders:'FOLDERS',categories:'CATEGORIES',newScript:'New script'}
};

const state={data:loadData(),page:'home',folderId:null,categoryId:null,search:'',selectedScriptId:null,highlight:false};
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];

function clone(value){return JSON.parse(JSON.stringify(value))}
function loadData(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&Array.isArray(saved.scripts)&&Array.isArray(saved.folders)&&Array.isArray(saved.categories)){saved.settings={...DEFAULT_DATA.settings,...saved.settings};return saved}}catch{}return clone(DEFAULT_DATA)}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));renderAll()}
function uid(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function now(){return new Date().toISOString()}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function normalize(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function formatDate(value){return new Intl.DateTimeFormat(state.data.settings.language==='en'?'en-US':'pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value))}
function toast(message){const element=$('#toast');element.textContent=message;element.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.remove('show'),2400)}
function closeSidebar(){$('#sidebar').classList.remove('open');$('#mobileShade').hidden=true}
function getCategory(id){return state.data.categories.find(category=>category.id===id)}
function getFolder(id){return state.data.folders.find(folder=>folder.id===id)}
function getFolderChildren(id){return state.data.folders.filter(folder=>folder.parentId===id).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))}
function getDescendantIds(folderId){const ids=new Set([folderId]);const collect=id=>getFolderChildren(id).forEach(child=>{ids.add(child.id);collect(child.id)});collect(folderId);return ids}
function folderPath(folderId){const names=[];let folder=getFolder(folderId);const seen=new Set();while(folder&&!seen.has(folder.id)){seen.add(folder.id);names.unshift(folder.name);folder=getFolder(folder.parentId)}return names.join(' / ')}
function countInFolder(folderId){const ids=getDescendantIds(folderId);return state.data.scripts.filter(script=>ids.has(script.folderId)).length}

function initializePortal(){document.documentElement.dataset.theme=state.data.settings.theme;applyLanguage();renderAll();if(state.data.settings.autoSync&&state.data.settings.remoteUrl)syncRemote(false)}

function applyLanguage(){const language=state.data.settings.language;document.documentElement.lang=language==='en'?'en':'pt-BR';$('#languageButton').textContent=language.toUpperCase();$$('[data-i18n]').forEach(element=>{const key=element.dataset.i18n;element.textContent=translations[language]?.[key]||translations.pt[key]||key})}
function renderAll(){renderSidebar();renderScripts();renderStats();$('#syncButton').hidden=!state.data.settings.remoteUrl;document.documentElement.dataset.theme=state.data.settings.theme}
function renderStats(){$('#allCount').textContent=state.data.scripts.length;$('#statsScripts').textContent=state.data.scripts.length;$('#statsFolders').textContent=state.data.folders.length;$('#statsCategories').textContent=state.data.categories.length}

function renderSidebar(){
  const makeFolders=(parentId,depth=0)=>getFolderChildren(parentId).map(folder=>`<div class="tree-item ${state.folderId===folder.id?'active':''}" data-tree-folder="${folder.id}"><button data-filter-folder="${folder.id}" title="${escapeHtml(folderPath(folder.id))}"><span class="folder-indent" style="width:${depth*10}px"></span><span>▱</span><span class="tree-name">${escapeHtml(folder.name)}</span><span class="tree-count">${countInFolder(folder.id)}</span></button><button class="tree-manage" data-manage-folder="${folder.id}" aria-label="Gerenciar pasta">•••</button></div>${makeFolders(folder.id,depth+1)}`).join('');
  $('#folderList').innerHTML=`<div class="tree-item ${state.folderId==='__none__'?'active':''}"><button data-filter-folder="__none__"><span>▱</span><span class="tree-name">Sem pasta</span><span class="tree-count">${state.data.scripts.filter(s=>!s.folderId).length}</span></button></div>${makeFolders(null)}`;
  $('#categoryList').innerHTML=`<div class="tree-item ${state.categoryId==='__none__'?'active':''}"><button data-filter-category="__none__"><span class="color-dot" style="background:#9aa9b8"></span><span class="tree-name">Sem categoria</span><span class="tree-count">${state.data.scripts.filter(s=>!s.categoryId).length}</span></button></div>`+state.data.categories.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(category=>`<div class="tree-item ${state.categoryId===category.id?'active':''}"><button data-filter-category="${category.id}"><span class="color-dot" style="background:${category.color}"></span><span class="tree-name">${escapeHtml(category.name)}</span><span class="tree-count">${state.data.scripts.filter(s=>s.categoryId===category.id).length}</span></button><button class="tree-manage" data-manage-category="${category.id}" aria-label="Gerenciar categoria">•••</button></div>`).join('');
}

function filteredScripts(){
  let scripts=state.data.scripts.filter(script=>{
    const folderMatch=!state.folderId||(state.folderId==='__none__'?!script.folderId:getDescendantIds(state.folderId).has(script.folderId));
    const categoryMatch=!state.categoryId||(state.categoryId==='__none__'?!script.categoryId:script.categoryId===state.categoryId);
    const haystack=normalize(`${script.name} ${script.content} ${folderPath(script.folderId)} ${getCategory(script.categoryId)?.name||''}`);
    return folderMatch&&categoryMatch&&haystack.includes(normalize(state.search));
  });
  return scripts.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
}

function renderFilters(){
  $('#folderFilter').innerHTML='<option value="">Todas as pastas</option><option value="__none__">Sem pasta</option>'+flattenFolders().map(({folder,depth})=>`<option value="${folder.id}" ${state.folderId===folder.id?'selected':''}>${'— '.repeat(depth)}${escapeHtml(folder.name)}</option>`).join('');
  $('#categoryFilter').innerHTML='<option value="">Todas as categorias</option><option value="__none__">Sem categoria</option>'+state.data.categories.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(category=>`<option value="${category.id}" ${state.categoryId===category.id?'selected':''}>${escapeHtml(category.name)}</option>`).join('');
}
function flattenFolders(parentId=null,depth=0,result=[]){getFolderChildren(parentId).forEach(folder=>{result.push({folder,depth});flattenFolders(folder.id,depth+1,result)});return result}
function renderScripts(){
  renderFilters();const scripts=filteredScripts();
  $('#resultCount').textContent=`${scripts.length} ${scripts.length===1?'script':'scripts'}`;
  $('#emptyState').hidden=scripts.length>0;
  $('#scriptGrid').innerHTML=scripts.map(script=>{const category=getCategory(script.categoryId);const path=folderPath(script.folderId);const preview=script.content.slice(0,145)+(script.content.length>145?'…':'');return `<article class="script-card" data-script-id="${script.id}" tabindex="0"><span class="card-bar" style="background:${category?.color||'#9aa9b8'}"></span><div class="card-head"><h2 title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</h2>${category?`<span class="category-badge" style="color:${category.color};background:${category.color}18;border:1px solid ${category.color}33">${escapeHtml(category.name)}</span>`:''}</div><div class="folder-path"><span>▱</span><span>${escapeHtml(path||'Sem pasta')}</span></div><p class="code-preview">${escapeHtml(preview)}</p><div class="card-footer"><span>${script.content.split('\n').length} linhas · ${formatDate(script.updatedAt)}</span><div class="card-actions"><button data-copy-script="${script.id}">Copiar</button><button data-card-menu="${script.id}">•••</button></div></div></article>`}).join('');
}

function showPage(page){
  state.page=page;$$('.page').forEach(element=>element.classList.remove('active'));$(`#${page}Page`).classList.add('active');$$('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.page===page));
  if(page==='home'){$('#breadcrumb').textContent='PORTAL / INÍCIO';$('#pageHeading').textContent='Olá, Suporte N3!'}else{$('#breadcrumb').textContent='PORTAL / SCRIPTS SQL';$('#pageHeading').textContent='SQL Script Manager'}
  closeSidebar();
}
function showScriptsWithFilter(folderId=null,categoryId=null){state.folderId=folderId;state.categoryId=categoryId;const folder=getFolder(folderId);const category=getCategory(categoryId);$('#libraryTitle').textContent=folder?.name||category?.name||'Todos os scripts';$('#librarySubtitle').textContent=folder?folderPath(folder.id):category?'Scripts desta categoria.':'Gerencie e consulte seus comandos.';showPage('scripts');renderAll()}

function fillScriptSelects(script={}){
  $('#scriptCategory').innerHTML='<option value="">Sem categoria</option>'+state.data.categories.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(category=>`<option value="${category.id}" ${script.categoryId===category.id?'selected':''}>${escapeHtml(category.name)}</option>`).join('');
  $('#scriptFolder').innerHTML='<option value="">Sem pasta</option>'+flattenFolders().map(({folder,depth})=>`<option value="${folder.id}" ${script.folderId===folder.id?'selected':''}>${'— '.repeat(depth)}${escapeHtml(folder.name)}</option>`).join('');
}
function updateEditorInfo(){const content=$('#scriptCode').value;$('#editorInfo').textContent=`${content?content.split('\n').length:0} linhas · ${content.length} caracteres`}
function openScriptEditor(script=null){$('#scriptDialogTitle').textContent=script?'Alterar script':'Novo script';$('#scriptId').value=script?.id||'';$('#scriptName').value=script?.name||'';$('#scriptCode').value=script?.content||'';fillScriptSelects(script||{});updateEditorInfo();$('#scriptDialog').showModal();setTimeout(()=>$('#scriptName').focus(),40)}
function openViewer(id){const script=state.data.scripts.find(item=>item.id===id);if(!script)return;state.selectedScriptId=id;state.highlight=false;const category=getCategory(script.categoryId);$('#viewerMeta').textContent=[category?.name,folderPath(script.folderId)].filter(Boolean).join(' · ')||'SCRIPT SQL';$('#viewerTitle').textContent=script.name;$('#viewerDetails').innerHTML=`<span>${script.content.split('\n').length} linhas</span><span>${script.content.length} caracteres</span><span>Criado em ${formatDate(script.createdAt)}</span><span>Atualizado em ${formatDate(script.updatedAt)}</span>`;$('#viewerCode').textContent=script.content;$('#highlightButton').classList.remove('active');$('#viewerDialog').showModal()}
function highlightSql(code){let html=escapeHtml(code);html=html.replace(/(--[^\n]*)/g,'<span class="sql-comment">$1</span>');html=html.replace(/('[^']*')/g,'<span class="sql-string">$1</span>');const words='SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|IF|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|INDEX|UNIQUE|DEFAULT|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|NULL|IS|PROCEDURE|FUNCTION|TRIGGER|VIEW|BEGIN|COMMIT|ROLLBACK';return html.replace(new RegExp(`\\b(${words})\\b`,'gi'),'<span class="sql-keyword">$1</span>')}

async function copyScript(id){const script=state.data.scripts.find(item=>item.id===id);if(!script)return;try{await navigator.clipboard.writeText(script.content);toast('Script copiado!')}catch{const area=document.createElement('textarea');area.value=script.content;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('Script copiado!')}}
function deleteScript(id){const script=state.data.scripts.find(item=>item.id===id);if(!script||!confirm(`Excluir “${script.name}”?`))return;state.data.scripts=state.data.scripts.filter(item=>item.id!==id);$('#viewerDialog').close();saveData();toast('Script excluído')}

function fillParentFolderOptions(selected=null,excludedId=null){const excluded=excludedId?getDescendantIds(excludedId):new Set();$('#parentFolder').innerHTML='<option value="">Sem pasta superior</option>'+flattenFolders().filter(({folder})=>!excluded.has(folder.id)).map(({folder,depth})=>`<option value="${folder.id}" ${selected===folder.id?'selected':''}>${'— '.repeat(depth)}${escapeHtml(folder.name)}</option>`).join('')}
function openFolderEditor(folder=null){$('#folderDialogTitle').textContent=folder?'Alterar pasta':'Nova pasta';$('#folderId').value=folder?.id||'';$('#folderName').value=folder?.name||'';fillParentFolderOptions(folder?.parentId||null,folder?.id||null);$('#folderDialog').showModal();setTimeout(()=>$('#folderName').focus(),40)}
function deleteFolder(id){const folder=getFolder(id);if(!folder||!confirm(`Excluir a pasta “${folder.name}” e suas subpastas? Os scripts ficarão sem pasta.`))return;const ids=getDescendantIds(id);state.data.scripts.forEach(script=>{if(ids.has(script.folderId))script.folderId=null});state.data.folders=state.data.folders.filter(item=>!ids.has(item.id));if(ids.has(state.folderId))state.folderId=null;saveData();toast('Pasta excluída')}
function openCategoryEditor(category=null){$('#categoryDialogTitle').textContent=category?'Alterar categoria':'Nova categoria';$('#categoryId').value=category?.id||'';$('#categoryName').value=category?.name||'';$('#categoryColor').value=category?.color||'#178fd1';$('#categoryDialog').showModal();setTimeout(()=>$('#categoryName').focus(),40)}
function deleteCategory(id){const category=getCategory(id);if(!category||!confirm(`Excluir a categoria “${category.name}”?`))return;state.data.scripts.forEach(script=>{if(script.categoryId===id)script.categoryId=null});state.data.categories=state.data.categories.filter(item=>item.id!==id);if(state.categoryId===id)state.categoryId=null;saveData();toast('Categoria excluída')}

function showContext(event,items){event.preventDefault();event.stopPropagation();const menu=$('#contextMenu');menu.innerHTML=items.map((item,index)=>`<button data-context-index="${index}" class="${item.danger?'danger':''}">${escapeHtml(item.label)}</button>`).join('');menu.style.left=`${Math.min(event.clientX,window.innerWidth-150)}px`;menu.style.top=`${Math.min(event.clientY,window.innerHeight-100)}px`;menu.hidden=false;menu._items=items}
function hideContext(){$('#contextMenu').hidden=true}

function buildExport(){return{version:'2.0',scripts:state.data.scripts,folders:state.data.folders,categories:state.data.categories,settings:{remoteUrl:state.data.settings.remoteUrl,autoSync:state.data.settings.autoSync},exportedAt:now()}}
function exportDatabase(){const blob=new Blob([JSON.stringify(buildExport(),null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`portal-sql-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('Backup exportado')}
function validDatabase(data){return data&&Array.isArray(data.scripts)&&Array.isArray(data.folders)&&Array.isArray(data.categories)}
function mergeDatabase(incoming){const merged=clone(state.data);incoming.categories.forEach(category=>{if(!merged.categories.some(item=>normalize(item.name)===normalize(category.name)))merged.categories.push(category)});incoming.folders.forEach(folder=>{if(!merged.folders.some(item=>item.id===folder.id||normalize(folderPath(item.id))===normalize(folder.name)))merged.folders.push(folder)});incoming.scripts.forEach(script=>{const index=merged.scripts.findIndex(item=>item.id===script.id||normalize(item.name)===normalize(script.name));if(index<0)merged.scripts.push(script);else if(new Date(script.updatedAt||0)>new Date(merged.scripts[index].updatedAt||0))merged.scripts[index]=script});state.data=merged;saveData()}
async function importDatabaseFile(file){try{const data=JSON.parse(await file.text());if(!validDatabase(data))throw new Error();mergeDatabase(data);toast('Banco importado com sucesso')}catch{toast('Arquivo de banco inválido')}}
async function importTxtFile(file){try{const content=await file.text();const name=file.name.replace(/\.txt$/i,'');const existing=state.data.scripts.find(script=>normalize(script.name)===normalize(name));if(existing){if(confirm(`O script “${name}” já existe. Substituir o conteúdo?`)){existing.content=content;existing.updatedAt=now()}}else state.data.scripts.push({id:uid('script'),name,content,categoryId:null,folderId:null,createdAt:now(),updatedAt:now()});saveData();toast('Arquivo .txt importado')}catch{toast('Não foi possível importar o arquivo')}}
async function syncRemote(showSuccess=true){const url=state.data.settings.remoteUrl;if(!url)return toast('Defina uma URL nas configurações');try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();if(!validDatabase(data))throw new Error();mergeDatabase(data);state.data.settings.lastSync=now();saveData();if(showSuccess)toast('Sincronização concluída')}catch{toast('Falha ao sincronizar a URL remota')}}

$('#todayBadge').textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());

document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-page]');if(nav){showPage(nav.dataset.page);return}
  const go=event.target.closest('[data-go]');if(go){showPage(go.dataset.go);return}
  const folder=event.target.closest('[data-filter-folder]');if(folder){showScriptsWithFilter(folder.dataset.filterFolder,null);return}
  const category=event.target.closest('[data-filter-category]');if(category){showScriptsWithFilter(null,category.dataset.filterCategory);return}
  const manageFolder=event.target.closest('[data-manage-folder]');if(manageFolder){const item=getFolder(manageFolder.dataset.manageFolder);showContext(event,[{label:'Alterar pasta',action:()=>openFolderEditor(item)},{label:'Excluir pasta',danger:true,action:()=>deleteFolder(item.id)}]);return}
  const manageCategory=event.target.closest('[data-manage-category]');if(manageCategory){const item=getCategory(manageCategory.dataset.manageCategory);showContext(event,[{label:'Alterar categoria',action:()=>openCategoryEditor(item)},{label:'Excluir categoria',danger:true,action:()=>deleteCategory(item.id)}]);return}
  const copy=event.target.closest('[data-copy-script]');if(copy){event.stopPropagation();copyScript(copy.dataset.copyScript);return}
  const cardMenu=event.target.closest('[data-card-menu]');if(cardMenu){const script=state.data.scripts.find(item=>item.id===cardMenu.dataset.cardMenu);showContext(event,[{label:'Visualizar',action:()=>openViewer(script.id)},{label:'Alterar',action:()=>openScriptEditor(script)},{label:'Copiar',action:()=>copyScript(script.id)},{label:'Excluir',danger:true,action:()=>deleteScript(script.id)}]);return}
  const card=event.target.closest('[data-script-id]');if(card){openViewer(card.dataset.scriptId);return}
  const context=event.target.closest('[data-context-index]');if(context){const item=$('#contextMenu')._items?.[Number(context.dataset.contextIndex)];hideContext();item?.action();return}
  if(!event.target.closest('#contextMenu'))hideContext();
});

$('#menuButton').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobileShade').hidden=false});$('#closeSidebar').addEventListener('click',closeSidebar);$('#mobileShade').addEventListener('click',closeSidebar);
['newScriptButton','newScriptContentButton','quickNewScript','emptyNewButton'].forEach(id=>$(`#${id}`).addEventListener('click',()=>openScriptEditor()));$('#addFolderButton').addEventListener('click',()=>openFolderEditor());$('#addCategoryButton').addEventListener('click',()=>openCategoryEditor());
$('#searchInput').addEventListener('input',event=>{state.search=event.target.value;$('#contentSearchInput').value=state.search;if(state.page!=='scripts')showPage('scripts');renderScripts()});$('#contentSearchInput').addEventListener('input',event=>{state.search=event.target.value;$('#searchInput').value=state.search;renderScripts()});$('#folderFilter').addEventListener('change',event=>{state.folderId=event.target.value||null;renderAll()});$('#categoryFilter').addEventListener('change',event=>{state.categoryId=event.target.value||null;renderAll()});
$('#scriptCode').addEventListener('input',updateEditorInfo);$('#scriptForm').addEventListener('submit',event=>{event.preventDefault();const id=$('#scriptId').value;const name=$('#scriptName').value.trim();if(state.data.scripts.some(script=>normalize(script.name)===normalize(name)&&script.id!==id))return toast('Já existe um script com este nome');const existing=state.data.scripts.find(script=>script.id===id);const script={id:id||uid('script'),name,categoryId:$('#scriptCategory').value||null,folderId:$('#scriptFolder').value||null,content:$('#scriptCode').value,createdAt:existing?.createdAt||now(),updatedAt:now()};state.data.scripts=id?state.data.scripts.map(item=>item.id===id?script:item):[script,...state.data.scripts];$('#scriptDialog').close();saveData();toast('Script salvo');setTimeout(()=>openViewer(script.id),80)});
$('#folderForm').addEventListener('submit',event=>{event.preventDefault();const id=$('#folderId').value;const existing=getFolder(id);const folder={id:id||uid('folder'),name:$('#folderName').value.trim(),parentId:$('#parentFolder').value||null,createdAt:existing?.createdAt||now()};state.data.folders=id?state.data.folders.map(item=>item.id===id?folder:item):[...state.data.folders,folder];$('#folderDialog').close();saveData();toast('Pasta salva')});
$('#categoryForm').addEventListener('submit',event=>{event.preventDefault();const id=$('#categoryId').value;const existing=getCategory(id);const category={id:id||uid('cat'),name:$('#categoryName').value.trim().toUpperCase(),color:$('#categoryColor').value,createdAt:existing?.createdAt||now()};state.data.categories=id?state.data.categories.map(item=>item.id===id?category:item):[...state.data.categories,category];$('#categoryDialog').close();saveData();toast('Categoria salva')});
$('#highlightButton').addEventListener('click',()=>{const script=state.data.scripts.find(item=>item.id===state.selectedScriptId);if(!script)return;state.highlight=!state.highlight;if(state.highlight)$('#viewerCode').innerHTML=highlightSql(script.content);else $('#viewerCode').textContent=script.content});$('#copyScriptButton').addEventListener('click',()=>copyScript(state.selectedScriptId));$('#editScriptButton').addEventListener('click',()=>{const script=state.data.scripts.find(item=>item.id===state.selectedScriptId);$('#viewerDialog').close();openScriptEditor(script)});$('#deleteScriptButton').addEventListener('click',()=>deleteScript(state.selectedScriptId));

$('#importDatabaseButton').addEventListener('click',()=>$('#databaseFileInput').click());$('#quickImport').addEventListener('click',()=>$('#databaseFileInput').click());$('#databaseFileInput').addEventListener('change',event=>{const file=event.target.files[0];if(file)importDatabaseFile(file);event.target.value=''});$('#importTxtButton').addEventListener('click',()=>$('#txtFileInput').click());$('#txtFileInput').addEventListener('change',event=>{const file=event.target.files[0];if(file)importTxtFile(file);event.target.value=''});$('#backupButton').addEventListener('click',exportDatabase);$('#quickBackup').addEventListener('click',exportDatabase);
$('#settingsButton').addEventListener('click',()=>{$('#remoteUrl').value=state.data.settings.remoteUrl||'';$('#autoSync').checked=Boolean(state.data.settings.autoSync);$('#settingsDialog').showModal()});$('#settingsForm').addEventListener('submit',event=>{event.preventDefault();state.data.settings.remoteUrl=$('#remoteUrl').value.trim();state.data.settings.autoSync=$('#autoSync').checked;$('#settingsDialog').close();saveData();toast('Configurações salvas')});$('#syncButton').addEventListener('click',()=>syncRemote());
$('#themeButton').addEventListener('click',()=>{state.data.settings.theme=state.data.settings.theme==='dark'?'light':'dark';saveData()});$('#languageButton').addEventListener('click',()=>{state.data.settings.language=state.data.settings.language==='pt'?'en':'pt';applyLanguage();saveData()});
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showPage('scripts');$('#searchInput').focus()}if(event.key==='Enter'&&event.target.matches('[data-script-id]'))openViewer(event.target.dataset.scriptId);if(event.key==='Escape'){hideContext();closeSidebar()}});

initializePortal();
