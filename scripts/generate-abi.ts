import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const artifactPath = resolve(
  process.cwd(),
  "contracts/artifacts/contracts/contracts/CapacityBond.sol/CapacityBond.json",
);
const outPath = resolve(process.cwd(), "packages/chain/src/abi.generated.ts");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: unknown[] };
const source = `// Generated from contracts/artifacts. Do not edit by hand.\nexport const capacityBondAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
writeFileSync(outPath, source);
console.log(`Wrote ${outPath}`);
