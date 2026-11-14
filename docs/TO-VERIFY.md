# To verify before showing as fact

The guide and the interface only show what is verified against the Wataniya archive. Everything
below is held back until someone confirms it and updates the data files.

## Years (hidden in the UI — `yearVerified: false` in `data/moments.json`)

| Moment | Year in the Figma file | Status |
|---|---|---|
| Choufli Hal | 2005 | to verify |
| Om Kalthoum concert | 1968 | to verify |
| Official launch of TV broadcasting | 1966 | to verify |
| Bourguiba signing the independence agreement | 1956 | to verify |
| Other five moments | — | missing |

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

## Character cards

The cards show «تستنّى التثبّت» instead of a fact. They read from the same guide entries above.

## Names and spellings

- Fochika (فوشيكة) and Chedli Tamar (file name "chdli tamar") — spelling to confirm.
- El Khottab Al Bab is written «الخطّاب على الباب»; the Figma tape shows a different spelling.

## Media

- Archive frames in the viewer are the 3D renders turned black and white, labelled
  «صورة توضيحية · موش من الأرشيف». Replace with cleared archive frames and their colorized versions.
- All sound is synthesised in the browser (room tone, TV hum, static, clicks, crowd murmur).
  The Om Kalthoum subtitle says so explicitly.
- Clip rights: confirm with the organizer which Wataniya clips can be shown (research, risks).
