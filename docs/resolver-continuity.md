# Resolver continuity

The resolver (`resolveDispute`) is the only role that can release a bond stuck in
the `Disputed` state. The v1 contract has **no on-chain fallback**: if the
resolver key is lost, compromised, or the operator refuses to act, any disputed
reservation stays locked indefinitely while every undisputed reservation still
settles by its own deadline.

This is the known production blocker from `docs/runbook.md` and
`docs/threat-model.md`. This document states what can be done today, and what a
future version should build.

## Today: operational mitigations (no contract change)

### 1. Backup rotation path (required before first mainnet dispute)

The owner can call `setResolver(newAddress)`, so the resolver key itself is
replaceable:

1. Generate a **backup resolver key** (hardware wallet if possible) and store it
   with the same custody tier as the owner key, funded with gas money.
2. Run the whole flow on the backup at least once on Bohr (or in a forked sim)
   before ever relying on it.
3. If the primary resolver key is lost: owner confirms the situation out-of-band
   (two-party rule, e.g. a second person announces the rotation), calls
   `setResolver(backup)`, then completes any pending dispute from the backup.

Watch out: rotation only future-proofs. If the owner key is ALSO lost, disputed
funds are permanently stuck — that is the hard floor of the v1 design. Hence the
owner + resolver backup pair must never share a single failure domain (no same
password manager, no same machine, no same person ideally).

### 2. Monitoring (required)

Run `npm run status:botchain` on a schedule. Every reservation that enters
`Disputed` must page a human. The dispute is resolved by the resolver calling
`resolveDispute(reservationId, providerAwardBps, resolutionURI, resolutionHash)`
within the operator's own SLA — the contract has no deadline for the resolver,
so the SLA lives in this policy and users should know it before depositing.

### 3. Resolver liveness drill (recommended)

Quarterly: verify the current resolver (or its backup) can actually import its
key, submit a transaction on the right chain, and produce a valid dispute
resolution on Bohr. Record the drill date. A backup path that has never been
executed is not a mitigation.

### 4. User-facing honesty

Keep the workspace docs explicit: disputes are handled by a trusted operator
within a published SLA. Do not imply there is an arbitration protocol when
there is not.

## v2 design candidates (require a re-audit)

Ranked by effort-to-benefit:

1. **Dispute timeout with a neutral outcome.** If the resolver has not resolved
   within `disputeTimeout`, the bond releases on the *buyer-favorable* 50/50
   split (or another bounded default). Loss of resolution quality beats
   permanent lockup.
2. **Multi-resolver set.** Accept a resolution signed by M-of-N configured
   resolvers; rotate membership sub-set-wise so one lost key no longer freezes
   the path.
3. **Resolver = Safe multisig.** Cheapest hardening: encode redundancy at the
   key-management layer, not the contract layer. Rotation then needs no contract
   change at all (and the same should apply to the owner).
4. **Role-change delay.** Queue `setResolver`/`setAttestor`/`setGracePeriod`,
   delay execution, allow challenge — protects users against a compromised
   owner swapping in a malicious resolver silently mid-dispute.
5. **Arbitration hook.** Let a reservation point at an explicitly chosen
   arbitration contract for the specific case, with the default resolver as
   fallback.

## Incident tree (quick reference)

```text
Reservation enters Disputed
├─ resolver key available
│   └─ resolveDispute(...) within SLA; record tx + written resolution
├─ resolver key lost / compromised
│   ├─ owner key available
│   │   └─ announce → setResolver(backup) → backup resolves
│   └─ owner key lost too
│       └─ FUNDS STUCK (accepted v1 risk) → publish post-mortem, keep the
│           reservation in ledger context, plan the v2 timeout mechanism
└─ resolver refuses / disappears (legal, staff change)
    └─ treat as "key lost": rotate to a backup controlled by a different
        accountable person, never by the same admin account
```

The rotation, monitoring, and drill steps above are **preconditions for calling
any mainnet deployment production-ready**. If they are not in place, treat the
attendance of contested reservations as unrecoverable by design.
