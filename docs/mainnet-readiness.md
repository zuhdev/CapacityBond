# Mainnet readiness checklist

Target: **BOT Chain Mainnet** (chain id **677**, RPC `https://rpc.botchain.ai`,
explorer `https://scan.botchain.ai`, native asset BOT).

Scope of this document: everything that must be true before, during, and after the
first production deployment of `CapacityBond.sol`. Run this checklist in order and
record evidence in `deployments/` as you go.

The contract is deployment-frozen: **no logic changes are planned for v1**, so the
deployment is one-shot and immutable (no proxy, no upgrade path). Everything below
therefore happens off-chain: keys, funding, verification, monitoring, and process.

## 0. Fixed decisions

| Decision | Value |
| --- | --- |
| Network | BOT Chain mainnet, `677` (Bohr testnet `968` remains the rehearsal environment) |
| Contract | `CapacityBond.sol` as-is — no contract modifications without a re-audit |
| Owner model | Single EOA with `Ownable2Step`; preferably a hardware wallet. Multisig planned for v2 |
| Roles | `owner == deployer` (initial), separate `attestor` and `resolver` EOAs |
| Demo seeding | **Never on mainnet.** `seed-demo` refuses non-testnet chains at runtime |
| Optional release gate | `npm run accept:botchain` requires `ACCEPT_MAINNET=1`; gas-only cost, permanent public records |

## 1. Pre-deployment gates (unchanged from the threat model)

The contract itself is clean (tested, acceptance-proven, CEI + reentrancy guards,
no `tx.origin`, no unchecked calls), but the following review gates from
`docs/threat-model.md` remain **open** and are accepted risks for v1:

1. **No independent audit.** This is the single most important open gate. Do not
   route meaningful value through the escrow until an audit is done. Nothing in
   this repository substitutes for one.
2. **EOA ownership.** Owner can swap attestor/resolver and change grace period in
   the future. Mitigated only by key hygiene; multisig + role-change delay is v2.
3. **Single attestor.** Checkpoint integrity is exactly as trustworthy as one key.
4. **Resolver continuity.** See `docs/resolver-continuity.md`; failing to prepare
   the rotation path before first use is the production blocker.
5. **No indexer.** Operational state is read through RPC scripts (`npm run
   status:botchain`) until a real indexer exists.
6. **Evidence availability.** Checkpoint evidence URIs must point to durable
   storage. Choose that storage before the first real reservation.
7. **Legal review** of jurisdiction, bond model, and marketing claims.

Mark each gate as either *accepted*, *mitigated*, or *blocked* with names and
dates before proceeding. If any gate is *blocked*, stop.

## 2. Keys (EOA model)

- Generate three fresh roles for mainnet: `DEPLOYER`/`owner`,
  `ATTESTOR`, `RESOLVER`, plus an optional hot `BUYER` for smoke tests.
- Preferred: owner/attestor/resolver keys from a hardware wallet. If plain keys
  are used instead, generate them offline and store them encrypted at rest; do
  **not** run `npm run keys:generate` for any mainnet role (those are testnet
  burners by design, and the tool prints this warning).
- Never reuse Bohr testnet keys on mainnet, and never route the same key through
  both networks' addresses in user-facing docs.
- Record addresses (public) in the deployment record; keys never enter git,
  docs, chat, or `VITE_*` variables.
- Owner key = future ability to rotate attestor/resolver and set grace. Treat it
  with the highest custody tier; losing it means role changes become impossible
  (existing reservations still settle normally on their own deadlines).

## 3. Funding

- BOT is native gas + bond asset. Mainnet BOT is obtained via the official DEX
  (`dex.botchain.ai`) or bridge — there is no faucet.
- Minimum deployer balance for deployment: **0.05 BOT** (script-enforced).
  Keep a comfortable buffer: role maintenance, verification, and monitoring
  transactions are all paid gas.
- `eth_getLogs` is **disabled** on the official mainnet endpoint; scripts here
  poll state via `getReservation`/`vaultAccounting` instead, and the web app
  does not depend on `getLogs` for its live reads. Never add `getLogs`-based
  tooling against the default endpoint without adding a third-party RPC.

## 4. Configuration

`.env` (gitignored) must contain:

