# Research notes

Research date: October 2026. Public chain and product documentation changes; re-check
the sources before a new deployment.

## Question

What is the narrowest useful on-chain instrument for compute reservations that are
negotiated off-chain, using BOT Chain's native asset and without pretending to verify
compute quality?

## BOT Chain and Bohr Testnet

Observed public configuration:

| Field | Value |
| --- | --- |
| Chain | BOT Chain |
| Testnet | Bohr Testnet |
| Chain ID | 968 (`0x3c8`) |
| RPC | https://rpc.bohr.life |
| Explorer | https://scan.bohr.life |
| Faucet | https://faucet.botchain.ai/basic |
| Website | https://www.botchain.ai/ |
| Native asset | BOT |
| Mainnet chain ID in public materials | 677 |

The RPC returned a gas price of 20 gwei during research. That value is used only as a
planning assumption in [gas-and-capital.md](gas-and-capital.md); the live chain decides
the price at transaction time.

The Bohr faucet serves 10 BOT per address per 24 hours and uses a Turnstile-style
browser challenge. It cannot be claimed unattended by a script. At least 0.3 BOT is
recommended for deployment, gas, and demo bonds.

### Account abstraction

The public bundler is `https://bundler.bohr.life/rpc`. The observed ERC-4337 v0.7
EntryPoint is `0x0000000071727de22e5e9d8baf0edac6f37da032`. No public paymaster was
confirmed. CapacityBond therefore uses ordinary EOA transactions and explicit test BOT
funding instead of depending on unverified gas sponsorship.

### Execution environment

BOT Chain documents EVM compatibility. The contract targets Cancun and uses Solidity
0.8.28 with `viaIR`; the deployed bytecode is 16,642 bytes, below the EIP-170 limit.
Cancun opcode support on the live Bohr network still needs to be confirmed by an
actual deployment. This is a deployment gate, not an assumed fact.

## Fluence comparison

Fluence's public materials describe capacity staking and delegation: token holders
stake FLT, delegate to capacity providers, and participate in provider pools with
thresholds and reward/penalty mechanics. Its ForwardCompute material describes risk
transfer for compute and was marked "coming soon" during research.

CapacityBond is a different primitive:

| Question | Fluence capacity staking | CapacityBond |
| --- | --- | --- |
| Unit | Delegated capacity and provider stake | One named reservation |
| Collateral source | Staked protocol token | Provider's native BOT bond |
| Counterparty | Delegators and providers | One provider and one buyer |
| Trigger | Protocol-level capacity participation | Missed checkpoint record |
| Settlement | Staking rewards and penalties | Full release, claim window, resolver split |
| Verification claim | Network/staking participation | Attestor authorization only |

CapacityBond does not compete for token yield. It provides no staking rewards, no
delegation, and no underwriting. It should not be marketed as a Fluence substitute.

## Product constraints discovered

1. No public BOT compute API or hardware-quality oracle was found. A "verified
   compute" claim would be unsupported.
2. Evidence references can rot. The agreement and evidence hashes fix a reference, not
   content availability.
3. A single attestor is a central trust assumption. The role is configured explicitly
   and labeled as a test attestor.
4. Native BOT has no ERC-20 approval flow. Bonds are exact-value deposits and payouts
   are pull payments.
5. A testnet user needs both bond capital and gas. Any onboarding flow that assumes
   sponsored gas would be misleading.

## Design consequences

- Keep the agreement off-chain and store only its reference and hash.
- Require mutual provider/buyer acceptance before activation.
- Use EIP-712 typed checkpoints bound to chain ID, contract, reservation, sequence,
  observed time, evidence hash, and evidence URI.
- Bound every claim with a grace period and a claim window.
- Give the resolver a split, not an unlimited emergency drain.
- Keep custody accounting explicit: `balance >= locked + withdrawable`.
- Label the attestor role and every fixture clearly in the interface.

## Open questions

- Does the live Bohr network accept Cancun bytecode and `mcopy`?
- What is the actual deployment gas cost and current gas price at deployment time?
- Will a public paymaster become available and change onboarding?
- Is there a durable BOT-native storage or indexing service for evidence references?
- Which BOT Chain explorer API, if any, should back a production activity feed?

## Sources

- https://www.botchain.ai/
- https://docs.botchain.ai/
- https://faucet.botchain.ai/basic
- https://scan.bohr.life/
- https://bundler.bohr.life/rpc/
- Public Fluence documentation and product pages reviewed during the same research pass.
