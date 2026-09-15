import { COMMON_NAMESPACE_REGISTRY, COMMON_NAMESPACE_IRIS, namespacePrefixMapFromRegistry, mergeProjectPrefixes } from '../packages/namespace-registry/src/index.js';
const commonPrefixes = namespacePrefixMapFromRegistry(Object.fromEntries(
  ['cco2','obo','bfo','rdf','rdfs','owl','xsd'].map(key=>[key,COMMON_NAMESPACE_REGISTRY[key]])
));
export const NS = mergeProjectPrefixes(commonPrefixes, {
  church: 'https://example.org/church-directory/ontology#',
  app: 'https://example.org/church-directory/entry#',
  ccodacts: 'https://github.com/jonathanvajda/cco-d-acts/',
  dir: 'https://example.org/church-directory/id/'
}).prefixes;
// Explicit prefix flags also support registry stems ending in an underscore.
export const JSONLD_CONTEXT = Object.freeze(Object.fromEntries(
  Object.entries(NS).map(([prefix,iri])=>[prefix,{'@id':iri,'@prefix':true}])
));
import { randomUuid } from './uuid.js';
export const MODEL_VERSION = 11;
const LEGACY_VALUE = 'https://www.commoncoreontologies.org/ont00001761';
export const NAMED_INDIVIDUAL = COMMON_NAMESPACE_IRIS.owl.NamedIndividual;
const types = node => [].concat(node['@type'] || []);
const asNamedIndividual = node => ({...node, '@type': [...new Set([...types(node), NAMED_INDIVIDUAL])]});
export const C = n => NS.cco2 + n;
export const B = n => NS.obo + n;
export const H = n => NS.church + n;
export const A = n => NS.app + n;
export const D = n => NS.ccodacts + n;
export const P = {
  value: COMMON_NAMESPACE_IRIS.rdf.value,
  label: COMMON_NAMESPACE_IRIS.rdfs.label,
  designated: C('ont00001879'),
  described: C('ont00001917'),
  about: C('ont00001808'),
  part: B('BFO_0000178'),
  uses: C('ont00001813'),
  role: B('BFO_0000196'),
  context: C('ont00001992'),
  participates: B('BFO_0000056'),
  time: B('BFO_0000199'),
  responsible: D('ont00000022'),
  resides: A('residesIn')
};
export const google = 'Name Prefix|First Name|Middle Name|Last Name|Name Suffix|Phonetic First Name|Phonetic Middle Name|Phonetic Last Name|Nickname|E-mail 1 - Label|E-mail 1 - Value|Phone 1 - Label|Phone 1 - Value|Address 1 - Label|Address 1 - Country|Address 1 - Street|Address 1 - Extended Address|Address 1 - City|Address 1 - Region|Address 1 - Postal Code|Address 1 - PO Box|Organization Name|Organization Title|Organization Department|Birthday|Event 1 - Label|Event 1 - Value|Relation 1 - Label|Relation 1 - Value|Website 1 - Label|Website 1 - Value|Custom Field 1 - Label|Custom Field 1 - Value|Notes|Labels'.split('|');
export const directory = 'Name|Birthday|Address|Phone|E-mail|Status|Elder|Testimony|Application|Covenant|Ministry Service|Transfer/Dismissal|Rec'.split('|');
export const roles = [['', 'Not recorded'], ['ont00000014','Church member'], ['ont00000015','Communicant member'], ['ont00000016','Non-communicant member'], ['ont00000017','Primary church member'], ['ont00000018','Associate church member'], ['ont00000019','Regular attender'], ['ont00000004','Ruling elder'], ['ont00000005','Teaching elder'], ['ont00000006','Senior pastor'], ['ont00000007','Associate pastor'], ['ont00000008','Assistant pastor'], ['ont00000010','Pastoral intern'], ['ont00000011','Candidate under care'], ['ont00000012','Deacon'], ['ont00000013','Assistant to deacons'], ['ont00000020','Censured member'], ['ont00000021','Excommunicated person']];
export const fields = [...new Set([...google,...directory, 'Church name','Membership role','Baptism date','Membership date','Transferred date'])];
export const dateFields = ['Birthday','Baptism date','Membership date','Transferred date'];
export const addressFields = [
  ['Address 1 - Street','StreetAddressComponent','Street + number'],
  ['Address 1 - Extended Address','ExtendedAddressComponent','Apartment / suite / additional address'],
  ['Address 1 - PO Box','PostOfficeBoxIdentifier','PO box'],
  ['Address 1 - City','PostalLocalityName','City / postal locality'],
  ['Address 1 - Region','AdministrativeAreaDesignator','State / province / region'],
  ['Address 1 - Postal Code','PostalCode','ZIP / postal code'],
  ['Address 1 - Country','CountryDesignator','Country']
];
const modeledFields = new Set(['Name','Name Prefix','First Name','Middle Name','Last Name','Name Suffix','Nickname','E-mail','E-mail 1 - Value','Phone','Phone 1 - Value','Address','Church name','Membership role',...dateFields,...addressFields.map(([field])=>field)]);
const classLabels = {
  [C('ont00000077')]: 'Code Identifier',
  [C('ont00000472')]: 'Geospatial Region',
  [C('ont00000529')]: 'Date Identifier',
  [C('ont00000800')]: 'Day',
  [C('ont00000853')]: 'Descriptive Information Content Entity',
  [C('ont00000906')]: 'Email Box',
  [C('ont00000990')]: 'Nickname',
  [C('ont00001014')]: 'Proper Name',
  [C('ont00001237')]: 'Birth',
  [C('ont00001262')]: 'Person',
  [C('ont00000059')]: 'Telephone Line',
  [C('ont00002070')]: 'Email Address',
  [A('PostalAddress')]: 'Postal Address Identifier',
  [A('StreetAddressComponent')]: 'Street Address Component',
  [A('ExtendedAddressComponent')]: 'Extended Address Component',
  [A('PostOfficeBoxIdentifier')]: 'Post Office Box Identifier',
  [A('PostalLocalityName')]: 'Postal Locality Name',
  [A('AdministrativeAreaDesignator')]: 'Postal Administrative Area Designator',
  [A('PostalCode')]: 'Postal Code Identifier',
  [A('CountryDesignator')]: 'Postal Country Designator',
  [H('TelephoneNumber')]: 'Telephone Number Identifier',
  [H('ont00000102')]: 'Local Church Organization',
  ...Object.fromEntries(roles.map(([id,label])=>[H(id),label]).filter(([iri])=>iri!==H('')))
};
export function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number(v.slice(0,4)) > 0 && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
export function displayName(v) { return v.Name || ['Name Prefix','First Name','Middle Name','Last Name','Name Suffix'].map(k=>v[k]).filter(Boolean).join(' ') || v.Nickname || 'Unnamed person'; }
export function validate(v) {
  if (displayName(v)==='Unnamed person') throw Error('Enter a name before saving.');
  for (const k of dateFields) if (v[k] && !validDate(v[k])) throw Error(`${k}: use a complete date in YYYY-MM-DD format.`);
  if (v['Membership role'] && !roles.some(([id])=>id===v['Membership role'])) throw Error('Select a recognized membership role.');
  if (v['Membership role'] && !v['Church name']?.trim()) throw Error('Enter the church name to give this role an organizational context.');
}
export function buildRecord(values, previous, options = {}) {
  const v = Object.fromEntries(Object.entries(values).map(([k,x])=>[k,String(x??'').trim()])); validate(v);
  const preserveSource = !!options.preserveSource;
  const ids = { ...previous?.ids }; const graph=[];
  const uuid = key => ids[key] ||= `urn:uuid:${randomUuid()}`;
  const iriSegment = value => encodeURIComponent(String(value).trim().toLowerCase().normalize('NFKC')).replace(/%20/g,'+');
  const canonicalPhone = value => value.trim().startsWith('+') ? '+'+value.replace(/\D/g,'') : value.replace(/\D/g,'');
  const deterministic = (key,kind,value,canonical=value) => ids[key] = `${NS.dir}${kind}/${iriSegment(canonical)}`;
  const idFor = (key,options={}) => options.iri || (options.deterministic ? deterministic(key,options.kind,valueForId(options.value),options.canonical ?? options.value) : uuid(key));
  const valueForId = value => value || 'value';
  const labelFor = (type,value,fallback) => value || fallback || classLabels[[].concat(type)[0]] || 'Named Individual';
  const node = (key,type,value,datatype=NS.xsd+'string',options={}) => {
    const n=asNamedIndividual({'@id':idFor(key,{...options,value}),'@type':type});
    n[P.label]={'@value':labelFor(type,value,options.label),'@language':'en'};
    if(value!==undefined)n[P.value]={'@value':value,'@type':datatype};
    graph.push(n); return n;
  };
  const link = (s,p,o) => (s[p] ||= []).push({'@id':o['@id']});
  const person=node('person',C('ont00001262'),undefined,undefined,{label:displayName(v)});
  // Spreadsheet imports preserve row/column source values without turning them into domain facts.
  if(preserveSource) for(const [k,value] of Object.entries(v)) if(value && !modeledFields.has(k)) {
    const field=node('source:'+k,C('ont00000853'),value,NS.xsd+'string',{label:value});
    link(field,P.designated,node('key:'+k,C('ont00000077'),k)); link(person,P.described,field);
  }
  const name=node('name',C('ont00001014'),displayName(v)); link(person,P.designated,name);
  for(const [k,type] of [['Name Prefix','NamePrefix'],['First Name','GivenName'],['Middle Name','MiddleName'],['Last Name','FamilyName'],['Name Suffix','NameSuffix']]) if(v[k]) link(name,P.part,node('name:'+k,A(type),v[k]));
  if(v.Nickname)link(person,P.designated,node('nickname',C('ont00000990'),v.Nickname));
  const phones=[...new Set([v.Phone,v['Phone 1 - Value']].filter(Boolean))];
  phones.forEach((value,i)=>{
    const canonical=canonicalPhone(value);
    const line=node('Phone:'+i,C('ont00000059'),undefined,undefined,{deterministic:true,kind:'telephone-line',canonical,label:`Telephone line ${value}`});
    const number=node('Phone:identifier:'+i,H('TelephoneNumber'),value,NS.xsd+'string',{deterministic:true,kind:'telephone-number',canonical});
    link(person,P.responsible,line);link(line,P.designated,number);
  });
  const emails=[...new Set([v['E-mail'],v['E-mail 1 - Value']].filter(Boolean))];
  emails.forEach((value,i)=>{const endpoint=node('E-mail:'+i,C('ont00000906'),undefined,undefined,{deterministic:true,kind:'email-box',canonical:value.toLowerCase(),label:`Email box ${value}`});link(person,P.uses,endpoint);link(endpoint,P.designated,node('E-mail:identifier:'+i,C('ont00002070'),value,NS.xsd+'string',{deterministic:true,kind:'email-address',canonical:value.toLowerCase()}));});
  const components=addressFields.filter(([field])=>v[field]);
  const address=components.length ? components.map(([field])=>v[field]).join(', ') : v.Address;
  if(address) {
    const location=node('location',C('ont00000472'));
    link(person,P.resides,location);
    const identifier=node('address',A('PostalAddress'),address,NS.xsd+'string',{deterministic:true,kind:'postal-address',canonical:address});link(location,P.designated,identifier);
    const addressScope=[v['Address 1 - Country'],v['Address 1 - Region'],v['Address 1 - City'],v['Address 1 - Postal Code']].filter(Boolean).join('|') || address;
    const scopedAddressValue = field => ({
      'Address 1 - City': [v['Address 1 - Country'],v['Address 1 - Region'],v[field]].filter(Boolean).join('|'),
      'Address 1 - Region': [v['Address 1 - Country'],v[field]].filter(Boolean).join('|'),
      'Address 1 - Postal Code': [v['Address 1 - Country'],v['Address 1 - Region'],v[field]].filter(Boolean).join('|')
    })[field] || [addressScope,field,v[field]].filter(Boolean).join('|');
    for(const [field,type] of components)link(identifier,P.part,node('address:'+field,A(type),v[field],NS.xsd+'string',{deterministic:true,kind:type,canonical:scopedAddressValue(field)}));
  }
  if(v['Membership role']) {if(['ont00000014','ont00000015','ont00000016','ont00000017','ont00000018','ont00000020'].includes(v['Membership role']))person['@type'].push(H('ont00000302'));const role=node('role',H(v['Membership role']));link(person,P.role,role);const church=node('church',H('ont00000102'));link(role,P.context,church);link(church,P.designated,node('church-name',C('ont00001014'),v['Church name']));}
  for(const [key,type] of [['Birthday',C('ont00001237')],['Baptism date',H('ont00000207')],['Membership date',H('ont00000209')],['Transferred date',H('ont00000211')]]) if(v[key]) {
    const event=node('event:'+key,type);link(person,P.participates,event);const day=node('day:'+key,C('ont00000800'));link(event,P.time,day);link(day,P.designated,node('date:'+key,C('ont00000529'),v[key],NS.xsd+'date'));
  }
  return { id:person['@id'], ids, modelVersion:MODEL_VERSION, preserveSource, values:v, document:{'@context':JSONLD_CONTEXT,'@graph':graph} };
}
// Only application-owned saved records are loaded here, never arbitrary RDF.
// Reuse their ID registry when enriching the graph from preserved source values.
function currentNode(node) {
  const updated=asNamedIndividual(node);
  if(updated[P.value]===undefined && updated[LEGACY_VALUE]!==undefined)updated[P.value]=updated[LEGACY_VALUE];
  delete updated[LEGACY_VALUE];
  return updated;
}
export function upgradeRecord(record) {
  if(record.modelVersion===MODEL_VERSION)return record;
  return buildRecord(recordValues(record),record,{preserveSource:!!record.preserveSource});
}
const lexicalValue = node => (node?.[P.value] ?? node?.[LEGACY_VALUE])?.['@value'];
export function recordValues(record) {
  if(record.values)return {...record.values};
  const graph=record.document['@graph'];const byId=new Map(graph.map(n=>[n['@id'],n]));const result={};
  for(const n of graph) if(types(n).includes(C('ont00000853'))) {
    const key=lexicalValue(byId.get(n[P.designated]?.[0]?.['@id']));
    if(key && fields.includes(key))result[key]=lexicalValue(n);
  }
  return result;
}
// Also include declarations when exporting records saved by earlier versions.
export function combinedDocument(records) { return {'@context':JSONLD_CONTEXT,'@graph':records.flatMap(r=>upgradeRecord(r).document['@graph'].map(currentNode))}; }
