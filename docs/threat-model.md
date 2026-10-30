# Threat model

This is a testnet design review, not a security audit. No independent review has been
performed.

## Assets

- Native BOT bonds held by the contract.
- Withdrawable credits owed to providers and buyers.
- Integrity of the reservation and checkpoint records.
- Role configuration: owner, attestor, resolver.
- User private keys and transaction signing.
- Public trust in the labels and claims shown by the interface.

## Actors

- Provider: locks the bond and supplies compute off-chain.
- Buyer: accepts terms and may claim or dispute.
- Attestor: signs checkpoint observations.
- Resolver: splits a disputed bond.
- Owner: changes roles and the grace period; cannot move user credits directly.
- Outsider: may submit signed checkpoints, trigger fulfillment, open claims, release
  undisputed bonds after deadlines, or expire drafts.
- Chain/network operator: controls inclusion, reorgs, and RPC availability.
- Frontend host: serves the application and bundled contract address.

## Trust assumptions

1. The attestor key is controlled by an honest test operator. The protocol does not
   verify compute quality or hardware.
2. The resolver key is controlled by an honest test operator. A dispute is only as
   fair as that operator.
3. The owner key is not compromised. A malicious owner can replace the attestor or
   resolver and change the grace period for future state transitions.
4. The buyer and provider are responsible for the off-chain agreement, its evidence,
   and the availability of its references.
5. Users verify the contract address and chain before signing.
6. Bohr testnet may halt, reorg, or change behavior without notice.

## Threats and mitigations

| Threat | Impact | Mitigation | Residual risk |
| --- | --- | --- | --- |
| Attestor signs a false checkpoint | False completion record | Explicit trust label; evidence reference; buyer claim window | Attestor can still authorize false observations |
| Attestor censors checkpoints | Provider unable to complete | No direct fund access; missed-checkpoint path returns bond after window | Service record can be incomplete |
| Provider never delivers compute | Buyer paid for nothing | Buyer claim if checkpoints missing; resolver split if disputed | Actual service quality is unverifiable |
| Buyer opens a false claim | Provider funds delayed | Claim only after grace; buyer needs a valid claim state; resolver decides dispute | Time and resolver cost remain |
| Resolver colludes or errs | Unfair split | Bounded to the disputed reservation; written reference recorded | Trusted resolver can choose any split |
| Owner replaces roles | Changed trust model | `Ownable2Step`; role separation; events | Owner remains trusted |
| Replay a checkpoint signature | Duplicate record | Reservation ID, sequence, chain ID, contract, evidence, and observed time in digest; strict sequence/order | None found within contract checks |
| Submit future or out-of-window evidence | Invalid record | Contract checks observed time and submission deadline | Attestor can backdate within the window |
| Empty or malformed evidence | Unusable record | Non-empty hash and URI required; length caps | URI can point to unavailable content |
| Checkpoint spam | Gas and storage growth | Attestor signature required; max 100 checkpoints per reservation | Attestor can still spend gas |
| Reentrancy on withdrawal | Drain or accounting corruption | Checks-effects-interactions; `nonReentrant`; pull payments | None found |
| Forced BOT via self-destruct | Surplus in vault | Surplus accounted separately; cannot be withdrawn by users | Surplus has no recovery path |
| Withdraw a locked bond | Loss of collateral | Locked and withdrawable accounting are separate | Contract bug could still break invariant |
| Unauthorized acceptance | Wrong activation | Only provider/buyer can accept; once each; deadline and start checks | Key compromise |
| Acceptance expired but no expiry call | Stuck funded state | Anyone can call `expireReservation` after deadline | Requires a transaction |
| Claim window missed | Provider receives bond | Undisputed release after deadline | Buyer loses the opportunity |
| Resolver never acts | Bond stuck in Disputed | No fallback resolver in this version | Operational risk; needs a runbook/upgrade decision |
| Phishing frontend / wrong contract | Loss of funds | Address in deployment record; explorer links; fixture labels; chain switch | Users must verify the host and address |
| Key theft | Loss of role or bonded funds | Testnet-only burners; no production key management | No hardware wallet flow or multisig |
| Chain reorg | Receipt/state mismatch | Wait for confirmation; UI refreshes after receipt | Testnet may reorg after receipt |
| RPC outage or stale reads | UI shows stale state | Error notice; refresh; 25-second polling | No independent RPC fallback |
| Malicious evidence link | Browser exploit or phishing | Only HTTP(S)/IPFS converted to links; plain URNs shown as text | External content remains untrusted |

## Explicit non-goals

- Proving that capacity existed or met a benchmark.
- Confidentiality of agreement terms. Everything stored on-chain is public.
- Enforcing off-chain payment, delivery, or service-level terms.
- Insuring a buyer against loss beyond the provider's bond.
- Protecting against a compromised browser, wallet extension, or host.
- Providing yield, staking rewards, or tokenomics.

## Operational invariants to monitor

After every live scenario, verify:

```text
contract balance >= locked collateral + total withdrawable
locked collateral matches the sum of open bonds
terminal reservations have zero locked contribution
no unexplained surplus appears
```

The dashboard exposes `vaultAccounting`; the acceptance script checks these values on
a fresh deployment. Production monitoring would need an independent indexer and alerting.

## Review gates before any production use

1. Independent contract audit and invariant/fuzz testing.
2. Multisig ownership, separated production keys, and a role-change delay.
3. A second attestor or an explicit attestor set with threshold signatures.
4. Resolver fallback or a bounded timeout to avoid permanently stuck disputes.
5. Durable evidence storage and availability policy.
6. Indexed event history, monitoring, and alerting.
7. Legal and regulatory review of the specific jurisdiction and asset model.
