import { ethers } from "hardhat";
import { activeNetwork, readDeployment } from "./lib";

/**
 * Live operational snapshot of a deployed CapacityBond instance:
 *
 *   npm run status:bohr
 *   npm run status:botchain
 *   npm run status:botchain -- --address 0x...   # filter by provider or buyer
 *
 * Reports vault accounting and every reservation by status. Use it as the
 * first triage step in incident response (see docs/runbook.md section 11).
 */

const STATUS_NAMES = [
  "Draft",
  "Funded",
  "Active",
  "Fulfilled",
  "Claimable",
  "Disputed",
  "Resolved",
  "Expired",
] as const;

async function main() {
  const record = readDeployment();
  const filter = process.argv.includes("--address")
    ? process.argv[process.argv.indexOf("--address") + 1]?.toLowerCase()
    : undefined;

  const bond: any = await ethers.getContractAt("CapacityBond", record.address);
  const attestor = (await bond.attestor()) as string;
  const resolver = (await bond.resolver()) as string;
  const grace = Number(await bond.gracePeriod());
  const accounting = (await bond.vaultAccounting()) as [bigint, bigint, bigint, bigint];
  const nextId = Number(await bond.nextReservationId());

  console.log("CapacityBond status");
  console.log(`  contract   ${record.address}`);
  console.log(`  attestor   ${attestor}`);
  console.log(`  resolver   ${resolver}  (rotation requires the owner; see docs/runbook.md section 10)`);
  console.log(`  grace      ${grace}s`);
  console.log(
    `  vault      balance ${ethers.formatEther(accounting[0])}, locked ${ethers.formatEther(
      accounting[1],
    )}, withdrawable ${ethers.formatEther(accounting[2])}, surplus ${ethers.formatEther(accounting[3])}`,
  );
  if (accounting[0] < accounting[1] + accounting[2]) {
    console.error("  INVARIANT VIOLATION: balance is below locked plus withdrawable.");
    process.exitCode = 1;
  }

  if (nextId <= 1) {
    console.log("  no reservations yet");
    return;
  }

  const counts = new Map<string, number>();
  const shown: Array<{ id: number; status: string; provider: string; buyer: string; bond: string }> = [];

  for (let id = 1; id < nextId; id++) {
    const reservation = (await bond.getReservation(id)) as Record<string, unknown>;
    const status = STATUS_NAMES[Number(reservation.status)] ?? `Unknown(${Number(reservation.status)})`;
    counts.set(status, (counts.get(status) ?? 0) + 1);
    const provider = (reservation.provider as string).toLowerCase();
    const buyer = (reservation.buyer as string).toLowerCase();
    if (filter && provider !== filter && buyer !== filter) continue;
    // Unfiltered view shows only reservations that still need attention
    // (never Draft/Funded/Active/terminal by design). A filtered view shows
    // every reservation for the given party.
    if (!filter && status !== "Disputed" && status !== "Claimable") continue;
    shown.push({
      id,
      status,
      provider: reservation.provider as string,
      buyer: reservation.buyer as string,
      bond: ethers.formatEther(reservation.bondAmount as bigint),
    });
  }

  console.log(`  reservations: ${nextId - 1} total`);
  for (const [status, count] of counts) console.log(`    ${status.padEnd(10)} ${count}`);

  if (filter) {
    console.log(`\nReservations involving ${filter}`);
  } else {
    console.log("\nReservations awaiting resolution:");
  }
  for (const entry of shown) {
    console.log(
      `  #${entry.id} ${entry.status.padEnd(10)} provider ${entry.provider} buyer ${entry.buyer} bond ${entry.bond} BOT`,
    );
  }
  if (shown.length === 0) console.log("  (none)");

  if ((counts.get("Disputed") ?? 0) > 0) {
    console.log(`\nACTION: ${counts.get("Disputed")} disputed reservation(s) await the resolver.`);
    console.log("Follow the dispute procedures in docs/resolver-continuity.md.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
