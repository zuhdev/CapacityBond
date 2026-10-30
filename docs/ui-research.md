# UI research and design record

## Brief

The interface should feel like a collateral ledger for a serious, narrow instrument:
editorial, legible, and specific. It must not look like a generic staking dashboard,
NFT marketplace, or "AI infrastructure" template. The copy must keep the protocol's
limits visible instead of implying verified compute.

## Direction

The design combines:

- an editorial serif for headlines, so reservations read as records rather than
  product tiles;
- a humanist sans for dense operational copy;
- a mono face for IDs, timestamps, hashes, and role labels;
- a warm paper palette with deep green ink and a single vermilion attention color;
- flat rules, stamps, specimen cards, and ledger rows instead of glossy cards;
- explicit fixture, demo, and trust labels.

Implemented tokens live at the top of `apps/web/src/styles.css`:

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#f2efe6` | page ground |
| Cream | `#fffdf7` | panels and dark-mode text |
| Ink | `#15201c` | primary text |
| Deep green | `#123d32` | primary actions and headings |
| Vermilion | `#d55328` | attention, claims, focus |
| Gold | `#c8a149` | accent details only |

Typefaces are Fraunces Variable, Manrope Variable, and IBM Plex Mono, all self-hosted
through Fontsource packages.

## Information architecture

### Marketing site (`#/`)

1. Hero: "Make compute commitments carry weight."
2. Reservation specimen with an explicit fixture label.
3. The gap: off-chain terms, outside collateral, public record.
4. Mechanism: fix terms, lock bond, record checkpoints, settle or claim.
5. Lifecycle rail.
6. Roles and boundaries.
7. BOT-native research note.
8. Closing CTA and footer.

The site states that CapacityBond is independent testnet software and does not sell
compute, verify hardware, or underwrite outcomes.

### Workspace

- **Ledger** (`#/app`): accounting stats, fixture/live banner, reservation table,
  settlement queue, vault accounting, recent state, wallet state.
- **Create reservation** (`#/app/new`): terms, windows, bond, live draft preview.
- **Providers** (`#/app/providers`): public profiles, registration/update form.
- **Reservation detail** (`#/app/reservations/:id`): lifecycle, checkpoint record,
  terms, role context, eligible actions, transaction state, contract context.

## Responsive review

Checked with headless Chrome through the DevTools Protocol at exact CSS viewports:

| View | Result |
| --- | --- |
| 1440 x 1100 | No document-level horizontal overflow |
| 390 x 844 | No document-level horizontal overflow on landing or detail |
| 390 x 844 ledger | Table scrolls inside its own region; rail scrolls separately |
| Fonts/assets | All fonts self-hosted; official BOT mark loads from local public asset |

The ledger deliberately keeps a table on narrow screens. It is wrapped in a focusable,
labeled scroll region rather than being squeezed into unreadable columns.

The first headless pass used Chrome's minimum window width and cropped a 390 px capture
from a 512 px layout. The final screenshots use CDP device metrics, so responsive
conclusions are based on a true 390 px viewport.

## Interaction rules

- Read state remains available without a wallet.
- Writes are disabled in fixture mode with a visible explanation.
- Wrong-chain and missing-wallet states have explicit copy.
- Action cards show only the actions that the current role and state allow.
- Transactions show signing, pending, confirmed, reverted, and rejected states.
- Confirmation is only shown after a successful receipt.
- Checkpoint evidence hashes are derived in the browser and the attestor signs typed
  data; the UI does not invent a server-side signature.
- Addresses and transaction hashes link to the Bohr explorer.
- The footer distinguishes Bohr Testnet from the mainnet explorer.

## Accessibility and content integrity

- One page `h1`; section hierarchy follows the content.
- Form fields use visible labels and error text.
- Focus-visible outlines were added for links, buttons, inputs, and scroll regions.
- Reduced-motion preferences disable animation and smooth scrolling.
- Color is never the only status signal; badges include text.
- Decorative texture and stamps are marked or visually incidental.
- Every fixture is labeled "Fixture preview" or "Illustrative reservation".
- Checkpoint and agreement references say what their hashes do and do not prove.

## Known gaps

- No formal WCAG audit, screen-reader test, or contrast measurement has been completed.
- There is no dark theme beyond the intentionally dark vault and footer panels.
- The activity feed on the live ledger is derived from reservation state, not indexed
  event logs. It is labeled "Recent state" rather than "Events".
- Mobile navigation uses compact type and horizontal overflow for the primary links.
- No user testing has been conducted with real providers or buyers.

These gaps are acceptable for a testnet prototype but should be closed before any
production claim.
