import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";
import {
  activeNetwork,
  chainNow,
  confirm,
  ensureGas,
  hashText,
  readDeployment,
  requireEnv,
  signCheckpoint,
  sleepUntil,
} from "./lib";

const PROVIDER_NAME = "Northstar Compute (Bohr test fixture)";

async function main() {
  const target = activeNetwork();
  if (!target.testnet) {
    throw new Error(
      "Seed creates demo fixtures and must never run on a production deployment. Use a testnet environment.",
    );
  }
  const deployment = readDeployment();
  const [provider] = await ethers.getSigners();
  if (!provider) throw new Error("No deployer signer. Set DEPLOYER_PRIVATE_KEY.");
  const buyer = new ethers.Wallet(requireEnv("BUYER_PRIVATE_KEY"), ethers.provider);
  const attestor = new ethers.Wallet(requireEnv("ATTESTOR_PRIVATE_KEY"));

  await ensureGas(buyer, "buyer");
  await ensureGas(provider, "provider/deployer");

  const providerBalance = await ethers.provider.getBalance(provider.address);
  if (providerBalance < ethers.parseEther("0.09")) {
    throw new Error(
      `Provider ${provider.address} needs at least 0.09 BOT for demo bonds and gas; has ${ethers.formatEther(providerBalance)}.`,
    );
  }

  const bond: any = await ethers.getContractAt("CapacityBond", deployment.address);
  const buyerSide = bond.connect(buyer);
  const txHashes: string[] = [];
  const ids: Record<string, string> = {};

  const profile = await bond.getProvider(provider.address);
  if (!profile.active) {
    const tx = await bond.registerProvider(
      PROVIDER_NAME,
      "ops@northstar.example",
      "urn:capacitybond:demo:provider:northstar",
    );
    await confirm("register provider", tx);
    txHashes.push(tx.hash);
  } else if (profile.name !== PROVIDER_NAME) {
    const tx = await bond.updateProvider(
      PROVIDER_NAME,
      "ops@northstar.example",
      "urn:capacitybond:demo:provider:northstar",
    );
    await confirm("update provider for demo fixtures", tx);
    txHashes.push(tx.hash);
  } else {
    console.log("  provider already registered");
  }

  const now = await chainNow();
  const activeTerms = {
    start: now + 90,
    end: now + 90 + 4 * 3600,
    acceptance: now + 60,
    bond: ethers.parseEther("0.05"),
  };

  console.log("\nFixture 1: active reservation with two checkpoints");
  let tx = await bond.createReservation(
    buyer.address,
    activeTerms.bond,
    hashText("urn:capacitybond:demo:agreement:active"),
    "urn:capacitybond:demo:agreement:active",
    "8 x simulated A100-hours, us-east, batch inference",
    activeTerms.start,
    activeTerms.end,
    activeTerms.acceptance,
    6 * 3600,
    1800,
  );
  await confirm("create active reservation", tx);
  txHashes.push(tx.hash);
  const activeId = Number(await bond.nextReservationId()) - 1;
  ids.active = String(activeId);

  tx = await bond.depositBond(activeId, { value: activeTerms.bond });
  await confirm("deposit active bond", tx);
  txHashes.push(tx.hash);
  tx = await bond.acceptReservation(activeId);
  await confirm("provider accepts active terms", tx);
  txHashes.push(tx.hash);
  tx = await buyerSide.acceptReservation(activeId);
  await confirm("buyer accepts active terms", tx);
  txHashes.push(tx.hash);

  await sleepUntil(activeTerms.start + 5, "service start");
  for (const offset of [2, 4]) {
    const observedAt = activeTerms.start + offset;
    const evidenceURI = `urn:capacitybond:demo:checkpoint:active:${offset}`;
    const evidenceHash = hashText(evidenceURI);
    const signature = await signCheckpoint(attestor, deployment.address, deployment.chainId, {
      reservationId: BigInt(activeId),
      sequence: BigInt(offset / 2),
      observedAt,
      evidenceHash,
      evidenceURI,
    });
    tx = await bond.submitCheckpoint(
      activeId,
      offset / 2,
      observedAt,
      evidenceHash,
      evidenceURI,
      signature,
    );
    await confirm(`checkpoint #${offset / 2}`, tx);
    txHashes.push(tx.hash);
  }

  console.log("\nFixture 2: completed reservation");
  const completedTerms = {
    start: (await chainNow()) + 90,
    end: (await chainNow()) + 90 + 120,
    acceptance: (await chainNow()) + 60,
    bond: ethers.parseEther("0.02"),
  };
  tx = await bond.createReservation(
    buyer.address,
    completedTerms.bond,
    hashText("urn:capacitybond:demo:agreement:complete"),
    "urn:capacitybond:demo:agreement:complete",
    "2 x simulated H100-hours, eu-west, evaluation run",
    completedTerms.start,
    completedTerms.end,
    completedTerms.acceptance,
    3600,
    60,
  );
  await confirm("create completed reservation", tx);
  txHashes.push(tx.hash);
  const completedId = Number(await bond.nextReservationId()) - 1;
  ids.completed = String(completedId);

  tx = await bond.depositBond(completedId, { value: completedTerms.bond });
  await confirm("deposit completed bond", tx);
  txHashes.push(tx.hash);
  tx = await bond.acceptReservation(completedId);
  await confirm("provider accepts completed terms", tx);
  txHashes.push(tx.hash);
  tx = await buyerSide.acceptReservation(completedId);
  await confirm("buyer accepts completed terms", tx);
  txHashes.push(tx.hash);

  await sleepUntil(completedTerms.start + 5, "service start");
  for (const sequence of [1, 2]) {
    const observedAt = completedTerms.start + sequence;
    const evidenceURI = `urn:capacitybond:demo:checkpoint:completed:${sequence}`;
    const evidenceHash = hashText(evidenceURI);
    const signature = await signCheckpoint(attestor, deployment.address, deployment.chainId, {
      reservationId: BigInt(completedId),
      sequence: BigInt(sequence),
      observedAt,
      evidenceHash,
      evidenceURI,
    });
    tx = await bond.submitCheckpoint(
      completedId,
      sequence,
      observedAt,
      evidenceHash,
      evidenceURI,
      signature,
    );
    await confirm(`completed checkpoint #${sequence}`, tx);
    txHashes.push(tx.hash);
  }

  await sleepUntil(completedTerms.end + 2, "service end");
  tx = await bond.markFulfilled(completedId);
  await confirm("mark completed reservation fulfilled", tx);
  txHashes.push(tx.hash);
  tx = await bond.withdraw();
  await confirm("provider withdraws completed bond", tx);
  txHashes.push(tx.hash);

  console.log("\nFixture 3: funded reservation awaiting buyer acceptance");
  const fundedNow = await chainNow();
  tx = await bond.createReservation(
    buyer.address,
    ethers.parseEther("0.01"),
    hashText("urn:capacitybond:demo:agreement:funded"),
    "urn:capacitybond:demo:agreement:funded",
    "1 x simulated L40S-day, dedicated endpoint",
    fundedNow + 24 * 3600,
    fundedNow + 25 * 3600,
    fundedNow + 23 * 3600,
    3600,
    3600,
  );
  await confirm("create funded reservation", tx);
  txHashes.push(tx.hash);
  const fundedId = Number(await bond.nextReservationId()) - 1;
  ids.funded = String(fundedId);

  tx = await bond.depositBond(fundedId, { value: ethers.parseEther("0.01") });
  await confirm("deposit funded bond", tx);
  txHashes.push(tx.hash);
  tx = await bond.acceptReservation(fundedId);
  await confirm("provider accepts funded terms", tx);
  txHashes.push(tx.hash);

  const output = {
    seededAt: new Date().toISOString(),
    contract: deployment.address,
    reservations: ids,
    transactions: txHashes,
  };
  mkdirSync(resolve(process.cwd(), "deployments"), { recursive: true });
  const proofFile = `deployments/seed-${network.name}.json`;
  writeFileSync(
    resolve(process.cwd(), proofFile),
    `${JSON.stringify(output, null, 2)}\n`,
  );

  console.log("\nSeed complete");
  console.log(`  active:    reservation #${ids.active}`);
  console.log(`  completed: reservation #${ids.completed}`);
  console.log(`  funded:    reservation #${ids.funded}`);
  console.log(`  proof:     ${proofFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
