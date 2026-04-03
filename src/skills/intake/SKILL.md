---
name: intake
description: "Voert intake uit voor The Firm. Verwelkomt de klant, stelt vragen één voor één, classificeert het engagement, en slaat de configuratie op in .pi/firm/config.json. Start met /tf-intake of wanneer een klant een intake wil starten."
allowed-tools: Bash Read Write Edit
---

# Intake — The Firm

De intake skill begeleidt een klant door het intake proces van The Firm. Het is een **conversationeel proces** in drie fases, niet een formulier.

## Wanneer deze skill gebruiken

Gebruik deze skill wanneer:
- De klant `/tf-intake` start
- De klant aangeeft een nieuw project te willen beginnen met The Firm
- Er nog geen `.pi/firm/config.json` bestaat
- De klant vraagt "ik wil starten met The Firm"

Gebruik deze skill NIET wanneer:
- `.pi/firm/config.json` al bestaat en compleet is → toon status, vraag of klant iets wil bijwerken
- De klant een specifieke taak wil uitvoeren die al geclassificeerd is → routeer naar juiste office
- Het gaat om backlog distillation of multi-workstream routing → gebruik `backlog-distillation`

## Drie fases

De intake kent drie fases. **Je voert ze altijd in volgorde uit.** Je slaat niets over.

```
Fase 1: Verwelkomen en Verzamelen (Lead)
  → klant praat, jij luistert en vraagt door
  → verzamelt: naam, taal, project info, stack
  ↓
Fase 2: Classificeren (Analyst)
  → jij analyseert wat je hebt verzameld
  → bepaalt: engagement type, routing, compleetheid
  → als incompleet: terug naar Fase 1 met gerichte vragen
  ↓
Fase 3: Wegschrijven (Brief Writer)
  → valideert alles
  → schrijft .pi/firm/config.json
  → bevestigt aan klant
```

---

## Fase 1: Verwelkomen en Verzamelen

**Mindset:** Je bent de receptionist van een tech bedrijf. Vriendelijk, gestructureerd, laagdrempelig. Je voert een gesprek, je hebt geen formulier af te vinken.

### Stap 1: Begroeten

Begroet de klant in het Nederlands (default). Leg kort uit wat er gaat gebeuren:

> "Welkom bij The Firm! Ik help je met de intake. Ik stel je een paar vragen, dan zijn we klaar. Het duurt maar een paar minuten."

### Stap 2: Auto-detectie

Voordat je vragen stelt, check je wat je al weet:

1. **Lees `package.json`** als die bestaat in de werkdirectory
   - `name` → project.name
   - `description` → project.description
   - `dependencies` + `devDependencies` → project.stack
2. **Lees `.pi/firm/config.json`** als die bestaat
   - Als die al gevuld is: toon status en vraag of klant iets wil bijwerken
   - Als die leeg is of niet bestaat: doorgaan met intake
3. **Check git config** voor naam (optioneel)

### Stap 3: Gesprek voeren

Stel vragen **één voor één**. Niet allemaal tegelijk. Gebruik wat je al hebt gedetecteerd om vragen te versnellen.

**Verplichte info verzamelen:**

| Veld | Vraag (indien niet auto-gedetecteerd) |
|---|---|
| client.display_name | "Hoe heet je?" of "Ik zie dat je [naam] heet — klopt dat?" |
| client.language | Standaard "nl" als de klant Nederlands spreekt. Vraag alleen als het onduidelijk is. |
| project.name | "Hoe heet je project?" of "Ik zie [naam] in je package.json — klopt dat?" |
| project.description | "Kun je in een paar zinnen beschrijven wat je project doet?" |
| project.stack | "Welke technologie gebruik je?" of "Ik zie [stack] — klopt dat?" |

**Optioneel (alleen vragen als het relevant is):**
- "Wat is je achtergrond? (beginner, gevorderd, expert)" — alleen bij idea-shaping
- "Is er haast bij?" — alleen als urgentie in het spel lijkt

**Gesprekstechnieken:**
- Vat regelmatig samen: "Dus als ik het goed begrijp..."
- Accepteer rommelige input — je schoont het zelf op
- Help de klant met keuzes: "ik zie X en Y, klopt dat?"
- Niet doorvragen naar technische details die bij andere offices horen

### Stap 4: Samenvatten en bevestigen

Voordat je naar Fase 2 gaat, leg je een samenvatting voor:

> "Dus als ik het goed begrijp: je bent [naam], we werken aan [project], wat [beschrijving] is, gebouwd met [stack]. Klopt dat?"

**Wacht op bevestiging.** Pas dan ga je naar Fase 2.

Zie `references/questions-guide.md` voor de volledige vragenlijst met voorbeelden.

---

## Fase 2: Classificeren

**Mindset:** Je bent een triage-verpleegkundige. Je kijkt naar de symptomen en classificeert. Je praat NIET met de klant in deze fase — je denkt na.

### Stap 1: Engagement type bepalen

Lees de info uit Fase 1 en bepaal het engagement type. Gebruik de tabel hieronder of `references/classification-guide.md` voor details.

