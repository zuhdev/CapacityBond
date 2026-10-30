import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import {
  chainNow,
  confirm,
  ensureGas,
  hashText,
  readDeployment,
  requireEnv,
  signCheckpoint,
  sleepUntil,
} from "./lib";

async function main() {
  const deployment = readDeployment();
  const [provider] = await ethers.getSigners();
  if (!provider) throw new Error("No deployer/provider signer. Set DEPLOYER_PRIVATE_KEY.");
  const buyer = new ethers.Wallet(requireEnv("BUYER_PRIVATE_KEY"), ethers.provider);
  const resolver = new ethers.Wallet(requireEnv("RESOLVER_PRIVATE_KEY"), ethers.provider);
  const attestor = new ethers.Wallet(requireEnv("ATTESTOR_PRIVATE_KEY"));

  await ensureGas(buyer, "buyer");
  await ensureGas(resolver, "resolver");
  await ensureGas(provider, "provider/deployer");

  const bond: any = await ethers.getContractAt("CapacityBond", deployment.address);
  const buyerSide = bond.connect(buyer);
  const resolverSide = bond.connect(resolver);
  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
  const txHashes: string[] = [];
  const record = (name: string, passed: boolean, detail?: string) => {
    checks.push(detail === undefined ? { name, passed } : { name, passed, detail });
    console.log(`  ${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  console.log("CapacityBond end-to-end acceptance");
  console.log(`  contract ${deployment.address}`);
  console.log(`  provider ${provider.address}`);
  console.log(`  buyer    ${buyer.address}`);
  console.log(`  resolver ${resolver.address}`);

  const profile = await bond.getProvider(provider.address);
  if (!profile.active) {
    const tx = await bond.registerProvider(
      "CapacityBond Acceptance Provider",
      "acceptance@capacitybond.test",
      "urn:capacitybond:acceptance:provider",
    );
    await confirm("register provider", tx);
    txHashes.push(tx.hash);
  }

  // Scenario A: complete checkpoints, release the full bond, and withdraw.
  console.log("\nScenario A — fulfilled reservation");
  const startA = (await chainNow()) + 45;
  const endA = startA + 60;

  let tx = await bond.createReservation(
    buyer.address,
    ethers.parseEther("0.01"),
    hashText("urn:capacitybond:acceptance:agreement:A"),
    "urn:capacitybond:acceptance:agreement:A",
    "2 simulated checkpoints for acceptance",
    startA,
    endA,
    startA - 10,
    3600,
    30,
  );
  await confirm("create reservation A", tx);
  txHashes.push(tx.hash);
  const reservationA = Number(await bond.nextReservationId()) - 1;
  record("create reservation A", reservationA > 0, `reservation #${reservationA}`);

  tx = await bond.depositBond(reservationA, { value: ethers.parseEther("0.01") });
  await confirm("deposit bond A", tx);
  txHashes.push(tx.hash);
  tx = await bond.acceptReservation(reservationA);
  await confirm("provider accepts A", tx);
  txHashes.push(tx.hash);
  tx = await buyerSide.acceptReservation(reservationA);
  await confirm("buyer accepts A", tx);
  txHashes.push(tx.hash);

  record(
    "reservation A activates only after both accept",
    (await bond.getReservation(reservationA)).status === 2n,
  );

  await sleepUntil(startA + 35, "first checkpoint window");
  for (const sequence of [1, 2]) {
    const observedAt = startA + (sequence === 1 ? 2 : 32);
    const evidenceURI = `urn:capacitybond:acceptance:checkpoint:A:${sequence}`;
    const evidenceHash = hashText(evidenceURI);
    const signature = await signCheckpoint(attestor, deployment.address, deployment.chainId, {
      reservationId: BigInt(reservationA),
      sequence: BigInt(sequence),
      observedAt,
      evidenceHash,
      evidenceURI,
    });
    tx = await bond.submitCheckpoint(
      reservationA,
      sequence,
      observedAt,
      evidenceHash,
      evidenceURI,
      signature,
    );
    await confirm(`submit checkpoint A${sequence}`, tx);
    txHashes.push(tx.hash);
  }

  const countA = await bond.checkpointCount(reservationA);
  record("two attestor checkpoints are stored", countA === 2n, `${countA} checkpoints`);

  await sleepUntil(endA + 2, "service end A");
  tx = await bond.markFulfilled(reservationA);
  await confirm("mark A fulfilled", tx);
  txHashes.push(tx.hash);
  let reservation = await bond.getReservation(reservationA);
  record("reservation A reaches Fulfilled", reservation.status === 3n);
  record("provider receives the full bond split", reservation.providerAwardBps === 10_000n);

  const providerWithdrawable = await bond.withdrawable(provider.address);
  record(
    "provider has withdrawable collateral",
    providerWithdrawable >= ethers.parseEther("0.01"),
    ethers.formatEther(providerWithdrawable),
  );
  tx = await bond.withdraw();
  await confirm("provider withdraws", tx);
  txHashes.push(tx.hash);

  // Scenario B: no checkpoints, claim window, buyer dispute, resolver split.
  console.log("\nScenario B — missed-checkpoint claim and dispute");
  const startB = (await chainNow()) + 45;
  const endB = startB + 60;
  tx = await bond.createReservation(
    buyer.address,
    ethers.parseEther("0.006"),
    hashText("urn:capacitybond:acceptance:agreement:B"),
    "urn:capacitybond:acceptance:agreement:B",
    "No checkpoint submitted for acceptance scenario B",
    startB,
    endB,
    startB - 10,
    3600,
    30,
  );
  await confirm("create reservation B", tx);
  txHashes.push(tx.hash);
  const reservationB = Number(await bond.nextReservationId()) - 1;

  tx = await bond.depositBond(reservationB, { value: ethers.parseEther("0.006") });
  await confirm("deposit bond B", tx);
  txHashes.push(tx.hash);
  tx = await bond.acceptReservation(reservationB);
  await confirm("provider accepts B", tx);
  txHashes.push(tx.hash);
  tx = await buyerSide.acceptReservation(reservationB);
  await confirm("buyer accepts B", tx);
  txHashes.push(tx.hash);

  const claimOpensAt = endB + deployment.gracePeriodSeconds;
  await sleepUntil(claimOpensAt + 3, "claim grace period");
  tx = await bond.markClaimable(reservationB);
  await confirm("mark B claimable", tx);
  txHashes.push(tx.hash);
  reservation = await bond.getReservation(reservationB);
  record("reservation B reaches Claimable", reservation.status === 4n, `claim deadline ${reservation.claimDeadline}`);

  const statementURI = "urn:capacitybond:acceptance:statement:B";
  const statementHash = hashText(statementURI);
  tx = await buyerSide.openDispute(reservationB, statementURI, statementHash);
  await confirm("buyer opens dispute", tx);
  txHashes.push(tx.hash);
  reservation = await bond.getReservation(reservationB);
  record("buyer dispute moves B to Disputed", reservation.status === 5n);

  const resolutionURI = "urn:capacitybond:acceptance:resolution:B";
  const resolutionHash = hashText(resolutionURI);
  const beforeBuyer: bigint = await bond.withdrawable(buyer.address);
  tx = await resolverSide.resolveDispute(reservationB, 5000, resolutionURI, resolutionHash);
  await confirm("resolver splits B 50/50", tx);
  txHashes.push(tx.hash);
  reservation = await bond.getReservation(reservationB);
  record("resolver split is recorded", reservation.status === 6n && reservation.providerAwardBps === 5000n);

  const afterBuyer: bigint = await bond.withdrawable(buyer.address);
  record(
    "buyer is credited half the bond",
    afterBuyer - beforeBuyer === ethers.parseEther("0.003"),
    ethers.formatEther(afterBuyer - beforeBuyer),
  );
  await ensureGas(buyer, "buyer");
  tx = await buyerSide.withdraw();
  await confirm("buyer withdraws", tx);
  txHashes.push(tx.hash);
  tx = await bond.withdraw();
  await confirm("provider withdraws dispute share", tx);
  txHashes.push(tx.hash);

  const accounting = await bond.vaultAccounting();
  record("no locked collateral remains", accounting.locked === 0n, ethers.formatEther(accounting.locked));
  record(
    "no withdrawable liabilities remain",
    accounting.withdrawableTotal === 0n,
    ethers.formatEther(accounting.withdrawableTotal),
  );
  record(
    "vault has no unexplained surplus",
    accounting.surplus === 0n,
    ethers.formatEther(accounting.surplus),
  );

  const failed = checks.filter((check) => !check.passed);
  const output = {
    acceptedAt: new Date().toISOString(),
    contract: deployment.address,
    chainId: deployment.chainId,
    reservations: { fulfilled: reservationA, disputed: reservationB },
    provider: provider.address,
    checks,
    transactions: txHashes,
  };
  mkdirSync(resolve(process.cwd(), "deployments"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), "deployments/acceptance-bohr.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );

  console.log(`\n${checks.length - failed.length}/${checks.length} acceptance checks passed`);
  console.log("Proof: deployments/acceptance-bohr.json");
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
