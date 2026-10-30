# Acceptance plan and evidence

## Current status

| Layer | Result | Evidence |
| --- | --- | --- |
| Contract unit/integration tests | 15 passing | `npx hardhat test` |
| Shared protocol tests | 10 passing | `npm run test -w @capacitybond/chain` |
| Root typecheck | Passing | `npx tsc --noEmit -p tsconfig.json` |
| Web typecheck | Passing | `npm run typecheck -w @capacitybond/web` |
| Production build | Passing | `npm run build` |
| Responsive visual review | Passed at 1440 and 390 CSS px | local CDP captures |
| Live Bohr deployment | Passed | `0x25BBa32bb19E495aA70D8E07b25DE0D42ED0C425` |
| Live end-to-end acceptance | 13/13 checks passed | `deployments/acceptance-bohr.json` |
| Independent audit | Not performed | explicitly out of scope |

Live evidence:

- Contract: https://scan.bohr.life/address/0x25BBa32bb19E495aA70D8E07b25DE0D42ED0C425
- Deploy tx: https://scan.bohr.life/tx/0x2711388788f086fedfd9fe401ba483b4114e171d631bd9b7d128595e149e25f9
- Acceptance: reservations #3 (fulfilled) and #4 (disputed/resolved), final locked,
  withdrawable, and surplus all `0.0`

## Local automated coverage

Contract tests cover:

- provider registration and duplicate prevention;
- provider-only profile updates;
- deterministic checkpoint count and field limits;
- self-buying, zero bond, expired acceptance, and invalid windows;
- exact bond deposit and no withdrawal while allocated;
- mutual acceptance and activation;
- funded-expiry refund;
- EIP-712 checkpoint acceptance and replay rejection;
- wrong signer, future observation, out-of-window evidence, empty evidence;
- full bond release after checkpoints and service end;
- grace-gated claim, buyer dispute, resolver split;
- undisputed missed-checkpoint release;
- completion rejection when checkpoints are missing;
- claim rejection when checkpoints are complete;
- role separation and owner-only administration;
- vault balance invariant.

Shared package tests cover formatting, status labels, relative deadlines, coverage, and
the transaction reducer.

## Live acceptance procedure

Prerequisites: a fresh deployment, funded deployer, correct attestor/resolver keys, and
a configured `.env`. Run:

```bash
npm run accept:bohr
```

The script waits for chain time and writes `deployments/acceptance-bohr.json`. It does
not use mocked time.

### Scenario A: fulfilled reservation

1. Create reservation A for the buyer with a 0.01 BOT bond.
2. Deposit the exact bond.
3. Provider accepts.
4. Buyer accepts.
5. Verify status is Active.
6. Wait for the service window.
7. Submit two attestor-signed checkpoints.
8. Verify checkpoint count is 2.
9. Wait for service end.
10. Mark fulfilled.
11. Verify status is Fulfilled.
12. Verify provider split is 10000 bps.
13. Verify provider credit is at least the bond.
14. Withdraw provider credit.

### Scenario B: missed checkpoint, claim, dispute, resolver

1. Create reservation B with a 0.006 BOT bond.
2. Fund and mutually accept.
3. Submit no checkpoints.
4. Wait through the configured grace period.
5. Mark claimable.
6. Verify status is Claimable.
7. Buyer opens a dispute with a statement reference.
8. Verify status is Disputed.
9. Resolver records a 5000 bps split with a resolution reference.
10. Verify status is Resolved and the split is 5000 bps.
11. Verify the buyer credit increases by exactly half the bond.
12. Withdraw buyer and provider credits.

### Vault checks

On a fresh deployment, after both scenarios:

```text
locked collateral = 0
withdrawable total = 0
unexplained surplus = 0
contract balance = 0
```

The script records each check as PASS/FAIL and exits non-zero on failure.

## Manual browser acceptance

The automated script cannot exercise an injected wallet. A human should verify:

- connect/disconnect and account changes;
- Bohr chain switch and wrong-network state;
- reservation creation from the provider UI;
- exact bond deposit from the provider wallet;
- acceptance from buyer and provider wallets;
- attestor typed-data prompt and checkpoint submission;
- claim/dispute form from the buyer wallet;
- resolver form from the resolver wallet;
- withdraw from both credit recipients;
- explorer links for transactions and addresses;
- refresh after confirmation;
- fixture labels absent on the live deployment.

## Evidence to retain

- `deployments/bohr.json` (contract, roles, grace, deployment tx);
- `deployments/seed-bohr.json` (demo reservations and transactions);
- `deployments/acceptance-bohr.json` (checks and transactions);
- explorer URLs for deployment and all acceptance transactions;
- a note of the browser and wallet versions used for manual checks.

## Sign-off template

```text
Deployment chain: 968
Contract: 
Deployment tx: 
Attestor: 
Resolver: 
Grace period: 
Acceptance timestamp: 
Automated checks: __ / __ passed
Manual wallet checks: __ / __ passed
Known exceptions: 
Reviewer: 
```

## Limitations

- The local tests use Hardhat time travel, not Bohr's live block timing.
- The acceptance script relies on the configured single attestor and resolver.
- It cannot validate actual compute delivery or evidence content.
- It does not prove absence of all contract bugs.
- No third-party audit has been performed.
