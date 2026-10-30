# CapacityBond

Reservation-level native-BOT assurance for compute commitments made elsewhere.

CapacityBond lets a registered provider publish a compute reservation, lock an exact
native-BOT bond, collect a buyer's acceptance, and settle against a signed checkpoint
record. The compute agreement itself stays off-chain. The contract fixes a reference to
it, the collateral, the parties, the service window, and the bounded claim path.

This is testnet software. It has not been audited and is not production custody.

## Status

| Item | State |
| --- | --- |
| Contract | Implemented, 15 Hardhat tests passing |
| Shared protocol package | Implemented, 10 Vitest tests passing |
| Web app | Built and responsive, live against Bohr 968 |
| Bohr deployment | Live at `0x25BBa32bb19E495aA70D8E07b25DE0D42ED0C425` (block 28704812) |
| Live acceptance | 13/13 checks passed (`deployments/acceptance-bohr.json`) |
| Audit | None |

The frontend reads `deployments/bohr.json` at build time. A blank `address` makes the
app label every record as a fixture and disable writes. The current record points at the
live Bohr deployment:

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
- Not mainnet software and not audited.

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
scripts/                         deploy, seed, acceptance, key and gas tooling
deployments/bohr.json            deployment record consumed by the frontend
docs/                            research, architecture, threat model, runbook, evidence
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

For a frontend-only alternate endpoint, set build-time variables from
`.env.test.example`:

```text
VITE_CAPACITY_BOND_ADDRESS=0x...
VITE_BOHR_RPC_URL=https://rpc.bohr.life
```

Never put private keys in `VITE_*` variables.

## Deploy to Vercel

The repository is ready to import into Vercel's website:

1. On vercel.com choose **Add New → Project** and import this repository.
2. Keep the root directory at the repository root. `vercel.json` sets the install
   command (`npm install`), build command (`npm run build`), and output directory
   (`apps/web/dist`).
3. No environment variables are required. The Bohr contract address is bundled from
   `deployments/bohr.json` at build time. `VITE_BOHR_RPC_URL` is optional.
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

## Documentation

- [Research](docs/research.md)
- [UI research](docs/ui-research.md)
- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Runbook](docs/runbook.md)
- [Acceptance plan](docs/acceptance.md)
- [Gas and capital](docs/gas-and-capital.md)

## License

No license has been selected. Treat the repository as testnet-only source until a
license is added.
