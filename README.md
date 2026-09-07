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

- Every instance, including each field value, identifier, role, church organization, endpoint, event, and day, has a UUID v4 `urn:uuid:` IRI. Person and retained component identities survive edits and device reloads. Separate imported records are not merged merely because their names or churches match.
- Names are CCO Proper Names. A contact spreadsheet does not establish a name's legal status, so the page does not automatically assert Legal Name. First/middle/family names and prefixes/suffixes are designated-name components connected with BFO has continuant part. A future verified-legal-name field can specialize Proper Name as Legal Name without changing this structure.
- A person uses a Telecommunication Endpoint designated by a Telephone Number Identifier, and uses an Email Box designated by an Email Address. The imported CCO does not declare a direct `owns` property. Actual ownership would need an Act of Ownership with appropriate participants, or a reviewed external relation; contact data alone does not establish ownership.
- Postal addresses designate contact Geospatial Regions. A Contact Location Description is about the person and the region. It does not infer residential occupancy, a particular building, or ownership. Family entities, shared buildings, and pastoral assignments are future structured workflows; raw relation/elder fields are preserved without guessing their referents.
- The person bears a selected role; that role has organizational context a Local Church Organization. Current role and historical admission/transfer events are independent assertions: recording a transfer date does not automatically revoke a role. The proof of concept allows one selected role per record.
- Birth, baptism, admission, and transfer follow person → participates in → event → occupies temporal region → Day → designated by → Date Identifier → is tokenized by → ISO date string. CCO Date Identifier identifies the day; its token is `xsd:string`. Empty dates create no triples, which expresses lack of an assertion, not proof that the event never occurred.
- CCO `ont00001761` (“is tokenized by”) is an **annotation property**, not a datatype property, in this import. RDF preserves and queries it, but OWL datatype restrictions will not enforce its values. The old church ontology comment still illustrates deprecated `has text value`; the application follows the later tokenization decision without changing imported axioms.
- Original mapped fields remain Source Field Value information entities, designated by Code Identifiers naming the fields. This makes every supplied field editable and exportable without turning `Status`, `Rec`, `Testimony`, `Transfer/Dismissal`, labels, or a relative's name into unsupported role/process/person assertions. Ignored columns are explicitly excluded. Phone/postal identifiers retain lexical values and Excel display formatting where present; digits already lost in the source spreadsheet cannot be recovered.

## Images in a quadstore

RDF supports `xsd:base64Binary` literals ([W3C RDF 1.1](https://www.w3.org/TR/rdf-concepts/#section-Datatypes)). For directory photos, prefer keeping image bytes in protected file/object storage and representing the image information entity, its subject, and its retrievable identifier in RDF. This keeps large binary payloads out of normal graph queries and exports. An image information entity can be about the person via CCO is about; distinguish the image content from its stored file and use identifiers for the file location. Embedded base64 is possible when a self-contained graph is essential, but needs a deliberate binary-content property/model; do not assume CCO is tokenized by is the right binary payload relation. Image upload/storage is not part of this first page.
