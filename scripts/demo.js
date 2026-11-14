// Demo for the video: deploys the contract on the local Hardhat network
// and walks through the main use case. Test accounts and invented data only.
const { ethers } = require("hardhat");

async function main() {
  const [admin, supplier, financierA, financierB] = await ethers.getSigners();
  const names = ["None", "Registered", "Assigned", "Settled", "Disputed", "Expired"];

  const registry = await ethers.deployContract("ReceivableRegistry");
  await registry.waitForDeployment();
  console.log("1. Contract deployed at:", await registry.getAddress());

  await registry.addFinancier(financierA.address);
  await registry.addFinancier(financierB.address);
  console.log("2. Financier A and Financier B approved by the admin");

  const id = ethers.keccak256(ethers.toUtf8Bytes("demo-invoice-001"));
  const due = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

  await registry.connect(supplier).registerReceivable(id, due);
  console.log("3. Supplier registered the invoice. Status:", names[await registry.checkStatus(id)]);

  await registry.connect(financierA).assignReceivable(id);
  console.log("4. Financier A took the invoice. Status:", names[await registry.checkStatus(id)]);

  try {
    await registry.connect(financierB).assignReceivable(id);
    console.log("5. ERROR: Financier B was NOT refused");
  } catch (e) {
    console.log("5. Financier B tried the same invoice and was REFUSED (double financing stopped)");
  }

  await registry.connect(financierA).confirmSettlement(id);
  console.log("6. Buyer paid, Financier A confirmed. Status:", names[await registry.checkStatus(id)]);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
