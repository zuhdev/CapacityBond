# CapacityBond

Reservation-level native-BOT assurance for compute commitments made elsewhere.

CapacityBond lets a registered provider publish a compute reservation, lock an exact
native-BOT bond, collect a buyer's acceptance, and settle against a signed checkpoint
record. The compute agreement itself stays off-chain. The contract fixes a reference to
it, the collateral, the parties, the service window, and the bounded claim path.

This is testnet software. It has not been audited. Mainnet preparation is
complete and gated by `docs/mainnet-readiness.md`; production custody still
requires the listed review gates.

## Status

| Item | State |
| --- | --- |
| Contract | Implemented, 15 Hardhat tests passing, frozen for deployment (no proxy/upgrade path) |
| Shared protocol package | Implemented, 10 Vitest tests passing |
| Web app | Built and responsive; production build targets BOT Chain mainnet, testnet via `VITE_BOND_NETWORK=testnet` |
| Bohr deployment | Live at `0x25BBa32bb19E495aA70D8E07b25DE0D42ED0C425` (block 28704812) |
| Live acceptance | 13/13 checks passed (`deployments/acceptance-bohr.json`) |
| Mainnet readiness | Tooling + checklist ready (`docs/mainnet-readiness.md`); nothing deployed on 677 yet |
| Audit | None |

The frontend reads the network-matching deployment record at build time.
The production bundle defaults to BOT Chain mainnet (`deployments/botchain.json`);
a Bohr testnet build is produced by setting `VITE_BOND_NETWORK=testnet`
(`deployments/bohr.json`). A blank `address` makes the app label every record
as a fixture and disable writes. The mainnet record is intentionally blank until
the first mainnet deployment (see `docs/mainnet-readiness.md`).

Bohr testnet evidence (testnet build):

- Contract: https://scan.bohr.life/address/0x25BBa32bb19E495aA70D8E07b25DE0D42ED0C425
- Deploy tx: https://scan.bohr.life/tx/0x2711388788f086fedfd9fe401ba483b4114e171d631bd9b7d128595e149e25f9
- Demo ledger: reservation #5 active (2/4 checkpoints), #6 completed, #7 funded

## What it is

- A reservation record with two named parties and an explicit service window.
- An escrow of the provider's native BOT bond.
- A mutual acceptance step before service starts.
- An EIP-712 checkpoint record signed by a configured test attestor.
- A bounded missed-checkpoint claim, optional dispute, and resolver split.
- Pull-payment withdrawals with reentrancy protection.

## What it is not

- Not a compute marketplace, scheduler, or GPU provider.
- Not proof that capacity existed, ran, or met a quality standard.
- Not hardware attestation, confidential computing, or a quality oracle.
- Not Fluence capacity staking, delegation, or underwriting.
- Not insurance, a derivatives protocol, or a promise of recovery.
- Not mainnet-audited software; see `docs/mainnet-readiness.md` for the open
  review gates that still apply.

The agreement hash fixes the reference to the off-chain terms. It does not prove that
the referenced document is true, complete, or still available.

## Lifecycle

```text
Draft -> Funded -> Active -> Fulfilled
                    |  \
                    |   -> Claimable -> Disputed -> Resolved
                    -> Expired
```

1. A registered provider creates a reservation for a buyer.
2. The provider deposits the exact native-BOT bond.
3. Provider and buyer both accept before the acceptance deadline.
4. The service window opens. The attestor signs ordered checkpoints.
5. Complete checkpoints after service end release the full bond.
6. Missing checkpoints open a claim after the grace period. The buyer may dispute;
   otherwise the bond returns to the provider after the claim window.
7. A dispute is split by the resolver with a written resolution reference.
8. Credits are withdrawn individually.

## Repository map

```text
contracts/
  contracts/CapacityBond.sol      core escrow and state machine
  test/CapacityBond.test.ts       15 contract tests
apps/web/                        React + Vite workspace and marketing site
packages/chain/                  ABI, types, formatting, deadlines, demo fixtures
packages/ui/                     shared UI primitives
scripts/                         deploy, sanity, verify, status, seed, acceptance tooling
deployments/                     deployment records consumed by the frontend
docs/                            research, architecture, threat model, runbook, readiness
```

## Quick start

Requires Node.js 20 or newer and npm.

```bash
npm install
npm run compile
npm test
npm run typecheck
npm run build
npm run dev
```

`npm test` runs both the Hardhat suite and the workspace unit tests. The dev server
listens on `http://localhost:3000`. `npm run preview` serves the production build on
the same port.

The app uses hash routes:

- `#/` marketing site
- `#/app` reservation ledger
- `#/app/new` create a reservation
- `#/app/providers` provider registry
- `#/app/reservations/:id` reservation detail

## Bohr Testnet

| Field | Value |
| --- | --- |
| Network | BOT Chain Bohr Testnet |
| Chain ID | 968 |
| RPC | https://rpc.bohr.life |
| Explorer | https://scan.bohr.life |
| Faucet | https://faucet.botchain.ai/basic |
| Native asset | BOT, 18 decimals |
| EntryPoint v0.7 | 0x0000000071727de22e5e9d8baf0edac6f37da032 |
| Bundler | https://bundler.bohr.life/rpc |