```text
BOT_MAINNET_RPC_URL=https://rpc.botchain.ai
GRACE_PERIOD_SECONDS=<policy decision, 120–604800>

DEPLOYER_PRIVATE_KEY=<production owner key>
ATTESTOR_ADDRESS=<production attestor>
RESOLVER_ADDRESS=<production resolver>
```

Frontend build (the production bundle already targets mainnet; a testnet build
would set `VITE_BOND_NETWORK=testnet`):

```text
VITE_BOND_NETWORK=mainnet   # default; set to "testnet" for a Bohr bundle
VITE_RPC_URL=https://rpc.botchain.ai   # optional override
```

The deploy script enforces: explicit `--network botchain`, chain id `677`,
`DEPLOY_CONFIRM_MAINNET=1` in the current session, distinct non-zero roles,
grace in bounds, non-zero and ≥0.05 BOT balance. These guards failing loudly is
the intended behavior.

## 5. Deploy sequence

```bash
npm ci
npm run compile && npm test          # 15 contract + 10 protocol tests
npm run typecheck && npm run build
npm run deploy:botchain              # with DEPLOY_CONFIRM_MAINNET=1 set
npm run sanity:botchain              # MUST pass before anything else
npm run verify:botchain              # source verification on scan.botchain.ai
```

The deploy writes `deployments/botchain.json` and regenerates
`packages/chain/src/abi.generated.ts` (already network-neutral). Commit the
deployment record. Verify on-chain in a browser: explorer address/tx links,
owner, attestor, resolver, and grace all match the record.

`sanity:botchain` fails loudly if: code is absent, roles/grace diverge from the
record, the EIP-712 domain chain id is wrong, or the vault is not empty and
unencumbered. Never move funds before sanity passes.

## 6. Verification

Both explorers expose the Etherscan-style API without an API key (verified
against `scan.botchain.ai/api`); `hardhat.config.ts` registers both chains as
custom chains. If the automated flow ever fails, verify manually through the
explorer UI with the constructor args from the deployment record and record the
outcome. Unverified mainnet contracts are an absolute no-go — users cannot
independently confirm what they are signing.

## 7. Release gate and rollout

- Rehearse the full lifecycle on Bohr first, on the **same commit** you intend
  to deploy (`deployments/acceptance-bohr.json` style evidence).
- Optional, run once, immediately post-deploy: `ACCEPT_MAINNET=1 npm run
  accept:botchain`. It is gas-only (bonds return to the provider), but writes
  two permanent public reservations under the acceptance provider identity and
  exercises the real attestor/resolver. Decide publicly whether the workspace
  record shows these test artifacts.
- **Do not seed demo data on mainnet** (`accept:botchain` never runs
  `seed-demo`; the seed script hard-refuses non-testnet networks).
- Rebuild and redeploy the web app (defaults to the mainnet bundle) so the
  bundle points at the mainnet record, then re-check the live workspace checks
  in `docs/runbook.md` section 9 against chain 677.
- Announce the contract address out-of-band with the explorer link and ask
  early users to confirm the address on-chain before depositing.

## 8. Operations (steady state)

- Monitor: `npm run status:botchain` on a schedule; alert on any non-Draft
  reservation entering `Disputed` (resolver action required) and on any
  `vaultAccounting` invariant drift.
- Role changes: follow `docs/runbook.md` section 10; keep the changelog.
- Incident response: `docs/runbook.md` section 11 plus `docs/resolver-continuity.md`.

## 9. Evidence to collect (archive to `deployments/`)

| Artifact | File |
| --- | --- |
| Mainnet deployment record | `deployments/botchain.json` |
| Sanity run output | `deployments/sanity-botchain.json` (attach in PR/message) |
| Explorer verification link | URL recorded with the deployment record |
| Optional acceptance proof | `deployments/acceptance-botchain.json` |
| Rehearsal acceptance proof | `deployments/acceptance-bohr.json` (same commit) |

## 10. Still recommended after v1

1. Independent audit before material value flows.
2. Multisig (Safe) ownership with a role-change delay.
3. Attestor quorum or threshold signatures.
4. Indexer + alerting; replace polling with event subscriptions on a
   third-party RPC.
5. License selection (repository currently has none).
6. Frontend test coverage (currently none).
