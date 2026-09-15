# kg-church-directory
A static, browser-based church directory using a knowledge graph backed by an ontology.

The complete application lives in `docs/`. No npm, build step, Node.js, backend, or external CDN is required to run or deploy it. All JavaScript libraries, CSS, and ontologies are included locally. Imports, editing, and RDF export run entirely in the browser.

## Run locally

From the repository root, with Python installed:

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory docs
```

Open `http://localhost:8080`. On Windows, `py` can replace `python`. Any static HTTP server works; Python is only one convenient option. Once the repository is on your machine, internet access is not required. Use localhost or HTTPS for UUID generation. Opening `index.html` directly via `file://` is not supported because the application uses JavaScript modules.

## Deploy to GitHub Pages

Push the repository to GitHub, then open **Settings → Pages**:

1. Choose **Deploy from a branch** as the source.
2. Select the branch containing this application and the **/docs** folder.
3. Save and open the URL GitHub reports when deployment completes.

GitHub serves `docs/` directly; no custom Actions workflow or package installation is needed. `docs/.nojekyll` disables Jekyll processing. Asset and module URLs are relative, so the page works under a project path such as `/kg-church-directory/` as well as at the localhost root.

Localhost and GitHub Pages have separate browser storage. The application does not upload directory records to GitHub. The earlier Sites deployment is separate from this setup; its local build and hosting configuration have been removed.

## Optional developer checks

The integration tests use Node.js directly and the already bundled libraries, without npm or dependency installation:

```powershell
node --test tests/directory.test.mjs
```

Node.js is needed only for these developer tests, not for running the application.

## Using the page

- Add or edit a person with names, address, phone, email, membership role and church context, birth, baptism, admission, and optional transfer dates. Expand the form for every field in both supplied spreadsheet layouts.
- Import CSV/TSV/XLSX/XLS, select a worksheet, toggle the first-row header option, and review column mappings and sample cells. Without headers, select either supplied layout. Validate before committing; invalid rows block the entire batch. Dates accept ISO dates or explicitly US-style M/D/YYYY. Partial birthdays and ambiguous administrative text are not inferred as dated events.
- Export the whole graph as JSON-LD, Turtle, or N-Triples. All formats go through the reusable `rdf-io` adapters using the supplied jsonld.js and N3.js.
- Records live in memory unless “Save on this device” is enabled. That setting stores canonical record graphs in localStorage. Download RDF for a portable copy. This is a single-browser proof of concept, not a shared database or quadstore client. RDF reimport, identity reconciliation, and multi-user synchronization are not yet implemented.

The page reuses `tabular-io`, `browser-file-io`, `rdf-io` and their dependencies, plus normalize, Skeleton, and app-base CSS. SheetJS handles the binary workbook preflight because `tabular-io` intentionally handles delimited text only. No user records are sent to a server.

## Modeling decisions

`docs/app/model.js` uses the actual numeric IRIs in the bundled CCO/BFO and church ontologies. `docs/ontologies/directory-entry-extension.ttl` adds only classes for name components, postal and telephone identifiers, and source information. Load all three Turtle ontologies together; offline consumers should resolve ontology imports to these local files.

