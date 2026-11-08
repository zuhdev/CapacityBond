import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";
import { networkFor } from "./networks";

async function main() {
  // Only explicit live networks may deploy. The in-memory hardhat network is
  // rejected so a missing --network flag can never silently deploy locally.
  const target = networkFor(network.name);
  if (network.name === "hardhat") {
    throw new Error("Local network detected. Run with --network bohr (testnet) or --network botchain (mainnet).");
  }

  const [deployer] = await ethers.getSigners();
  const attestor = requiredAddress("ATTESTOR_ADDRESS");
  const resolver = requiredAddress("RESOLVER_ADDRESS");
  const gracePeriod = Number(process.env.GRACE_PERIOD_SECONDS || "300");

  if (!deployer) throw new Error("No deployer signer. Set DEPLOYER_PRIVATE_KEY in .env.");
  if (attestor.toLowerCase() === resolver.toLowerCase()) {
    throw new Error("ATTESTOR_ADDRESS and RESOLVER_ADDRESS must be different accounts.");
  }
  if (!Number.isInteger(gracePeriod) || gracePeriod < 120 || gracePeriod > 604_800) {
    throw new Error("GRACE_PERIOD_SECONDS must be an integer between 120 and 604800.");
  }

  const connected = await ethers.provider.getNetwork();
  if (connected.chainId !== BigInt(target.chainId)) {
    throw new Error(
      `Expected chain ${target.chainId} (${target.label}), connected to ${connected.chainId}. Run with --network ${target.name}.`,
    );
  }

  // Mainnet deployments require an explicit, current-session confirmation.
  // This is deliberately a separate environment variable so it cannot be left
  // in .env templates or copied between machines unnoticed.
  if (!target.testnet && process.env.DEPLOY_CONFIRM_MAINNET !== "1") {
    throw new Error(
      `Refusing to deploy to ${target.label}. Re-run with DEPLOY_CONFIRM_MAINNET=1 after reviewing docs/mainnet-readiness.md.`,
    );
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${deployer.address} has 0 BOT. ${target.fundingHint}, fund it, then retry.`);
  }
  const minBalance = ethers.parseEther(target.testnet ? "0.01" : "0.05");
  if (balance < minBalance) {
    throw new Error(
      `Deployer ${deployer.address} has ${ethers.formatEther(balance)} BOT; at least ${ethers.formatEther(
        minBalance,
      )} BOT is required for a ${target.label} deployment.`,
    );
  }

  console.log("CapacityBond deployment");
  console.log(`  network     ${target.label} (${target.chainId})${target.testnet ? "" : "  [MAINNET]"}`);
  console.log(`  deployer    ${deployer.address} (${ethers.formatEther(balance)} BOT)`);
  console.log(`  attestor    ${attestor}`);
  console.log(`  resolver    ${resolver}`);
  console.log(`  grace       ${gracePeriod}s`);
  if (!target.testnet) {
    console.log("  notice      roles and the owner key stay in place after deploy; see docs/runbook.md section 10");
  }

  const factory = await ethers.getContractFactory("CapacityBond");
  const contract = await factory.deploy(deployer.address, attestor, resolver, gracePeriod);
  const deploymentTx = contract.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction was not created.");

  console.log(`  tx          ${target.explorerUrl}/tx/${deploymentTx.hash}`);
  console.log("  waiting for confirmation...");
  const receipt = await deploymentTx.wait(target.confirmations);
  if (!receipt || receipt.status !== 1) throw new Error("Deployment reverted.");

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployedAt = new Date().toISOString();
  const record = {
    network: target.name,
    chainId: target.chainId,
    contractName: "CapacityBond",
    address,
    deploymentBlock: receipt.blockNumber,
    deploymentTxHash: deploymentTx.hash,
    deployedAt,
    deployer: deployer.address,
    attestor,
    resolver,
    gracePeriodSeconds: gracePeriod,
    explorerUrl: target.explorerUrl,
  };

  const outputPath = resolve(process.cwd(), target.recordFile);
  mkdirSync(resolve(process.cwd(), "deployments"), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);

  const artifactPath = resolve(
    process.cwd(),
    "contracts/artifacts/contracts/contracts/CapacityBond.sol/CapacityBond.json",
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: unknown[] };
  const abiSource = `// Generated from the compiled contract after deployment. Do not edit by hand.\nexport const capacityBondAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
  writeFileSync(resolve(process.cwd(), "packages/chain/src/abi.generated.ts"), abiSource);

  console.log(`\nDeployed at ${address}`);
  console.log(`Explorer: ${target.explorerUrl}/address/${address}`);
  console.log(`Deployment record: ${outputPath}`);
  console.log(`Next: npm run sanity:${target.name}`);
  if (target.testnet) {
    console.log("Then: npm run accept:bohr, and only afterwards npm run seed:bohr.");
  } else {
    console.log(
      "Mainnet: never run seed on a production contract. Run npm run verify:botchain to verify source.\n" +
        "Acceptance on mainnet is optional and gas-only, but creates permanent public records; see docs/mainnet-readiness.md.",
    );
  }
}

function requiredAddress(name: string): string {
  const value = process.env[name];
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be a valid address in .env.`);
  return ethers.getAddress(value);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