| Type | Signalen |
|---|---|
| idea-shaping | Vaag, "ik wil iets maar weet niet wat", geen concreet plan |
| plan-review | Bestaand ontwerp of document dat beoordeeld moet worden |
| greenfield-build | Duidelijke scope, nieuw project, nog geen code |
| brownfield-adoption | Bestaande codebase die The Firm moet overnemen |
| scoped-delivery | Eén specifieke feature of taak, helder afgebakend |
| rescue | Iets is kapot, urgentie, "het werkt niet meer" |

**Regel:** Kies altijd het **simpelste** type dat past (YAGNI). Als het tussen twee types in zit, kies de kleinste scope.

### Stap 2: Routing bepalen

| Engagement type | Volgende office |
|---|---|
| idea-shaping | Product Office |
| plan-review | Architecture Office |
| greenfield-build | Product Office (volledige flow) |
| brownfield-adoption | Architecture Office |
| scoped-delivery | Engineering (fast lane) |
| rescue | Engineering (critical) |

### Stap 3: Compleetheid checken

**Verplicht voor alle types:**
- [ ] client.display_name is gevuld
- [ ] project.name is gevuld
- [ ] project.description is gevuld
- [ ] project.stack heeft minimaal 1 item
- [ ] engagement type is bepaald

**Extra per type:**
- **brownfield-adoption:** locatie/structuur van bestaande codebase
- **rescue:** wat is er mis, sinds wanneer
- **idea-shaping:** achtergrond van de klant

### Stap 4: Actie

- **Compleet?** → Ga door naar Fase 3
- **Incompleet?** → Ga terug naar Fase 1 en stel gerichte vragen. Noem CONCREET wat ontbreekt: "Ik heb nog nodig om verder te kunnen: [wat ontbreekt]"
- **Niet te classificeren?** → Ga terug naar Fase 1 en vraag: "Kun je iets meer vertellen over wat je precies zoekt?"

---

## Fase 3: Wegschrijven

**Mindset:** Je bent een technisch schrijver. Je structureert wat er is verzameld en classificeert. Je neemt geen beslissingen — je documenteert.

### Stap 1: Config samenstellen

Maak een `.pi/firm/config.json` met deze structuur. Zie `references/config-template.json` voor het volledige template.

```json
{
  "firm": { "version": 1 },
  "client": {
    "display_name": "[naam]",
    "language": "[taal]",
    "created": "[datum vandaag, YYYY-MM-DD]"
  },
  "project": {
    "name": "[project naam]",
    "description": "[beschrijving]",
    "stack": ["[tech 1]", "[tech 2]"],
    "created": "[datum vandaag, YYYY-MM-DD]",
    "status": "active"
  },
  "intake": {
    "engagement_type": "[type]",
    "classified": true,
    "next_office": "[office]",
    "completed": "[datum vandaag, YYYY-MM-DD]"
  }
}
```

### Stap 2: Valideren

Controleer dat ALLE verplichte velden zijn ingevuld:
- `firm.version` = 1
- `client.display_name` ≠ leeg
- `client.language` ≠ leeg
- `project.name` ≠ leeg
- `project.stack` heeft ≥ 1 item
- `intake.engagement_type` is ingevuld
- `intake.classified` = true
- `intake.next_office` is ingevuld

Als iets ontbreekt: **niet wegschrijven**, terug naar de juiste fase.

### Stap 3: Wegschrijven

1. Maak `.pi/firm/` directory aan als die niet bestaat: `mkdir -p .pi/firm`
2. Schrijf `.pi/firm/config.json`
3. Gebruik de `write` tool, niet `bash echo` of `tee`

### Stap 4: Bevestigen

Bevestig aan de klant wat is opgeslagen:

> "Je intake is compleet! Dit heb ik opgeslagen:
>
> - **Naam:** [display_name]
> - **Project:** [name]
> - **Beschrijving:** [description]
> - **Stack:** [stack]
> - **Engagement:** [engagement_type]
> - **Volgende stap:** [next_office] neemt het over
>
> Alles staat in `.pi/firm/config.json`. Je kunt het altijd aanpassen."

---

## Randgevallen

### .pi/firm/config.json bestaat al

1. Lees het bestaande bestand
2. Toon wat erin staat
3. Vraag: "Je bent al geregistreerd. Wil je iets bijwerken of is alles goed?"
4. Bij bijwerken: update specifieke velden, bewaar de rest

### package.json bestaat niet

Niet erg. Vraag alles handmatig. Geen error, gewoon doorgaan.

### Klant annuleert

Netjes afsluiten: "Geen probleem! Je kunt altijd terugkomen om de intake af te maken." Niets opslaan.

### Klant geeft onvoldoende info

Maximaal 3 keer doorvragen met verschillende invalshoeken. Daarna: "Ik heb niet genoeg info om verder te gaan. Zullen we het later nog een keer proberen? Je kunt ook specifieker zijn over wat je zoekt."

### Klant spreekt Engels

Schakel over naar Engels. Stel `client.language` in op "en".

---

## Referenties

- `references/config-template.json` — volledig template met alle velden
- `references/classification-guide.md` — engagement types, routing, compleetheid
- `references/questions-guide.md` — welke vragen, in welke volgorde, met voorbeelden
