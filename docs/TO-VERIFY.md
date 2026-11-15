# To verify before showing as fact

The guide and the interface only show what is verified against the Wataniya archive. Everything
below is held back until someone confirms it and updates the data files.

## Years (hidden in the UI — `yearVerified: false` in `data/moments.json`)

| Moment | Year in the Figma file | Status |
|---|---|---|
| Choufli Hal | 2005 | to verify |
| Om Kalthoum concert | 1968 | to verify |
| Tunisia 3–1 Mexico | 1978 | **shown** (`yearVerified: true`), stated by the team: double-check before the demo |
| News studio, El Khottab Al Bab, Al Ahad Al Riyadhi | — | missing (no year on the tape) |

To show a year: set `"yearVerified": true` for that moment. To preview all of them before
verification (team rehearsal only): `VITE_SHOW_UNVERIFIED_YEARS=true`.

## Guide answers (`status: "to-verify"` in `data/guide-knowledge.json`)

| Entry | What is needed |
|---|---|
| `choufli-what` | Short description of the series and broadcast year |
| `choufli-characters` | Character and actor names as written in the archive |
| `character-sliman` | One short archive fact about Sliman |
| `character-sbou3i` | One short archive fact about Sbou3i |
| `kalthoum-concert` | Date of the concert and songs |
| `kalthoum-where` | Venue of the concert |

To publish an answer: replace the `TO VERIFY` text in `a`, keep `source` (and `year` if relevant),
set `"status": "verified"`. Keep it to three sentences; extra detail goes in `more`.

## Tunisia 3–1 Mexico (shown by the guide, source «أرشيف الوطنية / FIFA»)

These were given by the team and are published as `verified` so the demo can use them. Please confirm each one:

| Entry | Fact |
|---|---|
| `tunisia-mexico-result` | Tunisia beat Mexico 3–1 at the 1978 FIFA World Cup in Argentina; the first win by an African team at a World Cup |
| `tunisia-mexico-where` | Played on 2 June 1978 in Rosario, Argentina |
| `al-ahad-what` | Al Ahad Al Riyadhi is the Sunday sports show (nothing else is claimed) |

## Character cards

The cards show «تستنّى التثبّت» instead of a fact. They read from the same guide entries above.

## Names and spellings

- Fochika (فوشيكة) and Chedli Tamar (file name "chdli tamar") — spelling to confirm.
- El Khottab Al Bab is written «الخطّاب على الباب»; the Figma tape shows a different spelling.

## Media

- All sound is synthesised in the browser (room tone, TV hum, static, clicks, crowd murmur).
  The Om Kalthoum subtitle says so explicitly.
- Clip rights: confirm with the organizer which Wataniya clips can be shown (research, risks).
