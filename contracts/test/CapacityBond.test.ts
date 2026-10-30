import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { Signer } from "ethers";

const BOND = ethers.parseEther("1");
const GRACE = 120n;
const CLAIM_WINDOW = 300n;
const INTERVAL = 60n;
const SERVICE_SECONDS = 240n;

const checkpointTypes = {
  Checkpoint: [
    { name: "reservationId", type: "uint256" },
    { name: "sequence", type: "uint256" },
    { name: "observedAt", type: "uint64" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "evidenceURI", type: "string" },
  ],
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  const owner = signers[0]!;
  const attestor = signers[1]!;
  const resolver = signers[2]!;
  const provider = signers[3]!;
  const buyer = signers[4]!;
  const outsider = signers[5]!;
  const Factory = await ethers.getContractFactory("CapacityBond");
  const bond: any = await Factory.deploy(owner.address, attestor.address, resolver.address, GRACE);
  await bond.waitForDeployment();

  await bond.connect(provider).registerProvider("Northstar Compute", "ops@example.test", "ipfs://demo/provider");
  return { bond, owner, attestor, resolver, provider, buyer, outsider };
}

async function createReservation(
  fixture: Awaited<ReturnType<typeof deployFixture>>,
  overrides: Partial<{
    buyer: string;
    bondAmount: bigint;
    serviceStart: bigint;
    serviceEnd: bigint;
    acceptanceDeadline: bigint;
    claimWindow: bigint;
    checkpointInterval: bigint;
  }> = {},
) {
  const now = BigInt(await time.latest());
  const acceptanceDeadline = overrides.acceptanceDeadline ?? now + 60n;
  const serviceStart = overrides.serviceStart ?? now + 120n;
  const serviceEnd = overrides.serviceEnd ?? serviceStart + SERVICE_SECONDS;
  const tx = await fixture.bond.connect(fixture.provider).createReservation(
    overrides.buyer ?? fixture.buyer.address,
    overrides.bondAmount ?? BOND,
    ethers.id("demo-offchain-agreement-v1"),
    "https://example.test/agreements/demo-001",
    "8x virtual GPU hours, 4 vCPU, 16 GB RAM (demo)",
    serviceStart,
    serviceEnd,
    acceptanceDeadline,
    overrides.claimWindow ?? CLAIM_WINDOW,
    overrides.checkpointInterval ?? INTERVAL,
  );
  await tx.wait();
  const id = await fixture.bond.nextReservationId() - 1n;
  return { id, serviceStart, serviceEnd, acceptanceDeadline };
}

async function fundAndActivate(fixture: Awaited<ReturnType<typeof deployFixture>>, id: bigint) {
  await fixture.bond.connect(fixture.provider).depositBond(id, { value: BOND });
  await fixture.bond.connect(fixture.provider).acceptReservation(id);
  await fixture.bond.connect(fixture.buyer).acceptReservation(id);
}

async function signCheckpoint(
  fixture: Awaited<ReturnType<typeof deployFixture>>,
  id: bigint,
  sequence: bigint,
  observedAt: bigint,
  evidenceURI: string,
) {
  const evidenceHash = ethers.id(evidenceURI);
  const signature = await fixture.attestor.signTypedData(
    {
      name: "CapacityBond",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await fixture.bond.getAddress(),
    },
    checkpointTypes,
    { reservationId: id, sequence, observedAt, evidenceHash, evidenceURI },
  );
  return { evidenceHash, signature };
}

