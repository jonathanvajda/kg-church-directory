# Structured postal addresses

Checked 2026-09-14. No suitable postal-address component vocabulary importing CCO 2.x was verified in the following public extension sources. This is a bounded search, not a claim that no such ontology exists anywhere.

| Source inspected | Findings | Reuse decision |
| --- | --- | --- |
| [My Data Ontology](https://github.com/CommonCoreOntology/my-data-ontology/blob/f146e0bb2baf68fbe5fb2f09539edac65557d904/MyDataOntology.ttl) | Published module identifies itself as version 2022-05-18. It contains PostalCode, PostalZone, TelephoneNumber and EmailAddress, using the legacy `ontologyrepository.com/CommonCoreOntologies/` vocabulary. PostalZone is modeled as a geopolitical entity. | Not a CCO 2.x import. Do not import its old logical closure into this CCO 2.2 application or equate all postal regions with governmental regions. |
| [Cyber Ontology snapshot](https://github.com/systems-praxis/seamless-digital-engineering-ontology/blob/main/CyberOntology-develop.owl) | Snapshot identifies version 2024-04-17 and explicitly says compatible with CCO 1.5. It imports AllCoreOntology and defines IP/MAC address terms, but no postal-address terms were found. | Does not establish a suitable CCO 2.x postal vocabulary. |
| [IEEE Cyber releases](https://opensource.ieee.org/cyber-ontology-working-group/cyber-ontology-releases) | Canonical repository identified through the consuming project's `.gitmodules`. Direct website retrieval failed; its API returned HTTP 418. | Current release contents could not be verified; do not claim the accessible snapshot is the latest release. |
| [Towards a Cyber Information Ontology](https://github.com/CommonCoreOntology/TowardsACyberInformationOntology/blob/2ec37e50072da0952811cd1f8ee1233c5050c894/TACIO.ttl) | Version 0.2 imports legacy `ontologyrepository.com/CommonCoreOntologies/Mid/AllCoreOntology`; no postal-address classes found. | Does not meet the CCO 2.x requirement. |

The bundled CCO 2.2 already contains Email Address (`ont00002070`), Email Box (`ont00000906`), and Telecommunication Endpoint (`ont00001247`). The address revision did not change telephone/email patterns. The later model-version-4 tutorial alignment uses a direct telephone contact designator; email still uses CCO Email Box and Email Address.

## Local class extension

`directory-entry-extension.ttl` explicitly imports the bundled CCO 2.2 version IRI as well as the church extension. `catalog-v001.xml` maps both CCO import forms and the local ontology IRIs to bundled files for ontology editors with XML catalog support. No network resolution is performed by the webpage.

PostalAddress now specializes **Designative Information Content Entity**, not Spatial Region Identifier. The address designates a contact Geospatial Region, which is a BFO **site** in the bundled CCO. This avoids using a subclass whose defining restriction requires a distinct BFO spatial-region referent.

An address has continuant parts that are information entities: StreetAddressComponent (street plus number), ExtendedAddressComponent, PostalLocalityName, AdministrativeAreaDesignator, PostalCode, CountryDesignator, and PostOfficeBoxIdentifier. Each reusable address designator or identifier has a deterministic IRI generated from its normalized `rdf:value`, its domain class, `owl:NamedIndividual`, and an `rdf:value` string literal. The postal and box codes specialize CCO Code Identifier; the locality name specializes Designative Name; the remaining designators specialize Designative Information Content Entity. New classes have English/German/Spanish/French labels, English definitions, examples, and bibliographic citations.

The extension now adds one object property, `entry:residesIn`, with domain CCO Person (`ont00001262`) and range BFO Site (`BFO_0000029`). Its intended semantics are that the relation holds when the person is agent in some act of residing and that act of residing occurs at that site. The app uses CCO Geospatial Region (`ont00000472`) for the residence site, which is already a subclass of BFO Site in the bundled CCO.

City/state/ZIP tokens are not automatically resolved into municipal or administrative entities. A postal locality may differ from an incorporated city, and a postal code may identify a route, delivery point, or recipient rather than a governmental region. Future identity resolution can connect the designators to verified referents using existing CCO properties.

## Application behavior

The original Google Contacts address-column names remain the import and storage keys. The main form exposes them with readable labels. An input full-address string stays intact as source information. When structured components are supplied, they determine the address's aggregate display token; the original string is still preserved independently. The aggregate token is a readable comma-separated summary, not a country-specific mailing-label formatter.

No parser guesses components from an unstructured address. Only populated fields create part entities; postal-code punctuation and leading zeros remain strings. Components keep stable deterministic IRIs while their scoped values remain the same, and clearing a component removes its assertions from the current graph.

Device records saved by earlier versions are rebuilt from their preserved source fields when loaded. Context-bound entities retain UUID identity; reusable identifier and designator nodes move to deterministic IRIs when lexical equality is the intended join rule. The upgraded record is saved back when device storage is enabled, so its new IDs remain stable across reloads. Already downloaded files are unchanged and should be exported again after upgrading.

## Literal-value predicate update

The application now uses rdf:value for every information-content literal, including names, address parts, date identifiers, contact identifiers, and preserved source fields. Classes and object properties carry the domain semantics. No global rdf:value domain or range is imposed. Model version 3 migrates version-2 records by replacing the predicate without changing lexical values; older records also receive the structured-address upgrade. Exports normalize legacy value predicates as well. See `../tutorials/person-has-address.mmd` for the complete address pattern.

Model version 4 subsequently aligned telephone, membership, and birth patterns with the other tutorials. Date identifiers now use xsd:date with rdf:value. Address part values remain xsd:string, and their component structure is unchanged.

Model version 11 changes the telephone pattern to person -- is normatively responsible for -- CCO Telephone Line -- designated by -- church TelephoneNumber, and changes the address pattern to person -- resides in -- residence Geospatial Region -- designated by -- PostalAddress. It also adopts deterministic `dir:` IRIs for identifiers and designators whose normalized lexical values should join across rows, including telephone numbers, email addresses, postal addresses, and postal components. Persons, events, roles, source field observations, source field key identifiers, and geospatial regions remain UUID-addressed because matching their labels or values is not enough to establish identity. Manual form saves do not emit spreadsheet source-field preservation nodes, and imports preserve only raw spreadsheet fields that are not already modeled as graph structure.

CCO includes City (`ont00000887`) and State (`ont00000934`) classes, but the current application still treats spreadsheet city/state cells as postal address information entities, not as resolved geopolitical entities. A postal locality string such as Cheektowaga may be enough to create a PostalLocalityName, but it is not enough by itself to assert a particular CCO City individual unless the app also performs authoritative place resolution.