- Prefixes are derived from `docs/packages/namespace-registry`: current CCO uses `cco2:` (`https://www.commoncoreontologies.org/`), OBO uses `obo:` (`http://purl.obolibrary.org/obo/`), and BFO uses the narrower registry stem `bfo:` (`http://purl.obolibrary.org/obo/BFO_`). The two OBO forms preserve the same IRIs, so `obo:BFO_0000056` and `bfo:0000056` identify the same property. Project classes remain in `church:` and `app:`. The external cco-d-acts relation uses `ccodacts:`, and generated deterministic resources use `dir:`.
- Context-bound instances, including persons, imported source field observations, source field key identifiers, roles, church organizations, residence geospatial regions, events, days, proper names, name components, and nicknames, have UUID v4 `urn:uuid:` IRIs. Identity-bearing identifiers and designators whose equality should intentionally join records use deterministic `dir:` IRIs derived from normalized `rdf:value` text. This includes telephone numbers and lines, email addresses and boxes, postal addresses, and postal address parts such as city/locality, state/region, postal code, and country. Postal parts are scoped by available country/region/address context so a bare repeated value such as Springfield or 12 Main St does not automatically merge unrelated places. The rule is deliberately conservative: deterministic IRIs are used only where normalized lexical equality within the chosen scope is the desired join rule; people, source-column observations, source-column key labels, residence sites, and events still require contextual identity.
- Names are CCO Proper Names. A contact spreadsheet does not establish a name's legal status, so the page does not automatically assert Legal Name. First/middle/family names and prefixes/suffixes are designated-name components connected with BFO has continuant part. A future verified-legal-name field can specialize Proper Name as Legal Name without changing this structure.
- Telephone numbers follow the telephone tutorial: person ? is normatively responsible for ? CCO Telephone Line ? designated by ? church:TelephoneNumber ? rdf:value ? string. The responsibility relation is `ccodacts:ont00000022`. The email pattern remains person ? uses ? Email Box ? designated by ? CCO Email Address ? rdf:value. The legacy app:TelephoneNumber class is retained for older data but is no longer emitted.
- A person resides in a residence Geospatial Region via `app:residesIn`, whose domain is CCO Person and range is BFO Site. PostalAddress specializes CCO Designative Information Content Entity and designates that residence site. Each populated street/number, apartment/suite, PO box, postal-locality, state/region, postal-code, and country field creates a separate information entity linked from the address by has continuant part. Address and address-part identifiers use deterministic `dir:` IRIs scoped by their address context, plus their class, owl:NamedIndividual, and an rdf:value string literal. Free text is not automatically split, and postal names/codes are not automatically resolved to municipalities. Family entities, shared buildings, pastoral assignments, and authoritative place resolution are future structured workflows; raw relation/elder fields are preserved without guessing their referents. See [address model decisions and extension research](docs/ontologies/address-model-decisions.md).
- The person bears a selected role; that role has organizational context a Local Church Organization. Church-member roles also explicitly type the person as Church Member (ont00000302); regular attenders and other non-membership roles do not receive that type. Current role and historical admission/transfer events are independent assertions: recording a transfer date does not automatically revoke a role. The proof of concept allows one selected role per record.
- Birth, baptism, admission, and transfer follow person → participates in → event → occupies temporal region → Day → designated by → Date Identifier → rdf:value → ISO date string. CCO Date Identifier identifies the day; its rdf:value is `xsd:date`. Birth events use CCO Birth (`ont00001237`) directly. Raw source fields retain string values. Empty dates create no triples, which expresses lack of an assertion, not proof that the event never occurred.
- All application information-content literals use RDF `rdf:value` (`http://www.w3.org/1999/02/22-rdf-syntax-ns#value`). Domain meaning comes from the classes and object-property relationships; no global domain or range is added to rdf:value. Saved records using CCO `ont00001761` are migrated to rdf:value with their IDs and values preserved. The bundled CCO import and historical design notes remain unchanged.
- Raw spreadsheet-only fields remain CCO Descriptive Information Content Entities, designated by Code Identifiers naming the fields. Fields that already generate modeled graph structure, including name, phone, email, address components, church, role, and date fields, are not duplicated as source-field preservation nodes. Manual form saves do not emit source-field preservation nodes. This keeps the exported graph focused on the modeled domain assertions while still allowing imports to preserve raw administrative columns such as `Status`, `Rec`, `Testimony`, `Transfer/Dismissal`, labels, or a relative's name without guessing their referents. Ignored columns are explicitly excluded. Phone/postal identifiers retain lexical values and Excel display formatting where present; digits already lost in the source spreadsheet cannot be recovered.
- Generated named individuals receive an `rdfs:label`. When an individual has an `rdf:value`, the label normally uses that value; otherwise it uses a useful class-derived label or a contextual label such as the person's display name.

## Images in a quadstore

RDF supports `xsd:base64Binary` literals ([W3C RDF 1.1](https://www.w3.org/TR/rdf-concepts/#section-Datatypes)). For directory photos, prefer keeping image bytes in protected file/object storage and representing the image information entity, its subject, and its retrievable identifier in RDF. This keeps large binary payloads out of normal graph queries and exports. An image information entity can be about the person via CCO is about; distinguish the image content from its stored file and use identifiers for the file location. Embedded base64 is possible when a self-contained graph is essential, but needs a deliberate binary-content property/model; rdf:value can carry a typed binary literal on the appropriately modeled information entity. Image upload/storage is not part of this first page.

## Spreadsheet patterns and tutorial alignment

The four `docs/tutorials/person-*.mmd` instance diagrams guide the application model. Instance relationships and explicit instance types are emitted; class-to-class illustrative object-property arrows in the older diagrams are not emitted as assertions about classes. The declared ontology supplies the class hierarchy. Every output instance remains an owl:NamedIndividual; contextual entities use UUID IRIs and selected reusable identifiers use deterministic `dir:` IRIs.

Import accepts optional default church and membership role values. Mapped row values take precedence. The Membership role column accepts role IDs or the displayed role names, plus Member, Communicant, and Non-communicant. A recognized Status becomes a role only when the row or import defaults supply a church. Unknown status text remains source information; an explicitly selected default role applies when no row role is recognized. An explicit role without a church is a validation error. This avoids silently assigning every imported person to a church or membership class.

Model version 11 rebuilds earlier device records from preserved source fields or stored form values. Obsolete synthetic telephone endpoints and contact-location description bridges are omitted, the phone relationship is rebuilt with cco-d-acts normative responsibility, address relationships use `app:residesIn`, reusable phone/email/postal identifier and designator nodes receive deterministic IRIs, source field key identifiers remain record-local, modeled import fields are no longer duplicated as source-field preservation nodes, Church Member typing is added where appropriate, date identifier values become xsd:date, and saved JSON-LD contexts move to the shared namespace registry aliases. Previously downloaded RDF files should be exported again. The application remains static and requires no npm or server-side conversion.

Version 11 also replaces the redundant church:BirthEvent type in saved records with CCO Birth, preserving event and date identifiers. The birth-date tutorial uses the same CCO class.