describe("CapacityBond", () => {
  describe("provider identity", () => {
    it("stores a contactable provider profile and rejects duplicate registration", async () => {
      const f = await loadFixture(deployFixture);
      const profile = await f.bond.getProvider(f.provider.address);
      expect(profile.name).to.equal("Northstar Compute");
      expect(profile.contact).to.equal("ops@example.test");
      expect(profile.active).to.equal(true);
      await expect(
        f.bond.connect(f.provider).registerProvider("Again", "contact", ""),
      ).to.be.revertedWithCustomError(f.bond, "AlreadyRegistered");
    });

    it("allows only the provider to update its own profile", async () => {
      const f = await loadFixture(deployFixture);
      await expect(
        f.bond.connect(f.outsider).updateProvider("Malicious", "n/a", ""),
      ).to.be.revertedWithCustomError(f.bond, "NotRegistered");
      await f.bond.connect(f.provider).updateProvider("Northstar GPU", "tg:@northstar", "ipfs://new");
      const profile = await f.bond.getProvider(f.provider.address);
      expect(profile.name).to.equal("Northstar GPU");
      expect(await f.bond.providerCount()).to.equal(1n);
    });
  });

  describe("reservation terms", () => {
    it("creates a draft with a deterministic checkpoint count and agreement reference", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createReservation(f);
      const r = await f.bond.getReservation(id);
      expect(r.provider).to.equal(f.provider.address);
      expect(r.buyer).to.equal(f.buyer.address);
      expect(r.bondAmount).to.equal(BOND);
      expect(r.requiredCheckpoints).to.equal(4n);
      expect(r.status).to.equal(0n);
      expect(r.policyVersion).to.equal(1n);
      expect(r.agreementHash).to.equal(ethers.id("demo-offchain-agreement-v1"));
    });

    it("rejects self-buying, zero bonds, expired acceptance and invalid windows", async () => {
      const f = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      const args = [
        f.buyer.address,
        BOND,
        ethers.id("agreement"),
        "https://example.test/a",
        "capacity",
        now + 120n,
        now + 360n,
        now + 60n,
        300n,
        60n,
      ] as const;
      await expect(
        f.bond.connect(f.provider).createReservation(f.provider.address, ...args.slice(1)),
      ).to.be.revertedWithCustomError(f.bond, "BuyerIsProvider");
      await expect(
        f.bond.connect(f.provider).createReservation(args[0], 0n, ...args.slice(2)),
      ).to.be.revertedWithCustomError(f.bond, "InvalidBondAmount");
      await expect(
        f.bond.connect(f.provider).createReservation(
          args[0], args[1], args[2], args[3], args[4], args[5], args[6], now - 1n, args[8], args[9],
        ),
      ).to.be.revertedWithCustomError(f.bond, "InvalidAcceptanceDeadline");
      await expect(
        f.bond.connect(f.provider).createReservation(args[0], ...args.slice(1)).catch(() => {
          throw new Error("expected rejection");
        }),
      ).to.emit(f.bond, "ReservationCreated");
    });

    it("requires an exact bond deposit and prevents withdrawal while allocated", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createReservation(f);
      await expect(
        f.bond.connect(f.provider).depositBond(id, { value: BOND - 1n }),
      ).to.be.revertedWithCustomError(f.bond, "IncorrectBond");
      await expect(
        f.bond.connect(f.outsider).depositBond(id, { value: BOND }),
      ).to.be.revertedWithCustomError(f.bond, "NotRegistered");
      await f.bond.connect(f.provider).depositBond(id, { value: BOND });
      const accounting = await f.bond.vaultAccounting();
      expect(accounting.locked).to.equal(BOND);
      await expect(f.bond.connect(f.provider).withdraw()).to.be.revertedWithCustomError(
        f.bond,
        "NoWithdrawableBalance",
      );
    });

    it("activates only after both parties accept", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createReservation(f);
      await f.bond.connect(f.provider).depositBond(id, { value: BOND });
      await f.bond.connect(f.provider).acceptReservation(id);
      let r = await f.bond.getReservation(id);
      expect(r.status).to.equal(1n);
      await expect(f.bond.connect(f.buyer).acceptReservation(id)).to.emit(f.bond, "ReservationActivated");
      r = await f.bond.getReservation(id);
      expect(r.status).to.equal(2n);
      await expect(f.bond.connect(f.buyer).acceptReservation(id)).to.be.revertedWithCustomError(
        f.bond,
        "InvalidState",
      );
    });

    it("refunds a funded but unaccepted reservation only after expiry", async () => {
      const f = await loadFixture(deployFixture);
      const { id, acceptanceDeadline } = await createReservation(f);
      await f.bond.connect(f.provider).depositBond(id, { value: BOND });
      await expect(f.bond.connect(f.outsider).expireReservation(id)).to.be.revertedWithCustomError(
        f.bond,
        "AcceptanceDeadlineNotReached",
      );
      await time.increaseTo(acceptanceDeadline + 1n);
      await expect(f.bond.connect(f.outsider).expireReservation(id)).to.emit(f.bond, "ReservationExpired");
      expect(await f.bond.withdrawable(f.provider.address)).to.equal(BOND);
      await f.bond.connect(f.provider).withdraw();
      expect(await ethers.provider.getBalance(await f.bond.getAddress())).to.equal(0n);
    });
  });

  describe("signed checkpoints and completion", () => {
    it("accepts an EIP-712 checkpoint from the configured attestor and rejects replay", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceStart } = await createReservation(f);
      await fundAndActivate(f, id);
      await time.increaseTo(serviceStart + 10n);
      const observedAt = BigInt(await time.latest());
      const evidenceURI = "ipfs://demo/checkpoint-1.json";
      const signed = await signCheckpoint(f, id, 1n, observedAt, evidenceURI);
      await expect(
        f.bond.connect(f.outsider).submitCheckpoint(id, 1n, observedAt, signed.evidenceHash, evidenceURI, signed.signature),
      ).to.emit(f.bond, "CheckpointSubmitted");
      await expect(
        f.bond.connect(f.outsider).submitCheckpoint(id, 1n, observedAt, signed.evidenceHash, evidenceURI, signed.signature),
      ).to.be.revertedWithCustomError(f.bond, "InvalidSequence");
      const points = await f.bond.getCheckpoints(id);
      expect(points).to.have.length(1);
      expect(points[0]?.attestor).to.equal(f.attestor.address);
      expect(points[0]?.submitter).to.equal(f.outsider.address);
    });

    it("rejects wrong signer, future observations, wrong window and out-of-order evidence", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceStart } = await createReservation(f);
      await fundAndActivate(f, id);
      await time.increaseTo(serviceStart + 10n);
      const observedAt = BigInt(await time.latest());
      const uri = "ipfs://demo/checkpoint.json";
      const hash = ethers.id(uri);
      const signature = await f.outsider.signTypedData(
        {
          name: "CapacityBond",
          version: "1",
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: await f.bond.getAddress(),
        },
        checkpointTypes,
        { reservationId: id, sequence: 1n, observedAt, evidenceHash: hash, evidenceURI: uri },
      );
      await expect(
        f.bond.submitCheckpoint(id, 1n, observedAt, hash, uri, signature),
      ).to.be.revertedWithCustomError(f.bond, "InvalidSignature");
      const empty = await signCheckpoint(f, id, 1n, observedAt, "");
      await expect(
        f.bond.submitCheckpoint(id, 1n, observedAt, empty.evidenceHash, "", empty.signature),
      ).to.be.revertedWithCustomError(f.bond, "InvalidEvidence");
      const futureObserved = observedAt + 5n;
      const future = await signCheckpoint(f, id, 1n, futureObserved, uri);
      await expect(
        f.bond.submitCheckpoint(id, 1n, futureObserved, future.evidenceHash, uri, future.signature),
      ).to.be.revertedWithCustomError(f.bond, "CheckpointInFuture");
      const lateObserved = observedAt + 10_000n;
      const late = await signCheckpoint(f, id, 1n, lateObserved, uri);
      await expect(
        f.bond.submitCheckpoint(id, 1n, lateObserved, late.evidenceHash, uri, late.signature),
      ).to.be.revertedWithCustomError(f.bond, "CheckpointOutsideServiceWindow");
    });

    it("releases the full bond to the provider after all checkpoints and service end", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceStart, serviceEnd } = await createReservation(f);
      await fundAndActivate(f, id);
      for (let sequence = 1n; sequence <= 4n; sequence++) {
        const observedAt = serviceStart + sequence * 50n;
        await time.increaseTo(observedAt);
        const uri = `ipfs://demo/checkpoint-${sequence}.json`;
        const signed = await signCheckpoint(f, id, sequence, observedAt, uri);
        await f.bond.submitCheckpoint(id, sequence, observedAt, signed.evidenceHash, uri, signed.signature);
      }
      await expect(f.bond.markFulfilled(id)).to.be.revertedWithCustomError(f.bond, "ServiceWindowOpen");
      await time.increaseTo(serviceEnd + 1n);
      await expect(f.bond.connect(f.outsider).markFulfilled(id)).to.emit(f.bond, "ReservationFulfilled");
      expect((await f.bond.getReservation(id)).status).to.equal(3n);
      expect(await f.bond.withdrawable(f.provider.address)).to.equal(BOND);
      const accounting = await f.bond.vaultAccounting();
      expect(accounting.locked).to.equal(0n);
      expect(accounting.withdrawableTotal).to.equal(BOND);
      const before = await ethers.provider.getBalance(f.provider.address);
      const tx = await f.bond.connect(f.provider).withdraw();
      const receipt = await tx.wait();
      const gas = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice ?? 0n);
      expect(await ethers.provider.getBalance(f.provider.address)).to.equal(before + BOND - gas);
    });
  });

  describe("missing checkpoint claims and disputes", () => {
    it("opens a claim only after grace, then lets the buyer dispute and resolver split", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceStart, serviceEnd } = await createReservation(f);
      await fundAndActivate(f, id);
      await time.increaseTo(serviceStart + 20n);
      const uri = "ipfs://demo/partial.json";
      const signed = await signCheckpoint(f, id, 1n, BigInt(await time.latest()), uri);
      await f.bond.submitCheckpoint(id, 1n, BigInt(await time.latest()), signed.evidenceHash, uri, signed.signature);

      await time.increaseTo(serviceEnd + GRACE - 10n);
      await expect(f.bond.markClaimable(id)).to.be.revertedWithCustomError(f.bond, "GracePeriodNotElapsed");
      await time.increaseTo(serviceEnd + GRACE + 1n);
      await expect(f.bond.connect(f.outsider).markClaimable(id)).to.emit(f.bond, "ReservationClaimable");
      const r = await f.bond.getReservation(id);
      expect(r.status).to.equal(4n);
      await expect(
        f.bond.connect(f.outsider).openDispute(id, "ipfs://demo/claim.json", ethers.id("claim")),
      ).to.be.revertedWithCustomError(f.bond, "NotBuyer");
      await expect(
        f.bond.connect(f.buyer).openDispute(id, "", ethers.ZeroHash),
      ).to.be.revertedWithCustomError(f.bond, "InvalidEvidence");
      await expect(
        f.bond.connect(f.buyer).openDispute(id, "ipfs://demo/claim.json", ethers.id("claim")),
      ).to.emit(f.bond, "DisputeOpened");
      await expect(
        f.bond.connect(f.buyer).resolveDispute(id, 5_000, "ipfs://demo/resolution.json", ethers.id("resolution")),
      ).to.be.revertedWithCustomError(f.bond, "NotResolver");
      await expect(
        f.bond.connect(f.resolver).resolveDispute(id, 5_000, "", ethers.ZeroHash),
      ).to.be.revertedWithCustomError(f.bond, "InvalidEvidence");
      await expect(
        f.bond.connect(f.resolver).resolveDispute(id, 5_000, "ipfs://demo/resolution.json", ethers.id("resolution")),
      ).to.emit(f.bond, "DisputeResolved");
      expect(await f.bond.withdrawable(f.provider.address)).to.equal(BOND / 2n);
      expect(await f.bond.withdrawable(f.buyer.address)).to.equal(BOND / 2n);
      expect((await f.bond.vaultAccounting()).locked).to.equal(0n);
    });

    it("returns an undisputed missed-checkpoint bond to the provider after the claim deadline", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceEnd } = await createReservation(f);
      await fundAndActivate(f, id);
      await time.increaseTo(serviceEnd + GRACE + 1n);
      await f.bond.markClaimable(id);
      const deadline = (await f.bond.getReservation(id)).claimDeadline;
      await expect(f.bond.releaseUndisputed(id)).to.be.revertedWithCustomError(f.bond, "ClaimWindowNotClosed");
      await time.increaseTo(deadline + 1n);
      await expect(f.bond.connect(f.outsider).releaseUndisputed(id)).to.emit(f.bond, "ReservationReleased");
      expect(await f.bond.withdrawable(f.provider.address)).to.equal(BOND);
    });

    it("rejects completion when checkpoints are missing and claims when all are present", async () => {
      const f = await loadFixture(deployFixture);
      const { id, serviceEnd } = await createReservation(f);
      await fundAndActivate(f, id);
      await time.increaseTo(serviceEnd + 1n);
      await expect(f.bond.markFulfilled(id)).to.be.revertedWithCustomError(f.bond, "CheckpointsIncomplete");
      await time.increaseTo(serviceEnd + GRACE + 1n);
      await f.bond.markClaimable(id);
      const deadline = (await f.bond.getReservation(id)).claimDeadline;
      await time.increaseTo(deadline + 1n);
      await expect(
        f.bond.connect(f.buyer).openDispute(id, "", ethers.ZeroHash),
      ).to.be.revertedWithCustomError(f.bond, "ClaimWindowClosed");
    });
  });

  describe("administration and accounting", () => {
    it("restricts role and grace-period administration to the owner and separates roles", async () => {
      const f = await loadFixture(deployFixture);
      await expect(
        f.bond.connect(f.outsider).setAttestor(f.outsider.address),
      ).to.be.revertedWithCustomError(f.bond, "OwnableUnauthorizedAccount");
      await expect(
        f.bond.setAttestor(f.resolver.address),
      ).to.be.revertedWithCustomError(f.bond, "InvalidRoleSeparation");
      await expect(
        f.bond.setGracePeriod(1n),
      ).to.be.revertedWithCustomError(f.bond, "InvalidGracePeriod");
      await expect(f.bond.setGracePeriod(300n)).to.emit(f.bond, "GracePeriodChanged");
      expect(await f.bond.gracePeriod()).to.equal(300n);
    });

    it("keeps contract balance equal to locked plus withdrawable liabilities", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createReservation(f);
      await f.bond.connect(f.provider).depositBond(id, { value: BOND });
      const a = await f.bond.vaultAccounting();
      expect(a.balance).to.equal(a.locked + a.withdrawableTotal + a.surplus);
      expect(a.balance).to.equal(BOND);
    });
  });
});
