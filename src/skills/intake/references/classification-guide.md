# Classification Guide

## Engagement Types

Elke klantvraag wordt geclassificeerd in één van deze types. Kies het simpelste type dat past (YAGNI).

| Type | Betekenis | Signalen | Voorbeeld |
|---|---|---|---|
| **idea-shaping** | Klant heeft een idee, weet niet hoe verder | Vaag, ongestructureerd, "ik wil iets maar weet niet wat" | "Ik wil een app maken maar weet niet waar ik moet beginnen" |
| **plan-review** | Klant heeft een plan, wil feedback | Bestaand document, ontwerp, of architectuur | "Ik heb een ontwerp, kan iemand ernaar kijken?" |
| **greenfield-build** | Nieuw project vanaf nul | Duidelijke scope, nog geen code | "Ik wil een webshop bouwen" |
| **brownfield-adoption** | Bestaand project, The Firm neemt het over | Bestaande codebase, adoption | "Ik heb code, ik wil dat The Firm het overneemt" |
| **scoped-delivery** | Specifieke feature of taak | Eén duidelijk afgebakend werkitem | "Ik wil auth toevoegen aan mijn bestaande app" |
| **rescue** | Iets is misgegaan, hulp nodig | Urgentie, iets kapot, "het werkt niet meer" | "Mijn database is stuk en ik kom er niet uit" |

## Routing

Na classificatie wordt bepaald welke office het werk oppakt.

| Engagement type | Volgende office | Lane | Reden |
|---|---|---|---|
| idea-shaping | Product Office | standard | Klant heeft geen product definitie |
| plan-review | Architecture Office | standard | Technische beoordeling nodig |
| greenfield-build | Product Office | standard | Volledige flow: Product → Architecture → Engineering |
| brownfield-adoption | Architecture Office | standard | Eerst bestaande code analyseren |
| scoped-delivery | Engineering (fast lane) | fast | Afhankelijk van complexiteit, meestal direct |
| rescue | Engineering (fast track) | critical | Snelheid is belangrijk |

## Compleetheid

Na classificatie: check of alle verplichte info aanwezig is.

### Altijd nodig
- Client display name
- Project naam
- Project beschrijving
- Stack (minimaal 1 item)
- Engagement type

### Soms nodig (afhankelijk van type)
- **idea-shaping:** achtergrond van de klant
- **brownfield-adoption:** locatie/structuur van de bestaande codebase
- **rescue:** wat is er mis, sinds wanneer, wat is de impact

### Status
- **Compleet** — genoeg om door te sturen
- **Incompleet** — specifieke ontbrekende info benoemen
- **Onvoldoende** — te weinig om te classificeren

## Regels

1. **Kies altijd het simpelste type** dat past (YAGNI)
2. **Maak geen aannames** — als het niet duidelijk is, vraag door
3. **Meerdere types mogelijk?** Kies het type met de kleinste scope
4. **Niet classificeerbaar?** Markeer als "needs clarification" met specifieke vragen
