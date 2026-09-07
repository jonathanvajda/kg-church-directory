import { fields, roles, dateFields, displayName, buildRecord, recordValues, combinedDocument, NS } from './model.js';
import { readDelimited, sheetRows, suggestMapping, prepareImport } from './import.js';
import { readFileAsText, readFileAsArrayBuffer, downloadTextFile } from '../packages/browser-file-io/src/index.js';
import { parseRdfTextWithAdapters, serializeRdfDatasetWithAdapters } from '../packages/rdf-io/src/index.js';
const $=id=>document.getElementById(id); const key='church-directory-poc-v1';
let records=[], editing=null, dirty=false, rows=[], book=null, prepared=null, importVersion=0;
const notice=(message,error=false)=>{$('notice').textContent=message;$('notice').classList.toggle('error',error);};
const run=fn=>async(...args)=>{try{await fn(...args);}catch(e){notice(e.message,true);}};
const option=(value,label)=>{const n=document.createElement('option');n.value=value;n.textContent=label;return n;};
const primary=['Name','First Name','Middle Name','Last Name','Nickname','Birthday','Phone','E-mail','Address','Church name','Membership role','Baptism date','Membership date','Transferred date'];
for(const name of [...primary,...fields.filter(k=>!primary.includes(k))]) {
  const label=document.createElement('label');label.textContent=name==='Name'?'Full / display name':name;
  const input=document.createElement(name==='Membership role'?'select':['Address','Notes','Testimony'].includes(name)?'textarea':'input');input.name=name;
  if(name==='Membership role')roles.forEach(([value,text])=>input.append(option(value,text)));
  else { input.type=dateFields.includes(name)?'date':'text'; if(name==='Phone')input.inputMode='tel'; if(name==='E-mail')input.inputMode='email'; }
  label.append(input);$(primary.includes(name)?'primary-fields':'extra-fields').append(label);
}
function persist() { if($('persist').checked) {try{localStorage.setItem(key,JSON.stringify(records));}catch(e){notice('Records saved in this session, but device storage failed. Download your graph to keep a copy.',true);return false;}}return true; }
function renderList() {
  $('count').textContent=records.length;$('list').replaceChildren();
  const query=$('search').value.toLowerCase();const matches=records.filter(r=>Object.values(recordValues(r)).join(' ').toLowerCase().includes(query));
  for(const r of matches) {const v=recordValues(r);const button=document.createElement('button');button.className='person-card'+(r.id===editing?' selected':'');button.type='button';button.textContent=displayName(v);const sub=document.createElement('small');sub.textContent=v['E-mail']||v['E-mail 1 - Value']||v.Phone||'Contact details not recorded';button.append(sub);button.onclick=()=>{if(leaveEdits())edit(r);};$('list').append(button);}
  if(!matches.length){const p=document.createElement('p');p.className='empty';p.textContent=records.length?'No matching people.':'Your directory starts here. Add a person or import your first spreadsheet.';$('list').append(p);}
}
function leaveEdits(){return !dirty || confirm('Discard unsaved changes to this person?');}
function edit(record) {editing=record?.id||null;const v=record?recordValues(record):{};$('person-form').reset();for(const input of $('person-form').elements)if(input.name)input.value=v[input.name]||'';dirty=false;$('form-title').textContent=record?'Edit person':'Add a person';$('record-id').textContent=editing||'';$('delete').hidden=!record;renderList();}
$('person-form').oninput=()=>{dirty=true;};
$('person-form').onsubmit=run(async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const old=records.find(r=>r.id===editing);const record=buildRecord(v,old);await parseRdfTextWithAdapters(JSON.stringify(record.document),{format:'jsonld'});if(old)records=records.map(r=>r.id===old.id?record:r);else records.push(record);edit(record);if(persist())notice(`${displayName(v)} saved. Download the graph for a portable copy.`);});
$('new').onclick=()=>{if(leaveEdits())edit(null);};$('reset').onclick=()=>{if(leaveEdits())edit(records.find(r=>r.id===editing));};
$('delete').onclick=()=>{if(confirm('Delete this person and the graph entities belonging to this record?')){records=records.filter(r=>r.id!==editing);edit(null);persist();notice('Person deleted.');}};
$('search').oninput=renderList;
$('persist').onchange=run(()=>{if($('persist').checked){if(persist())notice('Saving on this device is enabled.');}else{localStorage.removeItem(key);notice('Saved device copy removed. Current session records remain available.');}});
try {const saved=localStorage.getItem(key);if(saved){const parsed=JSON.parse(saved);if(!Array.isArray(parsed)||parsed.some(r=>!r.document?.['@graph']||!r.id||!r.ids))throw Error('Invalid saved records');records=parsed;$('persist').checked=true;notice(`Restored ${records.length} records from this device.`);}}catch(e){notice('The saved device copy could not be read. It has not been overwritten.',true);}
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));for(const id of ['people','import','export'])$(id).hidden=id!==button.dataset.tab;if(button.dataset.tab==='export')run(preview)();});
function invalidate(){prepared=null;$('commit-import').disabled=true;$('import-errors').textContent='';}
function renderMapping() {
  invalidate();const mapping=suggestMapping(rows,$('header-row').checked,$('template').value);const start=$('header-row').checked?1:0;
  $('mapping').replaceChildren();const table=document.createElement('table');const head=table.createTHead().insertRow();['Source column','Import as','First value','Second value'].forEach(t=>{const th=document.createElement('th');th.textContent=t;head.append(th);});const body=table.createTBody();
  mapping.forEach((value,i)=>{const tr=body.insertRow();tr.insertCell().textContent=$('header-row').checked?String(rows[0]?.[i]??`Column ${i+1}`):`Column ${i+1}`;const select=document.createElement('select');select.setAttribute('aria-label',`Destination for column ${i+1}`);select.append(option('','Ignore column'));fields.forEach(k=>select.append(option(k,k)));select.value=value;select.onchange=invalidate;tr.insertCell().append(select);for(let j=0;j<2;j++)tr.insertCell().textContent=rows[start+j]?.[i]??'';});$('mapping').append(table);
  $('import-summary').textContent=`${rows.slice(start).filter(r=>r.some(v=>String(v??'').trim())).length} nonempty rows · ${mapping.length} columns. Check every column mapping before importing.`;
}
$('file').onchange=run(async()=>{const version=++importVersion;invalidate();$('preflight').hidden=true;rows=[];book=null;const file=$('file').files[0];if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!['csv','tsv','xls','xlsx'].includes(ext))throw Error('Choose CSV, TSV, XLS, or XLSX.');
  if(['xls','xlsx'].includes(ext)){const buffer=await readFileAsArrayBuffer(file);if(version!==importVersion)return;book=XLSX.read(buffer,{type:'array',cellNF:true});$('sheet').replaceChildren(...book.SheetNames.map(n=>option(n,n)));$('sheet').disabled=false;rows=sheetRows(book,$('sheet').value,XLSX);}else{const text=await readFileAsText(file);if(version!==importVersion)return;rows=readDelimited(text);$('sheet').replaceChildren(option('','Text file'));$('sheet').disabled=true;}
  $('preflight').hidden=false;renderMapping();notice('Spreadsheet read. Review the worksheet, headers, and mappings.');});
