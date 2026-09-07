export const NS = { cco: 'https://www.commoncoreontologies.org/', bfo: 'http://purl.obolibrary.org/obo/', church: 'https://example.org/church-directory/ontology#', app: 'https://example.org/church-directory/entry#', xsd: 'http://www.w3.org/2001/XMLSchema#' };
export const C = n => NS.cco + n;
export const B = n => NS.bfo + n;
export const H = n => NS.church + n;
export const A = n => NS.app + n;
export const P = { token: C('ont00001761'), designated: C('ont00001879'), described: C('ont00001917'), about: C('ont00001808'), part: B('BFO_0000178'), uses: C('ont00001813'), role: B('BFO_0000196'), context: C('ont00001992'), participates: B('BFO_0000056'), time: B('BFO_0000199') };
export const google = 'Name Prefix|First Name|Middle Name|Last Name|Name Suffix|Phonetic First Name|Phonetic Middle Name|Phonetic Last Name|Nickname|E-mail 1 - Label|E-mail 1 - Value|Phone 1 - Label|Phone 1 - Value|Address 1 - Label|Address 1 - Country|Address 1 - Street|Address 1 - Extended Address|Address 1 - City|Address 1 - Region|Address 1 - Postal Code|Address 1 - PO Box|Organization Name|Organization Title|Organization Department|Birthday|Event 1 - Label|Event 1 - Value|Relation 1 - Label|Relation 1 - Value|Website 1 - Label|Website 1 - Value|Custom Field 1 - Label|Custom Field 1 - Value|Notes|Labels'.split('|');
export const directory = 'Name|Birthday|Address|Phone|E-mail|Status|Elder|Testimony|Application|Covenant|Ministry Service|Transfer/Dismissal|Rec'.split('|');
export const roles = [['', 'Not recorded'], ['ont00000014','Church member'], ['ont00000015','Communicant member'], ['ont00000016','Non-communicant member'], ['ont00000017','Primary church member'], ['ont00000018','Associate church member'], ['ont00000019','Regular attender'], ['ont00000004','Ruling elder'], ['ont00000005','Teaching elder'], ['ont00000006','Senior pastor'], ['ont00000007','Associate pastor'], ['ont00000008','Assistant pastor'], ['ont00000010','Pastoral intern'], ['ont00000011','Candidate under care'], ['ont00000012','Deacon'], ['ont00000013','Assistant to deacons'], ['ont00000020','Censured member'], ['ont00000021','Excommunicated person']];
export const fields = [...new Set([...google,...directory, 'Church name','Membership role','Baptism date','Membership date','Transferred date'])];
export const dateFields = ['Birthday','Baptism date','Membership date','Transferred date'];
export function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0,4)) > 0 && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
export function displayName(v) { return v.Name || ['Name Prefix','First Name','Middle Name','Last Name','Name Suffix'].map(k=>v[k]).filter(Boolean).join(' ') || v.Nickname || 'Unnamed person'; }
export function validate(v) {
  if (displayName(v)==='Unnamed person') throw Error('Enter a name before saving.');
  for (const k of dateFields) if (v[k] && !validDate(v[k])) throw Error(`${k}: use a complete date in YYYY-MM-DD format.`);
  if (v['Membership role'] && !roles.some(([id])=>id===v['Membership role'])) throw Error('Select a recognized membership role.');
  if (v['Membership role'] && !v['Church name']?.trim()) throw Error('Enter the church name to give this role an organizational context.');
}
export function buildRecord(values, previous) {
  const v = Object.fromEntries(Object.entries(values).map(([k,x])=>[k,String(x??'').trim()])); validate(v);
  const ids = { ...previous?.ids }; const graph=[];
  const id = key => ids[key] ||= `urn:uuid:${crypto.randomUUID()}`;
  const node = (key,type,token) => { const n={'@id':id(key),'@type':type}; if(token!==undefined)n[P.token]={'@value':token,'@type':NS.xsd+'string'}; graph.push(n); return n; };
  const link = (s,p,o) => (s[p] ||= []).push({'@id':o['@id']});
  const person=node('person',C('ont00001262'));
  // Source information is itself a graph, preserving every input without inventing facts.
  for(const [k,value] of Object.entries(v)) if(value) {
    const field=node('source:'+k,A('SourceFieldValue'),value);
    link(field,P.designated,node('key:'+k,C('ont00000077'),k)); link(person,P.described,field);
  }
  const name=node('name',C('ont00001014'),displayName(v)); link(person,P.designated,name);
  for(const [k,type] of [['Name Prefix','NamePrefix'],['First Name','GivenName'],['Middle Name','MiddleName'],['Last Name','FamilyName'],['Name Suffix','NameSuffix']]) if(v[k]) link(name,P.part,node('name:'+k,A(type),v[k]));
  if(v.Nickname)link(person,P.designated,node('nickname',C('ont00000990'),v.Nickname));
  for(const [key,type,identifier] of [['Phone',C('ont00001247'),A('TelephoneNumber')],['E-mail',C('ont00000906'),C('ont00002070')]]) {
    const vals=[...new Set([v[key],v[key+' 1 - Value']].filter(Boolean))];
    vals.forEach((value,i)=>{const endpoint=node(key+':'+i,type);link(person,P.uses,endpoint);link(endpoint,P.designated,node(key+':identifier:'+i,identifier,value));});
  }
  const address=v.Address || google.filter(k=>k.startsWith('Address 1 - ')&&!k.endsWith('Label')).map(k=>v[k]).filter(Boolean).join(', ');
  if(address) { const location=node('location',C('ont00000472')); const description=node('contact-location',A('ContactLocationDescription')); link(description,P.about,person);link(description,P.about,location);link(person,P.described,description);link(location,P.designated,node('address',A('PostalAddress'),address)); }
  if(v['Membership role']) {const role=node('role',H(v['Membership role']));link(person,P.role,role);const church=node('church',H('ont00000102'));link(role,P.context,church);link(church,P.designated,node('church-name',C('ont00001014'),v['Church name']));}
  for(const [key,type] of [['Birthday',C('ont00001237')],['Baptism date',H('ont00000207')],['Membership date',H('ont00000209')],['Transferred date',H('ont00000211')]]) if(v[key]) {
    const event=node('event:'+key,type);link(person,P.participates,event);const day=node('day:'+key,C('ont00000800'));link(event,P.time,day);link(day,P.designated,node('date:'+key,C('ont00000529'),v[key]));
  }
  return { id:person['@id'], ids, document:{'@context':NS,'@graph':graph} };
}
export function recordValues(record) {
  const graph=record.document['@graph'];const byId=new Map(graph.map(n=>[n['@id'],n]));const result={};
  for(const n of graph) if(n['@type']===A('SourceFieldValue')) { const key=byId.get(n[P.designated]?.[0]?.['@id'])?.[P.token]?.['@value']; if(key)result[key]=n[P.token]['@value']; }
  return result;
}
export function combinedDocument(records) { return {'@context':NS,'@graph':records.flatMap(r=>r.document['@graph'])}; }
