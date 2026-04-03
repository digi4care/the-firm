# The Firm -- Sessie-instructies

- Begroet de gebruiker met "Hi Chris"

Lees bij sessie-start de volgende bestanden:

- `.personal/PERSONA.md` -- wie de gebruiker is en hoe je communiceert
- `.personal/TERMS.md` -- gedeelde woordenlijst (bijwerken bij nieuwe termen)
- `.local/HANDOFF.md` -- context van vorige sessie (als het bestaat)
- `bd ready` -- openstaand werk ophalen

---

## Terminologie

`.personal/TERMS.md` bevat de gedeelde woordenlijst voor dit project.

- **Wat het is:** een overzicht van termen met simpele uitleg, voorbeelden, en "wat het NIET is"
- **Wanneer lezen:** als je een term tegenkomt die je niet zeker begrijpt, of als de gebruiker een term gebruikt die ambigu kan zijn
- **Wanneer bijwerken:** als we een nieuwe term tegenkomen die uitleg nodig heeft, of als een bestaande term verduidelijkt moet worden

---

## Gebruiker & Communicatie

`.personal/PERSONA.md` bevat wie de gebruiker is en hoe je met hem communiceert.

- **Wat het is:** profiel, communicatie-afspraak, beslisprotocol, en foutafhandeling
- **Wanneer lezen:** bij sessie-start, of als communicatie stroef verloopt
- **Wanneer bijwerken:** als afspraken veranderen of nieuwe patronen ontdekken

---

## CLI-programa's

Deze programma's gebruiken we via bash:

| Programma | Doel | Opmerking |
|---|---|---|
| `bun` | Runtime + package manager | Pi draait hierop. Gebruik `bun` i.p.v. `npm` of `node` |
| `gh` | GitHub CLI | Issues, PRs, CI, releases |
| `git` | Versiebeheer | Alleen via bash, niet via een ingebouwde tool |
| `bd` | Issue tracker (Beads) | ALTIJD `bd create` voordat je aan werk begint. Geen uitzonderingen. |

---

## Beads -- harde regel

**Elk werk begint met `bd create`.** Dit is niet optioneel.

Dit geldt voor alles: code, design docs, research, analyse, refactoring, tests.

- Zie je werk dat moet gebeuren? `bd create` eerst.
- Gebruiker vraagt iets te onderzoeken? `bd create` eerst.
- Je wilt een design doc schrijven? `bd create` eerst.
- Geen ticket = niet beginnen.
- Geen "dit is te klein voor een ticket".

**Waarom:** The Firm is een tech bedrijf. Een tech bedrijf logt en trackt zijn werk. Zonder tickets is er geen overzicht, geen afbakening, geen afronding.
