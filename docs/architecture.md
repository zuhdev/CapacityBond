# Architecture

## System shape

```text
 provider wallet                buyer wallet                 resolver wallet
        |                            |                            |
        +-------------+--------------+-------------+--------------+
                      |                            |
                      v                            v
              CapacityBond.sol  <---- typed data ---- attestor wallet
              (Bohr Testnet)          checkpoints
                      |
                      v
             public RPC / explorer
                      |
                      v
          React workspace (viem reads and writes)
```

There is no backend, database, indexer, or custody service. The contract is the source
of truth for reservations, checkpoints, credits, and role configuration. The browser
reads through the configured RPC and asks an injected wallet to sign transactions and
checkpoint typed data.

## Roles

| Role | Powers | Limits |
| --- | --- | --- |
| Owner | Set attestor, resolver, and grace period; two-step ownership transfer | Cannot move user credits or edit reservations |
| Provider | Register/update profile; create reservations; deposit exact bond; accept | Cannot accept for the buyer, withdraw before settlement, or change terms after creation |
| Buyer | Accept; open a dispute inside a claim window; withdraw credits | Cannot create or fund the reservation |
| Attestor | Sign checkpoints | Anyone may submit a valid signature; no direct fund access |
| Resolver | Split a disputed bond and record a reference | Only while Disputed; no arbitrary drain of other reservations |
| Anyone | Call fulfillment, claim opening, undisputed release after deadline, expiry after deadline | State and time checks still apply |

## Contract data

`ProviderProfile` stores a public name, contact string, metadata URI, timestamps, and
an active flag. Profiles are contact infrastructure, not a reputation score.

`Reservation` fixes:

- provider and buyer;
- agreement hash and URI, capacity statement;
- native-BOT bond amount;
- service start/end, acceptance deadline, claim window, checkpoint interval;
- required checkpoint count and policy version;
- acceptance and resolution timestamps;
- status, split, and written dispute/resolution references.

`Checkpoint` stores the recovered attestor, submitter, observed and submitted times,
evidence hash, and evidence URI. Checkpoints are append-only.

## State machine

```text
Draft
  depositBond -> Funded
  expireReservation after deadline -> Expired

Funded
  acceptReservation by provider and buyer -> Active
  expireReservation after deadline -> Expired (bond credited to provider)

Active
  markFulfilled after service end with all checkpoints -> Fulfilled
  markClaimable after service end + grace with missing checkpoints -> Claimable

Claimable
  openDispute by buyer inside claim window -> Disputed
  releaseUndisputed after claim window -> Resolved (provider credited)

Disputed
  resolveDispute by resolver -> Resolved (split credited)

Fulfilled / Resolved / Expired
  terminal; credits withdrawn by the credited account
```

A reservation with missing checkpoints can also be released from `Active` after the
full grace + claim-window period without first opening the claim state. This prevents
an untouched claim from locking collateral forever. The provider receives the bond.

## Checkpoint authorization

Checkpoints use EIP-712:

```text
domain: CapacityBond / 1 / chainId 968 / verifyingContract
type:   Checkpoint(
          uint256 reservationId,
          uint256 sequence,
          uint64 observedAt,
          bytes32 evidenceHash,
          string evidenceURI
        )
```

The contract checks:

1. reservation is Active;
2. sequence is exactly the next index;
3. observed time is inside the service window and not in the future;
4. submission is not after service end plus grace;
5. evidence hash and URI are present and bounded;
6. observed time is strictly after the previous checkpoint;
7. `ECDSA.recover` equals the current attestor.

A signature proves the configured attestor authorized those values. It does not prove
hardware execution, capacity availability, or quality satisfaction.

## Accounting

All money is native BOT. There are no ERC-20 tokens, allowances, fees, or yield.

When a bond is deposited:

```text
lockedCollateral += msg.value
address(this).balance += msg.value
```

At settlement or expiry:

```text
lockedCollateral -= bond
totalWithdrawable += credited amount
_withdrawable[account] += credited amount
```

Withdrawal:

