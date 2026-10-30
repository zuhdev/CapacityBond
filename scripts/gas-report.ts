import { ethers, network } from "hardhat";

const BOHR_GAS_PRICE = 20n * 10n ** 9n;

interface GasRow {
  operation: string;
  gasUsed: number;
}

async function main() {
  const [owner, provider, buyer, attestor, resolver] = await ethers.getSigners();
  if (!owner || !provider || !buyer || !attestor || !resolver) throw new Error("Missing local signers.");

  const rows: GasRow[] = [];
  const measurement = async (operation: string, txPromise: Promise<{ wait: () => Promise<{ gasUsed: bigint } | null> }>) => {
    const tx = await txPromise;
    const receipt = await tx.wait();
    if (!receipt) throw new Error(`${operation} did not confirm.`);
    rows.push({ operation, gasUsed: Number(receipt.gasUsed) });
  };

  const factory = await ethers.getContractFactory("CapacityBond");
  const deployed = await factory.deploy(owner.address, attestor.address, resolver.address, 300);
  const deploymentTx = deployed.deploymentTransaction();
  if (!deploymentTx) throw new Error("No deployment transaction.");
  const deploymentReceipt = await deploymentTx.wait();
  if (!deploymentReceipt) throw new Error("Deployment did not confirm.");
  rows.push({ operation: "Deploy CapacityBond", gasUsed: Number(deploymentReceipt.gasUsed) });
  await deployed.waitForDeployment();

  const bond: any = deployed;
  await measurement("Register provider", bond.connect(provider).registerProvider(
    "Gas Sample Provider",
    "gas@capacitybond.test",
    "urn:capacitybond:gas:provider",
  ));

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const start = now + 600;
  const end = start + 3600;

  await measurement("Create reservation", bond.connect(provider).createReservation(
    buyer.address,
    ethers.parseEther("0.01"),
    ethers.id("urn:capacitybond:gas:agreement:A"),
    "urn:capacitybond:gas:agreement:A",
    "One checkpoint gas sample",
    start,
    end,
    now + 300,
    3600,
    3600,
  ));
  const id = Number(await bond.nextReservationId()) - 1;
  await measurement("Deposit bond", bond.connect(provider).depositBond(id, { value: ethers.parseEther("0.01") }));
  await measurement("Accept as provider", bond.connect(provider).acceptReservation(id));
  await measurement("Accept as buyer", bond.connect(buyer).acceptReservation(id));

  await network.provider.send("evm_increaseTime", [start - (await ethers.provider.getBlock("latest"))!.timestamp + 5]);
  await network.provider.send("evm_mine");
  const observedAt = (await ethers.provider.getBlock("latest"))!.timestamp;
  const uri = "urn:capacitybond:gas:checkpoint:1";
  const hash = ethers.id(uri);
  const signature = await attestor.signTypedData(
    {
      name: "CapacityBond",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await deployed.getAddress(),
    },
    {
      Checkpoint: [
        { name: "reservationId", type: "uint256" },
        { name: "sequence", type: "uint256" },
        { name: "observedAt", type: "uint64" },
        { name: "evidenceHash", type: "bytes32" },
        { name: "evidenceURI", type: "string" },
      ],
    },
    { reservationId: id, sequence: 1n, observedAt, evidenceHash: hash, evidenceURI: uri },
  );
  await measurement("Submit checkpoint", bond.connect(provider).submitCheckpoint(id, 1n, observedAt, hash, uri, signature));
  await network.provider.send("evm_increaseTime", [end - (await ethers.provider.getBlock("latest"))!.timestamp + 5]);
  await network.provider.send("evm_mine");
  await measurement("Mark fulfilled", bond.markFulfilled(id));
  await measurement("Withdraw provider credit", bond.connect(provider).withdraw());

  const claimStart = (await ethers.provider.getBlock("latest"))!.timestamp + 600;
  const claimEnd = claimStart + 3600;
  await measurement("Create claim-path reservation", bond.connect(provider).createReservation(
    buyer.address,
    ethers.parseEther("0.006"),
    ethers.id("urn:capacitybond:gas:agreement:B"),
    "urn:capacitybond:gas:agreement:B",
    "No checkpoint, resolver path",
    claimStart,
    claimEnd,
    claimStart - 10,
    3600,
    1800,
  ));
  const claimId = Number(await bond.nextReservationId()) - 1;
  await measurement("Deposit claim-path bond", bond.connect(provider).depositBond(claimId, { value: ethers.parseEther("0.006") }));
  await measurement("Accept claim path as provider", bond.connect(provider).acceptReservation(claimId));
  await measurement("Accept claim path as buyer", bond.connect(buyer).acceptReservation(claimId));
  await network.provider.send("evm_increaseTime", [claimEnd + 305 - (await ethers.provider.getBlock("latest"))!.timestamp]);
  await network.provider.send("evm_mine");
  await measurement("Mark claimable", bond.markClaimable(claimId));
  await measurement("Open dispute", bond.connect(buyer).openDispute(claimId, "urn:capacitybond:gas:statement:B", ethers.id("statement")));
  await measurement("Resolve dispute 50/50", bond.connect(resolver).resolveDispute(claimId, 5000, "urn:capacitybond:gas:resolution:B", ethers.id("resolution")));
  await measurement("Withdraw buyer credit", bond.connect(buyer).withdraw());
  await measurement("Withdraw provider dispute credit", bond.connect(provider).withdraw());

  const totalGas = rows.reduce((sum, row) => sum + row.gasUsed, 0);
  const totalFee = BigInt(totalGas) * BOHR_GAS_PRICE;
  const report = {
    generatedAt: new Date().toISOString(),
    network: "hardhat (local measurement)",
    assumedBohrGasPriceGwei: Number(BOHR_GAS_PRICE) / 1e9,
    rows,
    totalGas,
    estimatedFeeBot: ethers.formatEther(totalFee),
    capitalRequiredBot: {
      deploymentAndBonds: "0.016",
      gas: ethers.formatEther(totalFee),
      recommendedFaucetBuffer: "0.3",
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
