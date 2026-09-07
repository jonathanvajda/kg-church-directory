import { parseDelimitedText } from '../packages/tabular-io/src/index.js';
import { google, directory, fields, dateFields, validDate, buildRecord } from './model.js';
export {google, directory};
export function readDelimited(text) { const result=parseDelimitedText(text,{hasHeader:false,skipBlankRows:false}); if(result.warnings.length)throw Error(result.warnings.map(w=>w.message).join(' ')); return result.rows; }
export function sheetRows(book, name, XLSX) {
  const sheet=book.Sheets[name]; if(!sheet)return [];
  // Format date cells explicitly; never convert phone/postal identifiers to numbers.
  const copy={...sheet};
  for(const key of Object.keys(copy)) { const cell=copy[key];if(key[0]!=='!' && cell?.t==='n' && XLSX.SSF.is_date(cell.z||'')) {const d=XLSX.SSF.parse_date_code(cell.v,{date1904:!!book.Workbook?.WBProps?.date1904});if(d)copy[key]={t:'s',v:`${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`};} }
  return XLSX.utils.sheet_to_json(copy,{header:1,raw:false,defval:'',blankrows:true});
}
export function suggestMapping(rows, hasHeader, template) {
  const width=Math.max(0,...rows.map(r=>r.length)); const schema=template==='google'?google:directory;
  return Array.from({length:width},(_,i)=>hasHeader?(fields.find(k=>k.toLowerCase()===String(rows[0]?.[i]??'').trim().toLowerCase())||''):schema[i]||'');
}
export function prepareImport(rows, hasHeader, mapping) {
  const targets=mapping.filter(Boolean); if(new Set(targets).size!==targets.length)throw Error('Each destination field can only be mapped once.');
  if(!targets.length)throw Error('Map at least one column.');
  const records=[], errors=[]; const start=hasHeader?1:0;
  for(let i=start;i<rows.length;i++) {
    if(rows[i].every(v=>!String(v??'').trim()))continue;
    const v={}; mapping.forEach((k,j)=>{if(k)v[k]=String(rows[i][j]??'').trim();});
    for(const k of dateFields) if(v[k]) {
      const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v[k]);
      if(m)v[k]=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
      if(!validDate(v[k]))errors.push(`Row ${i+1}: ${k} must be YYYY-MM-DD or M/D/YYYY; received “${v[k]}”.`);
    }
    try { records.push(buildRecord(v)); } catch(e) {errors.push(`Row ${i+1}: ${e.message}`);}
  }
  return {records,errors:[...new Set(errors)]};
}
