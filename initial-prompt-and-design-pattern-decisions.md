I am trying to organize membership for my church directory. I need to keep track of not just first last and preferred names, addresses, phones, and emails, but also things like their birthdate, when they became a member, when they were baptized, when they were dismissed, whether the membership is communicant vs non-communicant, this is their home church or they are an associate, who is their pastor assigned to them. I also need to keep track of regular attenders.

I like the idea of using a knowledge graph (where people, places, and events are not 'strings' but things, related to each other).

I want to use the Common Core Ontologies.

I want to refrain from adding any object properties and data properties.

As for classes, I know I will need to add role classes:
Ruling Elder Role
Teaching Elder Role
Senior Pastor Role
Associate Pastor Role
Assistant Pastor Role
Pastoral Intern Role
Candidate Under Care of Presbytery Role
Deacon Role
Assistant to Deacons Role
Church Member Role
Communicant Member Role
Non-communicant Member Role
Censured Role
Excommunicated Role

Organization classes:
Church (Organization)
Session
Presbytery
Classis
Synod
Diocese
Parish
Episcopate
Bishopric
Diaconate

Event classes:
(Act of) Ordination Examination
(Act of) Officer Ordination
(Act of) Officer Installation
Baptism
Eucharist aka Communion aka Lord's Supper
(Act of) Member Induction
(Act of) Religious Confirmation
(Act of) Membership Transfer
(Act of) Member Dismissal
(Act of) Censure
Worship Service
Session Meeting
Presbytery Meeting
General Assembly Meeting

Some design patterns:

the 'pastor' class is an equivalence class 'Person' (https://www.commoncoreontologies.org/ont00001262) and bearer of some 'Pastor Role'. Likewise, the 'church member' class is an equivalence class of 'Person' and bearer of some 'Church Member Role', and that instance of role 'has organizational context' (https://www.commoncoreontologies.org/ont00001992) some 'Church Organization' (not https://www.commoncoreontologies.org/ont00000032 since that is a facility)

To say that a person was baptized on a certain date like Jan 1, 2000 is equivalent to this design pattern, whose instances fall under these classes and relations: person (https://www.commoncoreontologies.org/ont00001262) participates in (http://purl.obolibrary.org/obo/BFO_0000056) baptism, baptism occupies temporal region (http://purl.obolibrary.org/obo/BFO_0000199) day (https://www.commoncoreontologies.org/ont00000800), day designated by (https://www.commoncoreontologies.org/ont00001879) date identifier (https://www.commoncoreontologies.org/ont00000529), date identifier has text value (https://www.commoncoreontologies.org/ont00001765) [literal value].
In saying this, I am relaxing the axiom that 'has text value' rdfs:domain some information bearing entity, and instead the rdfs:domain is any BFO continuant.

Let's start there.

Make me a turtle file that includes all these classes and some others that are obvious omissions on my part.

Also every class must have a unique, unambiguous rdfs:label with an english language tag, german language tag, spanish, and french language tag. Every class must have a unique, unambiguous skos:definition that asserts the necessary and sufficient conditions by using a genus-species/Aristotelian definition form (e.g., 'Communicant Church Member' skos:definition 'A Church Member that is authorized to participate in regular sacraments such as communion.' or something like that).

Every class needs to have exactly one rdfs:subClassOf assertion to a bona-fide class. E.g., subclassof owl:Restriction doesn't count.

Every class needs to have a proper citation using dcterms:bibliographicCitation. Use Wikipedia, the PCA book of church order, or other well known documents if you have to.

Every class needs an example using skos:example. Try to use famous, real examples wherever practical.

---

Yes—that is a good way to preserve your **no-new-properties** constraint, assuming you are comfortable treating the literal as a tokenization of the information entity rather than merely an arbitrary value.

The pattern would be conceptually:

```turtle
:johnsPreferredName
    a cco:Name ;
    cco:is_tokenized_by "John" .
```

and similarly:

```turtle
:johnsEmailAddress
    a cco:EmailAddressIdentifier ;
    cco:is_tokenized_by "john@example.org" .
```

That is considerably closer to what you want than continuing to depend on deprecated `has text value`: the literal is being treated as the RDF lexical token by which the information entity is concretely represented.

I would use it consistently with a three-layer pattern:

```text
Person / event / organization
        │
        │ designated by / described by / etc.
        ▼
Information Content Entity / Identifier
        │
        │ is tokenized by
        ▼
      literal
```

So, for example, I would **not** normally do this:

```turtle
:john
    cco:is_tokenized_by "John Smith" .
```

Instead:

```turtle
:john
    cco:is_designated_by :johnName .

:johnName
    a cco:Name ;
    cco:is_tokenized_by "John Smith" .
```

That preserves the distinction you care about: **John is a person, his name is an entity, and `"John Smith"` is the lexical tokenization of that name.**

This also makes your church-directory model rather elegant. Birth dates, baptism dates, membership dates, names, phone numbers, email addresses, and perhaps postal-address components can all remain modeled as entities, with literals pushed out to the very edge of the graph through `is tokenized by`.

I would therefore revise the ontology we started so that its canonical literal pattern is **`is tokenized by` rather than `has text value`**.
