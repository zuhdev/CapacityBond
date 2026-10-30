# Deployment and operations runbook

This runbook assumes the repository is at
`C:\Users\HP\Documents\CapacityBond` and targets BOT Chain Bohr Testnet only.

## 1. Prerequisites

- Node.js 20 or newer, npm 10 or newer.
- A browser wallet that can add a custom EVM network.
- Access to the interactive faucet: https://faucet.botchain.ai/basic
- At least 0.3 test BOT recommended for deploy, gas, and demo bonds.
- The repository dependencies installed:

```bash
npm install
```

The faucet challenge is interactive. There is no approved unattended claim script.

## 2. Generate local accounts once

```bash
npm run keys:generate
```

This writes `.env`, which is ignored. It creates DEPLOYER, BUYER, ATTESTOR, and
RESOLVER keys and addresses. Running it again refuses to overwrite existing accounts
unless `--force` is passed. Do not use `--force` after funds are present.

Public test addresses used for the prepared local environment:

```text
DEPLOYER  0xAc17bDf0d3f6e7ef830320d4573b1d1677028f50
BUYER     0x687b4CeadDe69a4b579eF52656B433d75F4Ab02C
ATTESTOR  0xaeF8871C1cc8a9042908F5c3D1961dB6eF00C31F
RESOLVER  0x6788E32BacAb69e240AdFb1923Ad9951eB90Ae02
```

The private keys must stay in `.env`. Never paste them into documentation, chat, or a
`VITE_*` variable.

## 3. Fund the deployer

Claim test BOT to `DEPLOYER_ADDRESS` at https://faucet.botchain.ai/basic. Check the
balance through the Bohr explorer or RPC. A zero balance aborts deployment by design.

The deployer is also the demo provider. It pays seed bonds and gas. The `ensureGas`
helper tops up the buyer and resolver from the deployer if their balance is below
0.003 BOT, so the deployer must be funded adequately.

## 4. Configure

`.env` should contain:

```text
BOHR_RPC_URL=https://rpc.bohr.life
BOHR_CHAIN_ID=968
BOHR_EXPLORER_URL=https://scan.bohr.life
GRACE_PERIOD_SECONDS=300

DEPLOYER_PRIVATE_KEY=...
BUYER_PRIVATE_KEY=...
ATTESTOR_PRIVATE_KEY=...
RESOLVER_PRIVATE_KEY=...

DEPLOYER_ADDRESS=...
BUYER_ADDRESS=...
ATTESTOR_ADDRESS=...
RESOLVER_ADDRESS=...
```

The deploy script validates:

- chain ID is 968;
- attestor and resolver are different and non-zero;
- grace period is between 120 seconds and 7 days;
- deployer balance is non-zero.

Confirm the compiled contract is current:

```bash
npm run compile
npm test
```

## 5. Deploy

```bash
npm run deploy:bohr
```

Expected effects:

1. Deploys `CapacityBond(owner, attestor, resolver, grace)`.
2. Waits for a successful receipt.
3. Writes `deployments/bohr.json`.
4. Regenerates `packages/chain/src/abi.generated.ts`.
5. Prints the explorer address and transaction.

Record the contract address and deployment transaction. Verify both on
`https://scan.bohr.life`.

If deployment fails, check:

- the RPC is reachable and still on chain 968;
- the deployer has BOT;
- the attestor and resolver addresses are distinct;
- the network accepts the Cancun target;
- the transaction did not exceed the block gas limit.

A replacement deployment overwrites `deployments/bohr.json`. Preserve the previous
record if it matters.

## 6. Run acceptance before seeding

```bash
npm run accept:bohr
```

The script creates two reservations:

- A: complete checkpoints, fulfill, full provider credit, withdraw.
- B: no checkpoints, wait for grace, open claim, buyer dispute, resolver 50/50 split,
  withdraw both credits.

It waits for real chain time. Expect roughly 8 to 10 minutes on Bohr because scenario B
waits through the configured grace period. It prints PASS/FAIL checks and writes
`deployments/acceptance-bohr.json`.

Important: run acceptance on a fresh deployment before seeding. Its final accounting
checks expect no other locked reservation in the vault.

## 7. Seed the demo ledger

```bash
npm run seed:bohr
```

This creates:

- an active reservation with two of eight checkpoints;
- a completed and withdrawn reservation;
- a funded reservation awaiting buyer acceptance.

It writes `deployments/seed-bohr.json`. It requires the deployer/provider to hold at
least 0.09 BOT for the three bonds and gas. It also updates the demo provider profile
to `Northstar Compute (Bohr test fixture)`.

## 8. Build and publish the frontend

```bash
npm run build
npm run preview
```

The production bundle resolves the contract address from `deployments/bohr.json` at
build time. Rebuild after every deployment or address change.

For a frontend host, publish `apps/web/dist`. It is a static hash-routed app and needs a
fallback to `index.html` only for the root path; all app navigation is in the fragment.

## 9. Verify the live workspace

1. Open `#/app` and confirm the banner says "Live on Bohr 968".
2. Confirm the contract link opens the deployed address.
3. Confirm the attestor, resolver, grace period, and vault numbers match.
4. Open the active fixture and confirm 2 of 8 checkpoints.
5. Connect a test buyer wallet and verify the correct action state.
6. Confirm wrong-network handling by switching away from chain 968.
7. Confirm fixture labels disappear only when a live address is configured.

## 10. Role changes

The owner can call:

```text
setAttestor(address)
setResolver(address)
setGracePeriod(uint64)
```

Attestor and resolver must remain distinct. Grace must remain within 2 minutes to
7 days. Changes affect future actions, not already terminal reservations. Record the
transaction and tell users out of band.

`Ownable2Step` means ownership transfer requires the new owner to accept.

## 11. Incident checks

If a user reports stuck funds:

1. Read the reservation status and checkpoint count.
2. Compare service end, grace period, and claim deadline with chain time.
3. Check whether the bond is still locked or already credited with `withdrawable`.
4. Check `vaultAccounting`.
5. Do not ask for a private key.
6. Use the explorer transaction history to identify the last successful state change.

If the resolver is unavailable during a dispute, the bond remains locked. There is no
fallback resolver in this version. This is a known operational risk and a production
blocker.

## 12. Cleanup and repeatability

- Keep `.env` out of version control.
- Keep deployment and acceptance JSON files as evidence.
- Do not rerun `keys:generate` with `--force` while funds exist.
- Do not run acceptance after seeding without resetting the environment.
- Rebuild the frontend after any contract address or ABI change.
- Test BOT has no monetary value; never reuse these keys on mainnet.