```text
_withdrawable[msg.sender] = 0
totalWithdrawable -= amount
safe call value to msg.sender
```

Invariant:

```text
address(this).balance >= lockedCollateral + totalWithdrawable
```

`vaultAccounting.surplus` is any balance above those liabilities. Forced BOT can create
a surplus but cannot create a claim on user funds. Every state-changing path is bounded
by status, role, and time. `withdraw` is `nonReentrant` and state is cleared before the
external call.

## Repayment and split rules

- Fulfillment: 100% of the bond credited to the provider.
- Undisputed missed-checkpoint release: 100% to the provider.
- Resolver split: `providerAmount = bond * bps / 10000`; remainder to the buyer.
- Expiry before activation: 100% of the funded bond credited back to the provider.
- No party can withdraw another party's credit.

Rounding is in favor of the buyer by at most one wei because the provider share is
floored.

## Frontend

`apps/web` is a Vite application with hash routing and no server component.

| Module | Responsibility |
| --- | --- |
| `src/lib/contract.ts` | Public client, ABI, deployment address, normalizers, checkpoint domain |
| `src/hooks/useProtocol.ts` | Snapshot of reservations, providers, accounting, checkpoint counts |
| `src/hooks/useReservationDetail` | One reservation plus its checkpoints |
| `src/hooks/useWallet.tsx` | Injected wallet, Bohr chain switching, writes, typed-data signing |
| `src/hooks/useTx.ts` | Signing, submission, receipt waiting, confirmation state |
| `src/lib/routes.ts` | Hash route parsing and navigation |
| `src/pages/*` | Landing, ledger, create, providers, detail |
| `packages/chain` | Shared types, ABI, formatting, deadlines, coverage, demo fixtures |
| `packages/ui` | Buttons, badges, fields, meters, notices, address chips |

### Read path

The ledger reads `nextReservationId`, `providerCount`, roles, grace period, and vault
accounting, then fetches up to the latest 60 reservations and 40 providers with bounded
concurrency. Each reservation also reads its checkpoint count. Reservation detail reads
the full checkpoint array.

### Write path

1. The wallet must be on chain 968; otherwise `wallet_switchEthereumChain` is used and
   `wallet_addEthereumChain` is attempted if the chain is unknown.
2. A write is sent to the deployed contract with a typed ABI call.
3. `useTx` waits for one confirmation and only then reports "Confirmed on Bohr".
4. A successful action refreshes protocol and detail state.

### Configuration

`CONTRACT_ADDRESS` comes from `VITE_CAPACITY_BOND_ADDRESS`, otherwise from
`apps/web/../..` `deployments/bohr.json` through `packages/chain`. Because the record is
bundled at build time, changing deployments requires a rebuild.

When no address is configured:

- `IS_DEMO` is true;
- reads return fixtures from `packages/chain/src/demo.ts`;
- all write actions are blocked with an explicit label;
- the dashboard displays "Fixture data".

### Activity feed

The live "Recent state" list is derived from current reservation fields. It is not an
event indexer; timestamps and summaries are local projections, and its hash fields are
placeholders. A production version should replace it with an indexer or explorer API
and label it as an event feed. The UI avoids calling it an event log.

## Deployment flow

`scripts/deploy.ts` validates chain 968, role separation, grace bounds, and a non-zero
deployer balance. It deploys, waits for receipt, writes `deployments/bohr.json`, and
regenerates `packages/chain/src/abi.generated.ts` from the artifact.

`scripts/acceptance.ts` exercises a fulfilled reservation and a missed-checkpoint
dispute on a fresh contract. `scripts/seed-demo.ts` creates the public fixture set for
the UI. The intended order is deploy, acceptance, seed, rebuild.

## Known architectural limits

- A single attestor can censor or fabricate checkpoint records within its authority.
- A single resolver controls disputed splits.
- Evidence storage and availability are out of scope.
- There is no indexer, notifications, or background transaction relaying.
- Test BOT has no value and no production key-management model.
- No formal audit, fuzzing campaign, or invariant test suite exists yet.
