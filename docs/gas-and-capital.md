# Gas and capital plan

## Assumptions

- Native BOT only. There is no ERC-20 wrapper, fee token, or paymaster dependency.
- Bohr gas price observed during research: 20 gwei.
- The provider pays deployment, reservation creation, bond deposit, checkpoint
  submission, fulfillment, and provider-side withdrawal gas.
- The buyer pays acceptance and dispute gas.
- The resolver pays resolution gas.
- The contract does not reimburse gas.
- Gas values are local Hardhat measurements; a live Bohr receipt summary is included below.

Reproduce with:

```bash
npm run gas:report
```

## Measured operation gas

| Operation | Gas |
| --- | ---: |
| Deploy CapacityBond | 3,790,179 |
| Register provider | 164,787 |
| Create reservation | 283,588 |
| Deposit bond | 66,588 |
| Accept as provider | 36,061 |
| Accept as buyer | 45,067 |
| Submit checkpoint | 223,967 |
| Mark fulfilled | 95,166 |
| Withdraw credit | 36,304 |
| Create claim-path reservation | 283,624 |
| Deposit claim-path bond | 66,588 |
| Mark claimable | 38,651 |
| Open dispute | 102,189 |
| Resolve dispute 50/50 | 205,772 |
| Withdraw buyer credit | 37,779 |

The gas report's measured total across the deployment and two lifecycle scenarios is
5,593,742 gas. At 20 gwei that is **0.11187484 BOT** in estimated fees.

## Live Bohr receipts

Confirmed on Bohr on 2026-10-30, summed from transaction receipts at 20 gwei:

| Group | Txs | Gas | Fee |
| --- | ---: | ---: | ---: |
| Deploy | 1 | 3,790,167 | 0.07580334 BOT |
| Live acceptance | 17 | 1,938,883 | 0.03877766 BOT |
| Demo seed | 18 | 2,508,590 | 0.05017180 BOT |
| **Total** | **36** | **8,237,640** | **0.16475280 BOT** |

The acceptance group includes buyer/resolver gas top-ups, and the seed group includes
the provider profile update and the completed-fixture withdrawal.

## Fee sensitivity

| Gas price | Deployment fee | Deployment + two scenarios |
| --- | ---: | ---: |
| 10 gwei | 0.03790179 BOT | 0.05593742 BOT |
| 20 gwei | 0.07580358 BOT | 0.11187484 BOT |
| 50 gwei | 0.18950895 BOT | 0.27968710 BOT |

Live gas price and gas used may differ. Leave headroom.

## Demo seed estimate

The three seed fixtures require roughly 2.4 million gas, or about **0.049 BOT** at
20 gwei (live Bohr run: 2,508,590 gas / 0.05017180 BOT). The exact figure depends on
whether the provider profile already exists and on checkpoint submission gas.

The seed fixtures require these bonds:

| Fixture | Bond | Final state |
| --- | ---: | --- |
| Active reservation | 0.05 BOT | locked |
| Completed reservation | 0.02 BOT | returned to provider |
| Funded, awaiting buyer | 0.01 BOT | locked |

Peak demo bond capital is 0.08 BOT. After the completed fixture is withdrawn, 0.06 BOT
remains locked.

## Acceptance estimate

The live acceptance script creates two temporary bonds:

- 0.01 BOT for the fulfilled scenario;
- 0.006 BOT for the disputed scenario.

Both are returned to provider/buyer credits and withdrawn during the run. Peak temporary
bond capital is 0.016 BOT.

## Recommended deployer balance

| Use | Approximate BOT |
| --- | ---: |
| Deployment gas | 0.076 |
| Acceptance gas + temporary bonds | 0.05 |
| Seed gas | 0.049 |
| Seed bonds | 0.08 |
| Gas top-ups for buyer/resolver | 0.01 |
| Failure and price headroom | 0.035 |
| **Recommended balance** | **0.30** |

The faucet serves 10 BOT per address per 24 hours, so one successful claim is enough
for this testnet run. The recommended figure is intentionally conservative; a
zero-balance deployer aborts before sending a transaction.

## Capital at risk

This is not an investment product and there is no yield. BOT in the contract is
collateral for the named reservation. The maximum loss in the test fixture set is the
locked provider bond, subject to the claim and resolver rules.

No fee or protocol revenue is implemented. The contract never lends, stakes, bridges,
or deploys capital elsewhere.

## Production considerations

Before production, measure live Bohr gas, test gas-price spikes, add an independent
balance monitor, and decide who pays attestor submission gas. A paymaster or relay
would change the onboarding model and must not be assumed until confirmed.
