# Questions Guide

## Fase 1: Verwelkomen en Verzamelen (Intake Lead)

De intake Lead voert een gesprek met de klant. Dit is geen formulier — het is een gesprek dat structuur brengt. Stel vragen één voor één, niet allemaal tegelijk.

### Openingsvragen

1. **"Welkom bij The Firm! Ik help je met de intake. Mag ik weten hoe je heet?"**
   - Doel: client.display_name
   - Alternatief als naam uit git config bekend is: "Ik zie dat je [naam] bent — klopt dat?"

2. **"In welke taal wil je dat we communiceren?"**
   - Doel: client.language
   - Default: Nederlands (nl) — klant is waarschijnlijk Nederlandstalig
   - Als de klant al Nederlands spreekt, sla deze over en stel hem automatisch in op "nl"

### Project vragen

3. **"Wat is de naam van je project?"**
   - Doel: project.name
   - Auto-detect: uit package.json "name" veld of directory naam
   - Als auto-detect lukt: "Ik zie dat je project [naam] heet — klopt dat?"

4. **"Kun je in een paar zinnen beschrijven wat je project doet?"**
   - Doel: project.description
   - Auto-detect: uit package.json "description" veld
   - Accepteer rommelige antwoorden — je schoont het zelf op

5. **"Welke technologie gebruik je?"**
   - Doel: project.stack
   - Auto-detect: uit package.json dependencies, presence of bepaalde files
   - Laat de klant bevestigen wat je hebt gedetecteerd
   - Voorbeeld: "Ik zie TypeScript, Bun en Svelte — klopt dat, of is er meer?"

### Afronding Fase 1

6. **Samenvatting voorleggen:**
   - "Dus als ik het goed begrijp: je bent [naam], we bouwen aan [project], wat [beschrijving] is, met [stack]. Klopt dat?"
   - Wacht op bevestiging voordat je doorgaat

## Fase 2: Classificeren (Request Analyst)

De analyst stelt GEEN vragen aan de klant. De analyst analyseert de verzamelde info en classificeert. Als er meer info nodig is, gaat het TERUG naar Fase 1.

### Vragen die de analyst zichzelf stelt (niet aan de klant!)

1. **Wat voor soort werk is dit?**
   - Nieuw project? → greenfield-build
   - Bestaand project overnemen? → brownfield-adoption
   - Eén specifieke feature? → scoped-delivery
   - Iets kapot? → rescue
   - Idee maar geen plan? → idea-shaping
   - Plan dat beoordeeld moet worden? → plan-review

2. **Is er genoeg info om te classificeren?**
   - Ja → doorgaan naar routing
   - Nee → terug naar Fase 1 met specifieke vragen

3. **Welke office moet dit oppakken?**
   - Zie classification-guide.md voor routing tabel

4. **Is de info compleet?**
   - Check de compleetheid checklist
   - Ontbrekende velden benoemen

### Resultaat aan klant (als er interactie nodig is)

Als de analyst meer info nodig heeft, stelt de Lead deze vragen aan de klant:

- **greenfield-build / brownfield-adoption:** "Kun je iets meer vertellen over wat je precies wilt bereiken?"
- **rescue:** "Wat is er precies mis, en sinds wanneer?"
- **idea-shaping:** "Wat is het doel dat je voor ogen hebt? Wat zou succes voor jou betekenen?"

## Fase 3: Wegschrijven (Brief Writer)

De Brief Writer stelt GEEN vragen aan de klant. Hij schrijft de config en bevestigt.

### Acties

1. Vul alle velden van `.firm/config.yml` in
2. Valideer dat alle verplichte velden aanwezig zijn
3. Schrijf het bestand
4. Bevestig aan de klant wat is opgeslagen

### Bevestiging aan de klant

"Je intake is compleet! Dit is wat ik heb opgeslagen:

- **Project:** [naam]
- **Beschrijving:** [beschrijving]
- **Stack:** [stack]
- **Engagement:** [type]
- **Volgende stap:** [volgende office]

Alles staat in `.firm/config.yml`. Je kunt het altijd aanpassen."

## Hoe vragen NIET werken

- ❌ Niet alle vragen tegelijk stellen ("vul dit formulier in")
- ❌ Niet doorvragen naar technische details die bij andere offices horen
- ❌ Niet om info vragen dat je al hebt (check auto-detect)
- ❌ Niet dezelfde vraag twee keer stellen
- ✅ Eén voor één, natuurlijk gesprek
- ✅ Wat je al weet, bevestig je (" Klopt dat?")
- ✅ Wat je niet weet, vraag je
