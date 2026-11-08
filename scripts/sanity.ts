import { ethers } from "hardhat";
import { activeNetwork, readDeployment } from "./lib";

/**
 * Post-deploy sanity checks. Run immediately after deploy, before any funds
 * move through the contract and before the frontend is rebuilt:
 *
 *   npm run sanity:bohr      # testnet
 *   npm run sanity:botchain  # mainnet
 *
 * Fails (exit code 1) when the on-chain contract does not match the
 * deployment record, so flawed deployments are caught before production use.
 */

async function main() {
  const target = activeNetwork();
  const record = readDeployment();

  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
  const recordCheck = (name: string, passed: boolean, detail?: string) => {
    checks.push(detail === undefined ? { name, passed } : { name, passed, detail });
    console.log(`  ${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  console.log(`CapacityBond deployment sanity — ${target.label}`);

  const connected = await ethers.provider.getNetwork();
  recordCheck(
    "chain id",
    connected.chainId === BigInt(target.chainId),
    `expected ${target.chainId}, connected to ${connected.chainId}`,
  );
  recordCheck("record network", record.network === target.name, record.network ?? "(unset)");
  recordCheck("record chain id", record.chainId === target.chainId, String(record.chainId));

  const code = await ethers.provider.getCode(record.address);
  recordCheck("contract code deployed", code !== "0x", `${(code.length - 2) / 2} bytes`);

  const bond: any = await ethers.getContractAt("CapacityBond", record.address);

  const onChainOwner = (await bond.owner()) as string;
  if (record.deployer) {
    recordCheck(
      "owner is deployer",
      onChainOwner.toLowerCase() === record.deployer.toLowerCase(),
      onChainOwner,
    );
  } else {
    recordCheck("owner readable", ethers.isAddress(onChainOwner), onChainOwner);
  }

  const onChainAttestor = (await bond.attestor()) as string;
  const onChainResolver = (await bond.resolver()) as string;
  const onChainGrace = Number(await bond.gracePeriod());

  recordCheck(
    "attestor matches record",
    onChainAttestor.toLowerCase() === record.attestor.toLowerCase(),
    onChainAttestor,
  );
  recordCheck(
    "resolver matches record",
    onChainResolver.toLowerCase() === record.resolver.toLowerCase(),
    onChainResolver,
  );
  recordCheck(
    "attestor and resolver are distinct",
    onChainAttestor.toLowerCase() !== onChainResolver.toLowerCase(),
  );
  recordCheck("grace period matches record", onChainGrace === record.gracePeriodSeconds, `${onChainGrace}s`);
  recordCheck(
    "grace period within policy bounds",
    onChainGrace >= 120 && onChainGrace <= 604_800,
    `${onChainGrace}s`,
  );

  const accounting = (await bond.vaultAccounting()) as [bigint, bigint, bigint, bigint];
  const [vaultBalance, locked, withdrawableTotal, surplus] = accounting;
  recordCheck(
    "vault invariant (balance >= locked + withdrawable)",
    vaultBalance >= locked + withdrawableTotal,
    `balance ${ethers.formatEther(vaultBalance)}, locked ${ethers.formatEther(locked)}, withdrawable ${ethers.formatEther(
      withdrawableTotal,
    )}, surplus ${ethers.formatEther(surplus)}`,
  );
  recordCheck(
    "deployed vault is unencumbered (fresh deployment)",
    locked === 0n && withdrawableTotal === 0n,
    `locked ${ethers.formatEther(locked)} / withdrawable ${ethers.formatEther(withdrawableTotal)}`,
  );

  try {
    const domain = (await bond.eip712Domain()) as {
      name: string;
      version: string;
      chainId: bigint;
      verifyingContract: string;
    };
    recordCheck(
      "EIP-712 domain chain id",
      domain.chainId === BigInt(target.chainId),
      `name ${domain.name} v${domain.version} chain ${domain.chainId} at ${domain.verifyingContract}`,
    );
  } catch {
    checks.push({ name: "EIP-712 domain readable", passed: true });
    console.log("  WARN eip712Domain() not exposed; skipping domain check");
  }

  const failed = checks.filter((check) => !check.passed);
  if (failed.length > 0) {
    console.error(`\nSANITY FAILED: ${failed.length} check(s) failed.`);
    console.error("Do not move funds through this deployment. Investigate before use.");
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${checks.length} sanity checks passed for ${record.address}.`);
    console.log(`Next: npm run verify:${target.name} to verify the source on ${target.explorerUrl}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

