import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { buildRecord, recordValues, combinedDocument, P, C, A, H } from '../docs/app/model.js';
import { readDelimited, sheetRows, suggestMapping, prepareImport } from '../docs/app/import.js';
import { parseRdfTextWithAdapters, serializeRdfDatasetWithAdapters } from '../docs/packages/rdf-io/src/index.js';
const require=createRequire(import.meta.url);
globalThis.window=globalThis;
globalThis.self=globalThis;
const runtime={N3:require('../docs/vendor/n3.min.js'),jsonld:require('../docs/vendor/jsonld.min.js')};
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../docs/vendor/xlsx.full.min.js',import.meta.url),'utf8'),context);const XLSX=context.XLSX;
const sample={'First Name':'John','Last Name':'Smith',Phone:'0018885551234','E-mail':'john@example.org',Address:'12 Main St',Birthday:'2000-02-29','Church name':'Example Church','Membership role':'ont00000015','Baptism date':'2020-01-01','Transferred date':'',Notes:'Line one\n"quoted" & <markup>'};
test('Things, tokenizations, role context, dates, nulls, and stable identity',()=>{
 const r=buildRecord(sample),g=r.document['@graph'];assert.equal(recordValues(r).Phone,sample.Phone);
 assert.equal(new Set(g.map(n=>n['@id'])).size,g.length);g.forEach(n=>assert.match(n['@id'],/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
 const person=g.find(n=>n['@type']===C('ont00001262'));assert.equal(person[P.token],undefined);assert.equal(person[P.uses].length,2);assert.equal(person[P.participates].length,2);
 assert(g.find(n=>n['@type']===H('ont00000015'))[P.context]);assert(g.some(n=>n['@type']===A('GivenName')));
 const edited=buildRecord({...sample,'First Name':'Jane'},r);assert.equal(edited.id,r.id);assert.equal(edited.ids['name:First Name'],r.ids['name:First Name']);
 assert.throws(()=>buildRecord({...sample,Birthday:'2001-02-29'}));assert.throws(()=>buildRecord({...sample,'Church name':''}));
});
test('JSON-LD, Turtle and N-Triples preserve exactly the same RDF statements',async()=>{
 const source=await parseRdfTextWithAdapters(JSON.stringify(combinedDocument([buildRecord(sample)])),{format:'jsonld',runtime});
 const canonical=async dataset=>(await serializeRdfDatasetWithAdapters(dataset,{format:'ntriples',runtime})).text.trim().split('\n').sort();
 for(const format of ['jsonld','turtle','ntriples']) {const output=await serializeRdfDatasetWithAdapters(source.dataset,{format,runtime});const parsed=await parseRdfTextWithAdapters(output.text,{format,runtime});assert.deepEqual(await canonical(parsed.dataset),await canonical(source.dataset));}
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
