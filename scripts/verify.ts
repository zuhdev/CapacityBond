import { ethers, run } from "hardhat";
import { activeNetwork, readDeployment } from "./lib";

/**
 * Verify the deployed CapacityBond source on the network's explorer via
 * @nomicfoundation/hardhat-verify:
 *
 *   npm run verify:bohr      # scan.bohr.life
 *   npm run verify:botchain  # scan.botchain.ai
 *
 * Constructor arguments are taken from the deployment record; the owner is
 * read from the chain so a post-deploy ownership transfer does not break
 * verification. The ethers-style API endpoint of both explorers accepts any
 * non-empty API key (see the `etherscan` block in hardhat.config.ts).
 */
async function main() {
  const target = activeNetwork();
  const record = readDeployment();

  console.log(`Verifying CapacityBond at ${record.address} on ${target.label}`);

  const bond: any = await ethers.getContractAt("CapacityBond", record.address);
  const onChainOwner = (await bond.owner()) as string;
  const constructorOwner =
    ethers.isAddress(onChainOwner) && onChainOwner !== ethers.ZeroAddress
      ? onChainOwner
      : record.deployer;
  if (!constructorOwner || !ethers.isAddress(constructorOwner)) {
    throw new Error(
      "Cannot determine the constructor owner argument. Set it manually with npx hardhat verify.",
    );
  }

  const constructorArguments = [
    ethers.getAddress(constructorOwner),
    ethers.getAddress(record.attestor),
    ethers.getAddress(record.resolver),
    record.gracePeriodSeconds,
  ];

  try {
    await run("verify:verify", {
      address: record.address,
      constructorArguments,
    });
    console.log("Source verified.");
    console.log(`${target.explorerUrl}/address/${record.address}#code`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Already Verified")) {
      console.log("Source already verified.");
      console.log(`${target.explorerUrl}/address/${record.address}#code`);
      return;
    }
    throw new Error(
      `Verification failed: ${message}\n` +
        `Fallback: verify manually through the explorer UI at ${target.explorerUrl}, or reproduce with:\n` +
        `npx hardhat verify --network ${target.name} ${record.address} ${constructorArguments.join(" ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
