# Deployment and operations runbook

This runbook assumes the repository is at
`C:\Users\HP\Documents\CapacityBond`. It covers two environments:

- **Bohr Testnet** (chain id 968) — rehearsal, demo data, and proof flows.
- **BOT Chain Mainnet** (chain id 677) — production. Follow it only together
  with `docs/mainnet-readiness.md`; mainnet steps are marked **[MAINNET]**.

The network metadata lives in `scripts/networks.ts`; every live script validates
the connected chain id against it.

## 1. Prerequisites

- Node.js 20 or newer, npm 10 or newer.
- A browser wallet that can add a custom EVM network.
- Testnet: access to the interactive faucet: https://faucet.botchain.ai/basic
- Testnet: at least 0.3 test BOT recommended for deploy, gas, and demo bonds.
- **[MAINNET]** BOT from the official DEX or bridge — no faucet. See
  `docs/mainnet-readiness.md` sections 2–4 for key custody and funding rules.
- The repository dependencies installed:

```bash
npm install
```

The faucet challenge is interactive. There is no approved unattended claim script.

## 2. Generate local accounts once (testnet only)

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

**[MAINNET]** Never use this generator for production roles. Produce owner,
attestor, and resolver keys from hardware wallets or an offline key ceremony, and
keep the resolver backup path from `docs/resolver-continuity.md` alive.

## 3. Fund the deployer

Claim test BOT to `DEPLOYER_ADDRESS` at https://faucet.botchain.ai/basic. Check the
balance through the Bohr explorer or RPC. A zero balance aborts deployment by design.

The deployer is also the demo provider. It pays seed bonds and gas. The `ensureGas`
helper tops up the buyer and resolver from the deployer if their balance is below
0.003 BOT, so the deployer must be funded adequately.

## 4. Configure

Testnet `.env` should contain:

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

**[MAINNET]** instead set `BOT_MAINNET_RPC_URL=https://rpc.botchain.ai` and the
production role addresses; see `docs/mainnet-readiness.md` section 4.

The deploy script validates:

- the connected chain id matches the `--network` target (968 or 677);
- **[MAINNET]** `DEPLOY_CONFIRM_MAINNET=1` was set for this session;
- attestor and resolver are different and non-zero;
- grace period is between 120 seconds and 7 days;
- deployer balance is non-zero (≥ 0.01 BOT testnet / ≥ 0.05 BOT mainnet).

Confirm the compiled contract is current:

```bash
npm run compile
npm test
```

## 5. Deploy

```bash
# Testnet
npm run deploy:bohr

# [MAINNET] — requires DEPLOY_CONFIRM_MAINNET=1 in this session
npm run deploy:botchain
```

Expected effects:

1. Deploys `CapacityBond(owner, attestor, resolver, grace)`.
2. Waits for the configured confirations (1 testnet, 5 mainnet).
3. Writes `deployments/bohr.json` or `deployments/botchain.json`.
4. Regenerates `packages/chain/src/abi.generated.ts`.
5. Prints the explorer address and transaction.

Record the contract address and deployment transaction. Verify both on
`https://scan.bohr.life` (testnet) or `https://scan.botchain.ai` (mainnet).

**[MAINNET]** immediately run `npm run sanity:botchain` (must pass, exit 0)
then `npm run verify:botchain`. Unverified source code on mainnet is a no-go.

If deployment fails, check:

- the RPC is reachable and still on the expected chain id;
- the deployer has BOT;
- the attestor and resolver addresses are distinct;
- the confirmation variable is set for a mainnet run;
- the network accepts the Cancun target;
- the transaction did not exceed the block gas limit.

A replacement deployment overwrites the network's `deployments/*.json` record.
Preserve the previous record if it matters.

## 6. Run acceptance before seeding (testnet; release gate on mainnet)

```bash
npm run accept:bohr

# [MAINNET] — deliberate, one-time release gate only; requires ACCEPT_MAINNET=1
npm run accept:botchain
```

The script creates two reservations:

- A: complete checkpoints, fulfill, full provider credit, withdraw.
- B: no checkpoints, wait for grace, open claim, buyer dispute, resolver 50/50 split,
  withdraw both credits.

It waits for real chain time. Expect roughly 8 to 10 minutes on Bohr because scenario
B waits through the configured grace period. It prints PASS/FAIL checks and writes
`deployments/acceptance-<network>.json`.

**[MAINNET]** acceptance is optional and gas-only, but it writes permanent public
records under the acceptance provider identity and exercises the real
attestor/resolver. Decide this in advance (see `docs/mainnet-readiness.md`
section 7). Never run acceptance after real user reservations exist — its final
accounting checks expect no other locked reservation in the vault.

## 7. Seed the demo ledger (testnet only)

```bash
npm run seed:bohr
```

The seed script refuses to run on any non-testnet network. **Never seed mainnet.**

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

The production bundle resolves the contract address from the network's deployment
record at build time — `deployments/botchain.json` by default (mainnet), or
`deployments/bohr.json` when the build sets `VITE_BOND_NETWORK=testnet`.
Rebuild after every deployment or address change.

For a frontend host, publish `apps/web/dist`. It is a static hash-routed app and
needs a fallback to `index.html` only for the root path; all app navigation is
in the fragment.

## 9. Verify the live workspace

1. Open `#/app` and confirm the banner names the right network
   ("Live on Bohr 968" / "Live on BOT 677").
2. Confirm the contract link opens the deployed address.
3. Confirm the attestor, resolver, grace period, and vault numbers match the
   deployment record and `npm run status:<network>` output.
4. Open the active fixture and confirm 2 of 8 checkpoints (testnet).
5. Connect a test buyer wallet and verify the correct action state.
6. Confirm wrong-network handling by switching away from the target chain.
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

**[MAINNET]** every role change must follow the procedures in
`docs/resolver-continuity.md` (two-person announcement rule, backup resolver
maintained and drilled). The owner key custody tier is documented in
`docs/mainnet-readiness.md` section 2.

## 11. Incident checks

If a user reports stuck funds:

1. Run `npm run status:<network>` or filter by the affected account with
   `npm run status:<network> -- --address 0x...`.
2. Compare service end, grace period, and claim deadline with chain time.
3. Check whether the bond is still locked or already credited with `withdrawable`.
4. Check `vaultAccounting`.
5. Do not ask for a private key.
6. Use the explorer transaction history to identify the last successful state change.

If the resolver is unavailable during a dispute, the bond remains locked. There
is no on-chain fallback resolver in this version. Follow the incident tree in
`docs/resolver-continuity.md`; do not improvise during an incident.

## 12. Cleanup and repeatability

- Keep `.env` out of version control.
- Keep deployment, acceptance, and status snapshots as evidence.
- Do not rerun `keys:generate` with `--force` while funds exist.
- Do not run acceptance after seeding without resetting the environment (testnet).
- **[MAINNET]** never seed; never reuse testnet burners; keep hardware keys
  offline between role changes.
- Rebuild the frontend after any contract address or ABI change.
