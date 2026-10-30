import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";

const EXPLORER = "https://scan.bohr.life";

async function main() {
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

  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 968n) {
    throw new Error(`Expected chain 968, connected to ${network.chainId}. Run with --network bohr.`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(
      `Deployer ${deployer.address} has 0 BOT. Claim test BOT at https://faucet.botchain.ai/basic, then retry.`,
    );
  }

  console.log("CapacityBond deployment");
  console.log(`  network     BOT Chain Bohr (968)`);
  console.log(`  deployer    ${deployer.address} (${ethers.formatEther(balance)} BOT)`);
  console.log(`  attestor    ${attestor}`);
  console.log(`  resolver    ${resolver}`);
  console.log(`  grace       ${gracePeriod}s`);

  const factory = await ethers.getContractFactory("CapacityBond");
  const contract = await factory.deploy(deployer.address, attestor, resolver, gracePeriod);
  const deploymentTx = contract.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction was not created.");

  console.log(`  tx          ${EXPLORER}/tx/${deploymentTx.hash}`);
  console.log("  waiting for confirmation...");
  const receipt = await deploymentTx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Deployment reverted.");

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployedAt = new Date().toISOString();
  const record = {
    chainId: 968,
    contractName: "CapacityBond",
    address,
    deploymentBlock: receipt.blockNumber,
    deploymentTxHash: deploymentTx.hash,
    deployedAt,
    deployer: deployer.address,
    attestor,
    resolver,
    gracePeriodSeconds: gracePeriod,
    explorerUrl: EXPLORER,
  };

  const outputPath = resolve(process.cwd(), "deployments/bohr.json");
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
  console.log(`Explorer: ${EXPLORER}/address/${address}`);
  console.log(`Deployment record: ${outputPath}`);
  console.log("Next: npm run seed:bohr");
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