### BOT Chain Mainnet

| Field | Value |
| --- | --- |
| Network | BOT Chain Mainnet |
| Chain ID | 677 |
| RPC | https://rpc.botchain.ai |
| Explorer | https://scan.botchain.ai |
| Native asset | BOT, 18 decimals — no faucet; obtain via the official DEX/bridge |

Mainnet notes: `eth_getLogs` is disabled on the official endpoint (the scripts
here poll state instead), blocks follow BSC-style cadence, and the deployment
flow requires `DEPLOY_CONFIRM_MAINNET=1`. See `docs/mainnet-readiness.md`.

No public paymaster was confirmed. Users need test BOT for bonds and gas. The faucet
uses a browser challenge, so claiming it is an interactive step.

## Deployment

Copy `.env.example` to `.env`, then generate local testnet burners:

```bash
npm run keys:generate
```

Fund the deployer from the faucet. The deployer also acts as the demo provider and
pays the bonds and seed transaction gas. At least 0.3 BOT is recommended.

Review the deployment record requirements and run:

```bash
npm run deploy:bohr
npm run accept:bohr
npm run seed:bohr
npm run build
```

Run the acceptance script before seeding. It expects an empty vault for its final
accounting assertions. The seed step registers or updates the demo provider, creates
three reservations, and writes `deployments/seed-bohr.json`.

The deploy script writes `deployments/bohr.json`, then regenerates
`packages/chain/src/abi.generated.ts` from the compiled artifact. Rebuild the web app
after deployment so it picks up the new address.

Tooling available for the Bohr testnet and, with additional guards, for the
BOT Chain mainnet:

```bash
npm run sanity:bohr        # post-deploy checks: code, roles, grace, vault, EIP-712 domain
npm run verify:bohr        # verify the source on scan.bohr.life (hardhat-verify)
npm run status:bohr        # live snapshot: vault accounting + reservation states
```

For a frontend-only alternate endpoint, set build-time variables from
`.env.test.example`:

```text
VITE_CAPACITY_BOND_ADDRESS=0x...
VITE_BOHR_RPC_URL=https://rpc.bohr.life
```

Never put private keys in `VITE_*` variables.

## Mainnet deployment

Mainnet is **prepared, not yet deployed**: nothing exists at chain 677 yet, and
`deployments/botchain.json` intentionally has a blank address. Before the first
production deployment, work through `docs/mainnet-readiness.md` (keys, funding,
audit gates). The operational summary:

```bash
DEPLOY_CONFIRM_MAINNET=1 npm run deploy:botchain   # refuses without explicit confirmation
npm run sanity:botchain                             # must pass before anything else
npm run verify:botchain                             # explorer verification, no API key needed
npm run status:botchain                             # steady-state ops snapshot
```

Hard rules baked into the scripts: no seeding on mainnet; acceptance on mainnet
requires `ACCEPT_MAINNET=1` and is a deliberate, one-time release gate; the
production frontend build targets mainnet by default (testnet bundles set
`VITE_BOND_NETWORK=testnet`). Resolver-continuity
procedures (`docs/resolver-continuity.md`) must be in place before real disputes.

## Deploy to Vercel

The repository is ready to import into Vercel's website:

1. On vercel.com choose **Add New → Project** and import this repository.
2. Keep the root directory at the repository root. `vercel.json` sets the install
   command (`npm install`), build command (`npm run build`), and output directory.
   The web build mirrors `apps/web/dist` to the repo-root `dist/`, and
   `apps/web/vercel.json` covers the case where Vercel selects `apps/web` as the root
   directory, so the default Vercel settings work either way.
3. No environment variables are required. The contract address is bundled from
   the network's deployment record at build time (`deployments/botchain.json` by
   default; `deployments/bohr.json` with `VITE_BOND_NETWORK=testnet`).
   `VITE_RPC_URL` is an optional endpoint override.
4. Deploy. The site is static and uses hash routing.

After a new deployment, rebuild on Vercel so the new address and ABI are picked up.

## Verification

```bash
npm run test:contracts   # 15 passing
npm run test -w @capacitybond/chain   # 10 passing
npm run typecheck        # root, web, and chain typechecks
npm run build            # production Vite build
npm run gas:report       # local gas measurements
```

Live acceptance passed 13/13 checks on Bohr; evidence is in
`deployments/acceptance-bohr.json`. The audited-software caveat still applies.
On-chain source verification is wired through `@nomicfoundation/hardhat-verify`
(`npm run verify:bohr` / `verify:botchain`); the Bohr testnet contract is
currently **not** verified on `scan.bohr.life` and should be verified before
that address is promoted in any user-facing material.

## Documentation

- [Research](docs/research.md)
- [UI research](docs/ui-research.md)
- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Runbook](docs/runbook.md)
- [Mainnet readiness](docs/mainnet-readiness.md)
- [Resolver continuity](docs/resolver-continuity.md)
- [Acceptance plan](docs/acceptance.md)
- [Gas and capital](docs/gas-and-capital.md)

## License

No license has been selected. Treat the repository as testnet-only source until a
license is added.
