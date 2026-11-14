const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Same order as the enum in the contract
const Status = { None: 0, Registered: 1, Assigned: 2, Settled: 3, Disputed: 4, Expired: 5 };

describe("ReceivableRegistry", function () {
  // Runs before each test: deploys a fresh contract and test accounts
  async function deployFixture() {
    const [admin, supplier, financierA, financierB, outsider] =
      await ethers.getSigners();

    const registry = await ethers.deployContract("ReceivableRegistry");
    await registry.addFinancier(financierA.address);
    await registry.addFinancier(financierB.address);

    // The invoice "fingerprint". Invented test data only.
    const id = ethers.keccak256(ethers.toUtf8Bytes("test-invoice-001"));
    const dueDate = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

    return { registry, admin, supplier, financierA, financierB, outsider, id, dueDate };
  }

  it("1. registers a new invoice with status Registered", async function () {
    const { registry, supplier, id, dueDate } = await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    expect(await registry.checkStatus(id)).to.equal(Status.Registered);
  });

  it("2. rejects registering the same invoice twice", async function () {
    const { registry, supplier, id, dueDate } = await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    await expect(
      registry.connect(supplier).registerReceivable(id, dueDate)
    ).to.be.revertedWith("Already registered");
  });

  it("3. financier A can assign a registered invoice", async function () {
    const { registry, supplier, financierA, id, dueDate } =
      await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    await registry.connect(financierA).assignReceivable(id);

    expect(await registry.checkStatus(id)).to.equal(Status.Assigned);
    const r = await registry.getReceivable(id);
    expect(r.financier).to.equal(financierA.address);
  });

  it("4. financier B is refused when the invoice is already assigned (double financing)", async function () {
    const { registry, supplier, financierA, financierB, id, dueDate } =
      await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    await registry.connect(financierA).assignReceivable(id);

    await expect(
      registry.connect(financierB).assignReceivable(id)
    ).to.be.revertedWith("Not available");

    // A is still the owner
    const r = await registry.getReceivable(id);
    expect(r.financier).to.equal(financierA.address);
  });

  it("5. an address that is not an approved financier cannot assign", async function () {
    const { registry, supplier, outsider, id, dueDate } =
      await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    await expect(
      registry.connect(outsider).assignReceivable(id)
    ).to.be.revertedWith("Not a financier");
  });

  it("6. only the assigned financier can confirm settlement", async function () {
    const { registry, supplier, financierA, financierB, id, dueDate } =
      await loadFixture(deployFixture);
    await registry.connect(supplier).registerReceivable(id, dueDate);
    await registry.connect(financierA).assignReceivable(id);

    // B is an approved financier, but not the assigned one
    await expect(
      registry.connect(financierB).confirmSettlement(id)
    ).to.be.revertedWith("Not the assigned financier");

    await registry.connect(financierA).confirmSettlement(id);
    expect(await registry.checkStatus(id)).to.equal(Status.Settled);
  });
});
