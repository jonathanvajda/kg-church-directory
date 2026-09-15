import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { randomUuid } from '../docs/app/uuid.js';
import { buildRecord, upgradeRecord, addressFields, recordValues, combinedDocument, P, C, B, A, H, D, NAMED_INDIVIDUAL, NS, JSONLD_CONTEXT } from '../docs/app/model.js';
import { COMMON_NAMESPACE_REGISTRY, namespacePrefixMapFromRegistry } from '../docs/packages/namespace-registry/src/index.js';
import { readDelimited, sheetRows, suggestMapping, prepareImport } from '../docs/app/import.js';
import { parseRdfTextWithAdapters, serializeRdfDatasetWithAdapters } from '../docs/packages/rdf-io/src/index.js';
const require=createRequire(import.meta.url);
test('UUID fallback sets version and variant bits and requires secure randomness',()=>{
 assert.equal(randomUuid({getRandomValues: bytes=>bytes.fill(255)}),'ffffffff-ffff-4fff-bfff-ffffffffffff');
 assert.equal(randomUuid({getRandomValues: bytes=>bytes.fill(0)}),'00000000-0000-4000-8000-000000000000');
 assert.throws(()=>randomUuid({}),/Secure random number generation is unavailable/);
});
test('Spreadsheet validation works without crypto.randomUUID',t=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis.crypto,'randomUUID');
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis.crypto,'randomUUID',descriptor);else delete globalThis.crypto.randomUUID;});
 Object.defineProperty(globalThis.crypto,'randomUUID',{value:undefined,configurable:true});
 const result=prepareImport([['Name'],['Jane Smith'],['John Smith']],true,['Name']);
 assert.deepEqual(result.errors,[]);
 for(const record of result.records) {
  const ids=record.document['@graph'].map(n=>n['@id']);
  assert.equal(new Set(ids).size,ids.length);
 }
 const ids=result.records.flatMap(r=>r.document['@graph'].map(n=>n['@id']));
 result.records.forEach(r=>assert.match(r.id,/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
 ids.forEach(id=>assert.match(id,/^(urn:uuid:|https:\/\/example\.org\/church-directory\/id\/)/));
 assert(result.records.every(r=>!r.ids['key:Name']));
 assert(!ids.some(id=>id.includes('/source-field-key/')));
});
globalThis.window=globalThis;
globalThis.self=globalThis;
const runtime={N3:require('../docs/vendor/n3.min.js'),jsonld:require('../docs/vendor/jsonld.min.js')};
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../docs/vendor/xlsx.full.min.js',import.meta.url),'utf8'),context);const XLSX=context.XLSX;
const sample={'First Name':'John','Last Name':'Smith',Phone:'0018885551234','E-mail':'john@example.org',Address:'12 Main St',Birthday:'2000-02-29','Church name':'Example Church','Membership role':'ont00000015','Baptism date':'2020-01-01','Transferred date':'',Notes:'Line one\n"quoted" & <markup>'};
test('App, JSON-LD and Turtle prefixes follow the shared registry without changing RDF IRIs',async()=>{
 const expected=namespacePrefixMapFromRegistry();
 for(const prefix of ['cco2','obo','bfo','rdf','rdfs','owl','xsd'])assert.equal(NS[prefix],expected[prefix]);
 assert.equal(NS.ccodacts,'https://github.com/jonathanvajda/cco-d-acts/');
 assert.equal(NS.dir,'https://example.org/church-directory/id/');
 assert.equal(NS.cco,undefined);
 assert.equal(P.part,expected.obo+'BFO_0000178');
  assert.equal(P.responsible,D('ont00000022'));
 assert.equal(P.resides,A('residesIn'));
 const source=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument([buildRecord(sample)])),{format:'jsonld',runtime});
 for(const format of ['jsonld','turtle']) {
  const out=await serializeRdfDatasetWithAdapters(source.dataset,{format,runtime,context:JSONLD_CONTEXT,prefixes:NS});
  if(format==='jsonld') {
   const doc=JSON.parse(out.text);assert.equal(doc['@context'].bfo['@id'],expected.bfo);assert.equal(doc['@context'].bfo['@prefix'],true);
   assert(out.text.includes('cco2:ont00001262'));assert(out.text.includes('bfo:0000196'));assert(out.text.includes('ccodacts:ont00000022'));
  }else {assert(out.text.includes('@prefix cco2:'));assert(out.text.includes('@prefix bfo: <'+expected.bfo+'>'));assert(out.text.includes('@prefix ccodacts:'));}
  const back=await parseRdfTextWithAdapters(out.text,{format,runtime});
  const lines=async dataset=>(await serializeRdfDatasetWithAdapters(dataset,{format:'ntriples',runtime})).text.trim().split('\n').sort();
  assert.deepEqual(await lines(back.dataset),await lines(source.dataset));
 }
 for(const file of ['church-directory-cco-extension.ttl','directory-entry-extension.ttl']) {
  const parser=new runtime.N3.Parser();parser.parse(fs.readFileSync(new URL('../docs/ontologies/'+file,import.meta.url),'utf8'));
  for(const [prefix,iri] of Object.entries(parser._prefixes))if(expected[prefix])assert.equal(iri,expected[prefix]);
 }
});
test('Legacy CCO literal values migrate to rdf:value without losing graph identities or data',async()=>{
 const legacyPredicate=C('ont00001761');
 const current=buildRecord({...sample,'Address 1 - Postal Code':'01103'});
 const old=JSON.parse(JSON.stringify(current));old.modelVersion=2;
 for(const n of old.document['@graph'])if(n[P.value]!==undefined){n[legacyPredicate]=n[P.value];delete n[P.value];}
 assert.deepEqual(recordValues(old),recordValues(current));
 const migrated=upgradeRecord(old);
 assert.deepEqual(migrated,current);
 assert.deepEqual(combinedDocument([old]),combinedDocument([current]));
 assert(old.document['@graph'].some(n=>n[legacyPredicate]));
 for(const format of ['jsonld','turtle','ntriples']) {
  const parsed=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument([migrated])),{format:'jsonld',runtime});
  const out=await serializeRdfDatasetWithAdapters(parsed.dataset,{format,runtime});
  const roundtrip=await parseRdfTextWithAdapters(out.text,{format,runtime});
  assert(!roundtrip.quads.some(q=>q.predicate.value===legacyPredicate));
  assert(roundtrip.quads.some(q=>q.predicate.value===P.value&&q.object.value==='01103'));
 }
 delete old.modelVersion;
 assert.deepEqual(recordValues(upgradeRecord(old)),recordValues(current));
});
test('Things, RDF values, role context, dates, nulls, and stable identity',()=>{
 const r=buildRecord(sample),g=r.document['@graph'];assert.equal(recordValues(r).Phone,sample.Phone);
 assert.equal(new Set(g.map(n=>n['@id'])).size,g.length);assert.match(r.id,/^urn:uuid:/);
 assert.equal(r.preserveSource,false);assert(!g.some(n=>n['@type'].includes(C('ont00000853'))&&n[P.value]?.['@value']==='Example Church'));
 assert(g.some(n=>n['@id'].startsWith(NS.dir+'telephone-number/0018885551234')));
 assert(g.every(n=>n[P.label]?.['@value']));
 const person=g.find(n=>n['@type'].includes(C('ont00001262')));assert.equal(person[P.value],undefined);assert.equal(person[P.uses].length,1);assert.equal(person[P.responsible].length,1);assert.equal(person[P.participates].length,2);
 assert(g.find(n=>n['@type'].includes(H('ont00000015')))[P.context]);assert(g.some(n=>n['@type'].includes(A('GivenName'))));
 g.forEach(n=>assert(n['@type'].includes(NAMED_INDIVIDUAL)));
 const edited=buildRecord({...sample,'First Name':'Jane'},r);assert.equal(edited.id,r.id);assert.equal(edited.ids['name:First Name'],r.ids['name:First Name']);
 assert.throws(()=>buildRecord({...sample,Birthday:'2001-02-29'}));assert.throws(()=>buildRecord({...sample,'Church name':''}));
});
test('Manual form records do not emit source-field preservation nodes for modeled values',()=>{
 const record=buildRecord({Name:'Jane Smith','Church name':'Christ Central Buffalo','Membership role':'ont00000015','E-mail':'jane@example.org'});
 const graph=record.document['@graph'];const church=graph.find(n=>n['@type'].includes(H('ont00000102')));
 const churchName=graph.find(n=>n['@id']===church[P.designated][0]['@id']);
 assert.equal(churchName['@type'].includes(C('ont00001014')),true);
 assert.equal(churchName[P.value]['@value'],'Christ Central Buffalo');
 assert(!graph.some(n=>n['@type'].includes(C('ont00000853'))&&n[P.value]?.['@value']==='Christ Central Buffalo'));
 assert(!graph.some(n=>n[P.value]?.['@value']==='Church name'));
 assert.deepEqual(recordValues(record)['Church name'],'Christ Central Buffalo');
});
test('Spreadsheet import preserves raw source columns but skips fields already modeled as graph structure',()=>{
 const values={Name:'Jane Smith',Birthday:'1980-01-15',Phone:'7165551234','E-mail':'jane@example.org','Church name':'Example Church','Membership role':'ont00000015','Address 1 - Street':'93 Huth','Address 1 - City':'Cheektowaga','Address 1 - Region':'NY','Address 1 - Postal Code':'14225',Status:'Communicant',Rec:'Needs review'};
 const result=prepareImport([Object.keys(values),Object.values(values)],true,suggestMapping([Object.keys(values),Object.values(values)],true,'directory'));
 assert.deepEqual(result.errors,[]);
 const graph=result.records[0].document['@graph'];
 const sourceValues=graph.filter(n=>n['@type'].includes(C('ont00000853'))).map(n=>n[P.value]?.['@value']).sort();
 assert.deepEqual(sourceValues,['Communicant','Needs review']);
 for(const value of ['Jane Smith','1980-01-15','7165551234','jane@example.org','Example Church','93 Huth','Cheektowaga','NY','14225'])
  assert(!graph.some(n=>n['@type'].includes(C('ont00000853'))&&n[P.value]?.['@value']===value));
 assert(graph.some(n=>n['@type'].includes(A('PostalLocalityName'))&&n[P.value]?.['@value']==='Cheektowaga'));
 assert(graph.some(n=>n['@type'].includes(A('PostalCode'))&&n[P.value]?.['@value']==='14225'));
 assert(graph.some(n=>n['@type'].includes(C('ont00001237'))));
});
test('Version 4 birth events migrate to CCO Birth without changing IDs or date values',()=>{
 const current=buildRecord(sample), old=JSON.parse(JSON.stringify(current));old.modelVersion=4;
 const birth=old.document['@graph'].find(n=>n['@id']===old.ids['event:Birthday']);
 birth['@type']=birth['@type'].map(type=>type===C('ont00001237')?H('BirthEvent'):type);
 const upgraded=upgradeRecord(old);
 assert.deepEqual(upgraded,current);
 assert.deepEqual(combinedDocument([old]),combinedDocument([current]));
 assert(!JSON.stringify(upgraded.document).includes(H('BirthEvent')));
});
test('Spreadsheet RDF matches the telephone, membership, birthdate, and address diagrams in every format',async()=>{
 const values={Name:'Jane Smith',Phone:'+1-716-555-1234',Birthday:'1/15/1980',Status:'Communicant',
  'Address 1 - Street':'12 Main St','Address 1 - Extended Address':'Apt 4B',
  'Address 1 - City':'Springfield','Address 1 - Region':'MA','Address 1 - Postal Code':'01103','Address 1 - Country':'US'};
 const rows=[Object.keys(values),Object.values(values)];
 const result=prepareImport(rows,true,suggestMapping(rows,true,'directory'),{'Church name':'Example Church'});
 assert.deepEqual(result.errors,[]);const record=result.records[0];
 const parsed=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument(result.records)),{format:'jsonld',runtime});
 const {namedNode,literal}=runtime.N3.DataFactory;const rdfType=namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
 for(const format of ['jsonld','turtle','ntriples']) {
  const output=await serializeRdfDatasetWithAdapters(parsed.dataset,{format,runtime});
  const back=await parseRdfTextWithAdapters(output.text,{format,runtime});const store=new runtime.N3.Store(back.quads);
  const resource=key=>namedNode(record.ids[key]);
  const linked=(s,p,o)=>assert(store.countQuads(resource(s),namedNode(p),resource(o),null),`${format}: ${s} -> ${o}`);
  const typed=(s,type)=>assert(store.countQuads(resource(s),rdfType,namedNode(type),null),`${format}: ${s} type ${type}`);
  linked('person',P.responsible,'Phone:0');typed('Phone:0',C('ont00000059'));
  linked('Phone:0',P.designated,'Phone:identifier:0');typed('Phone:identifier:0',H('TelephoneNumber'));
  assert.equal(record.ids['Phone:identifier:0'],NS.dir+'telephone-number/%2B17165551234');
  assert.equal(record.ids['Phone:0'],NS.dir+'telephone-line/%2B17165551234');
  assert.equal(store.countQuads(null,rdfType,namedNode(C('ont00001247')),null),0);
  typed('person',C('ont00001262'));typed('person',H('ont00000302'));
  linked('person',P.role,'role');typed('role',H('ont00000015'));linked('role',P.context,'church');typed('church',H('ont00000102'));
  linked('person',P.participates,'event:Birthday');typed('event:Birthday',C('ont00001237'));
  linked('event:Birthday',P.time,'day:Birthday');typed('day:Birthday',C('ont00000800'));
  linked('day:Birthday',P.designated,'date:Birthday');typed('date:Birthday',C('ont00000529'));
  assert(store.countQuads(resource('date:Birthday'),namedNode(P.value),literal('1980-01-15',namedNode('http://www.w3.org/2001/XMLSchema#date')),null));
  linked('person',P.resides,'location');
  assert.equal(record.ids['contact-location'],undefined);
  linked('location',P.designated,'address');typed('address',A('PostalAddress'));
  linked('address',P.part,'address:Address 1 - Postal Code');typed('address:Address 1 - Postal Code',A('PostalCode'));
  assert(store.countQuads(resource('address:Address 1 - Postal Code'),namedNode(P.value),literal('01103'),null));
  for(const subject of new Set(back.quads.map(q=>q.subject.value)))assert(store.countQuads(namedNode(subject),rdfType,namedNode(NAMED_INDIVIDUAL),null));
 }
});
test('Membership import needs explicit context and does not classify attenders as members',()=>{
 const rows=[['Name','Status'],['Jane','Communicant']];
 const withoutChurch=prepareImport(rows,true,['Name','Status']);assert.deepEqual(withoutChurch.errors,[]);
 assert(!withoutChurch.records[0].document['@graph'].some(n=>n[P.role]));
 const attender=prepareImport([['Jane','Regular attender']],false,['Name','Membership role'],{'Church name':'Example Church'});
 assert.deepEqual(attender.errors,[]);assert(!attender.records[0].document['@graph'][0]['@type'].includes(H('ont00000302')));
 const missingContext=prepareImport([['Jane','Communicant']],false,['Name','Membership role']);assert(missingContext.errors.length);
 const unknown=prepareImport([['Jane','Pending review']],false,['Name','Status'],{'Church name':'Example Church'});
 assert(!unknown.records[0].document['@graph'].some(n=>n[P.role]));
 const emptyBirth=buildRecord({Name:'Jane',Birthday:''});assert(!emptyBirth.document['@graph'].some(n=>n['@type'].includes(C('ont00001237'))));
});
test('Version 3 device records upgrade telephone and birth relationships with stable identifiers',()=>{
 const original=buildRecord(sample), old=JSON.parse(JSON.stringify(original));old.modelVersion=3;
 const person=old.document['@graph'].find(n=>n['@id']===old.id);
  person['@type']=person['@type'].filter(t=>t!==H('ont00000302'));
 const phone=old.document['@graph'].find(n=>n['@id']===old.ids['Phone:identifier:0']);
 const oldPhoneId='urn:uuid:00000000-0000-4000-8000-000000000098';
 for(const n of old.document['@graph'])for(const refs of Object.values(n))if(Array.isArray(refs))for(const ref of refs)if(ref?.['@id']===phone['@id'])ref['@id']=oldPhoneId;
 phone['@id']=oldPhoneId;phone['@type']=[A('TelephoneNumber'),NAMED_INDIVIDUAL];old.ids['Phone:identifier:0']=oldPhoneId;
 person[P.designated]=person[P.designated]?.filter(ref=>ref['@id']!==phone['@id']) || [];
 old.ids['Phone:0']='urn:uuid:00000000-0000-4000-8000-000000000099';
 person[P.uses].push({'@id':old.ids['Phone:0']});
 old.document['@graph'].push({'@id':old.ids['Phone:0'],'@type':[C('ont00001247'),NAMED_INDIVIDUAL],[P.designated]:[{'@id':phone['@id']}]});
 const birth=old.document['@graph'].find(n=>n['@id']===old.ids['event:Birthday']);birth['@type']=[C('ont00001237'),NAMED_INDIVIDUAL];
 old.document['@graph'].find(n=>n['@id']===old.ids['date:Birthday'])[P.value]['@type']='http://www.w3.org/2001/XMLSchema#string';
 const migrated=upgradeRecord(old);
 assert.deepEqual(migrated.document,original.document);assert.notEqual(migrated.ids['Phone:identifier:0'],old.ids['Phone:identifier:0']);
 assert.equal(migrated.ids['Phone:identifier:0'],NS.dir+'telephone-number/0018885551234');
 assert.deepEqual(combinedDocument([old]),combinedDocument([original]));
});
test('JSON-LD, Turtle and N-Triples preserve exactly the same RDF statements',async()=>{
 const source=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument([buildRecord({...sample,'Address 1 - Street':'12 Main St','Address 1 - City':'Springfield','Address 1 - Region':'MA','Address 1 - Postal Code':'01103'})])),{format:'jsonld',runtime});
 const canonical=async dataset=>(await serializeRdfDatasetWithAdapters(dataset,{format:'ntriples',runtime})).text.trim().split('\n').sort();
 for(const format of ['jsonld','turtle','ntriples']) {const output=await serializeRdfDatasetWithAdapters(source.dataset,{format,runtime});const parsed=await parseRdfTextWithAdapters(output.text,{format,runtime});assert.deepEqual(await canonical(parsed.dataset),await canonical(source.dataset));}
});
test('Structured address columns create individually identified address parts with RDF values',()=>{
 const values={Name:'Jane',Address:'Original address retained as source',...Object.fromEntries(addressFields.map(([field],i)=>[field,['12 Main St','Apt 4B','PO Box 42','Springfield','MA','01103-1234','US'][i]]))};
 const rows=[Object.keys(values),Object.values(values)];
 const imported=prepareImport(rows,true,suggestMapping(rows,true,'google'));assert.deepEqual(imported.errors,[]);
 const record=imported.records[0], graph=record.document['@graph'];
 const address=graph.find(n=>n['@type'].includes(A('PostalAddress')));
 assert.equal(address[P.part].length,7);
 for(const [field,type] of addressFields) {
  const part=graph.find(n=>n['@type'].includes(A(type)));
  assert(part['@type'].includes(NAMED_INDIVIDUAL));assert(address[P.part].some(ref=>ref['@id']===part['@id']));
  assert.equal(part[P.value]['@value'],values[field]);assert.equal(part[P.value]['@type'],'http://www.w3.org/2001/XMLSchema#string');
 }
 assert.equal(recordValues(record).Address,values.Address);
 const edited=buildRecord({...values,'Address 1 - Street':'34 Main St','Address 1 - Extended Address':''},record);
 assert.notEqual(edited.ids.address,record.ids.address);assert.notEqual(edited.ids['address:Address 1 - Street'],record.ids['address:Address 1 - Street']);
 assert.equal(edited.ids['address:Address 1 - Postal Code'],record.ids['address:Address 1 - Postal Code']);
 assert(!edited.document['@graph'].some(n=>n['@type'].includes(A('ExtendedAddressComponent'))));
});
test('Unstructured addresses stay intact; old saved records gain structured parts without changing existing IDs',()=>{
 const raw=buildRecord({Name:'Jane',Address:'12 Main St, Springfield, MA 01103'});
 assert(!raw.document['@graph'].find(n=>n['@type'].includes(A('PostalAddress')))[P.part]);
 const old=buildRecord({Name:'Jane','Address 1 - Street':'12 Main St','Address 1 - Postal Code':'01103'});
 delete old.modelVersion;
 old.document['@graph']=old.document['@graph'].filter(n=>!addressFields.some(([,type])=>n['@type'].includes(A(type))));
 delete old.document['@graph'].find(n=>n['@type'].includes(A('PostalAddress')))[P.part];
 for(const [field] of addressFields)delete old.ids['address:'+field];
 const migrated=upgradeRecord(old);assert.equal(migrated.id,old.id);assert.equal(migrated.ids.address,old.ids.address);
 assert.equal(migrated.document['@graph'].find(n=>n['@type'].includes(A('PostalCode')))[P.value]['@value'],'01103');
 assert.equal(upgradeRecord(migrated),migrated);
 const reloaded=upgradeRecord(JSON.parse(JSON.stringify(migrated)));assert.deepEqual(reloaded.ids,migrated.ids);
});
test('Address ontology adds address classes and the residence property with declared CCO/BFO parents',()=>{
 const {Parser,Store,DataFactory:{namedNode}}=runtime.N3;
 const local=new Store(new Parser().parse(fs.readFileSync(new URL('../docs/ontologies/directory-entry-extension.ttl',import.meta.url),'utf8')));
 const cco=new Store(new Parser().parse(fs.readFileSync(new URL('../docs/ontologies/CommonCoreOntologiesMerged.ttl',import.meta.url),'utf8')));
 const rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#',owl='http://www.w3.org/2002/07/owl#',rdfs='http://www.w3.org/2000/01/rdf-schema#';
 assert.equal(local.getQuads(null,namedNode(rdf+'type'),namedNode(owl+'ObjectProperty'),null).length,1);
 assert.equal(local.getQuads(null,namedNode(rdf+'type'),namedNode(owl+'DatatypeProperty'),null).length,0);
 for(const type of ['PostalAddress',...addressFields.map(([,type])=>type)]) {
  const subject=namedNode(A(type));const parents=local.getQuads(subject,namedNode(rdfs+'subClassOf'),null,null);
  assert.equal(parents.length,1);assert(cco.countQuads(parents[0].object,namedNode(rdf+'type'),namedNode(owl+'Class'),null));
  assert.deepEqual(local.getQuads(subject,namedNode(rdfs+'label'),null,null).map(q=>q.object.language).sort(),['de','en','es','fr']);
 }
 assert.equal(local.getQuads(namedNode(A('PostalAddress')),namedNode(rdfs+'subClassOf'),null,null)[0].object.value,C('ont00000686'));
 assert.equal(local.getQuads(namedNode(A('residesIn')),namedNode(rdfs+'domain'),null,null)[0].object.value,C('ont00001262'));
 assert.equal(local.getQuads(namedNode(A('residesIn')),namedNode(rdfs+'range'),null,null)[0].object.value,B('BFO_0000029'));
});
test('Previously saved single-type records remain readable and export named individual declarations',()=>{
 const legacy=buildRecord(sample);
 legacy.document['@graph'].forEach(n=>{n['@type']=n['@type'][0];});
 assert.equal(recordValues(legacy).Phone,sample.Phone);
 const exported=combinedDocument([legacy]);
 exported['@graph'].forEach((n,i)=>assert.deepEqual(n['@type'],[legacy.document['@graph'][i]['@type'],NAMED_INDIVIDUAL]));
 assert.equal(typeof legacy.document['@graph'][0]['@type'],'string');
});
test('CSV and TSV quotes, BOM, headers, no headers, invalid dates and duplicate mappings',()=>{
 const rows=readDelimited('\uFEFFName,Phone,Notes\r\n"Smith, John",00123,"a\n""b"""\r\n');const mapping=suggestMapping(rows,true,'directory');const imported=prepareImport(rows,true,mapping);assert.deepEqual(imported.errors,[]);assert.equal(recordValues(imported.records[0]).Notes,'a\n"b"');assert.equal(recordValues(imported.records[0]).Phone,'00123');
 const noHeader=readDelimited('Jane Smith\t1/2/2000\t12 Main\t001234\tjane@example.org');const r=prepareImport(noHeader,false,suggestMapping(noHeader,false,'directory'));assert.equal(recordValues(r.records[0]).Birthday,'2000-01-02');
 assert.throws(()=>prepareImport(rows,true,['Name','Name']));assert(prepareImport([['Jane','2020-02-30']],false,['Name','Birthday']).errors.length);
});
test('Both XLSX and XLS support sheet choice, Excel dates, and formatted identifiers',()=>{
 for(const bookType of ['xlsx','biff8']) {
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Name'],['Wrong worksheet']]),'Ignore');
  const sheet=XLSX.utils.aoa_to_sheet([['Name','Birthday','Phone'],['Jane',36526,123]]);sheet.B2.z='m/d/yyyy';sheet.C2.z='000000';XLSX.utils.book_append_sheet(book,sheet,'People');
  const loaded=XLSX.read(XLSX.write(book,{type:'array',bookType}),{type:'array',cellNF:true});const rows=sheetRows(loaded,'People',XLSX);assert.equal(rows[1][1],'2000-01-01');assert.equal(rows[1][2],'000123');const p=prepareImport(rows,true,suggestMapping(rows,true,'directory'));assert.equal(p.errors.length,0);assert.equal(recordValues(p.records[0]).Name,'Jane');
 }
});