$('sheet').onchange=run(()=>{rows=sheetRows(book,$('sheet').value,XLSX);renderMapping();});$('header-row').onchange=renderMapping;$('template').onchange=renderMapping;
$('validate-import').onclick=run(()=>{invalidate();const mapping=[...$('mapping').querySelectorAll('select')].map(s=>s.value);prepared=prepareImport(rows,$('header-row').checked,mapping);if(prepared.errors.length){$('import-errors').textContent=prepared.errors.join('\n');notice('Import has errors. Correct the source file or mapping and validate again.',true);}else if(!prepared.records.length){notice('No records to import.',true);}else{$('commit-import').disabled=false;notice(`${prepared.records.length} people validated. Ready to add.`);}});
$('commit-import').onclick=run(async()=>{if(!prepared||prepared.errors.length)return;const pending=prepared;const version=importVersion;$('commit-import').disabled=true;await parseRdfTextWithAdapters(JSON.stringify(combinedDocument(pending.records)),{format:'jsonld'});if(prepared!==pending||version!==importVersion)return;records.push(...pending.records);invalidate();renderList();if(persist())notice(`${pending.records.length} people added. Open People to review and enrich their records.`);});
async function serialize(){const parsed=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument(records)),{format:'jsonld'});const result=await serializeRdfDatasetWithAdapters(parsed.dataset,{format:$('format').value,context:NS,prefixes:NS});return {...result,count:parsed.quads.length};}
async function preview(){const result=await serialize();$('rdf-preview').textContent=result.text;$('graph-stats').textContent=`${records.length} people · ${combinedDocument(records)['@graph'].length} identified entities · ${result.count} RDF statements`;$('download').disabled=!records.length;return result;}
$('format').onchange=run(preview);$('preview').onclick=run(preview);$('download').onclick=run(async()=>{if(!records.length)throw Error('Add a person before exporting.');const result=await preview();downloadTextFile(`church-directory.${({jsonld:'jsonld',turtle:'ttl',ntriples:'nt'})[result.format]}`,result.text,{mimeType:result.mimeType});notice('Graph downloaded.');});
window.addEventListener('beforeunload',e=>{if(dirty||(records.length&&!$('persist').checked)){e.preventDefault();e.returnValue='';}});
renderList();
