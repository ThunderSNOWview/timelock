const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏛️ Deploying TimeLockInheritance contract...");

  const TimeLockInheritance = await ethers.getContractFactory("TimeLockInheritance");
  const contract = await TimeLockInheritance.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`✅ TimeLockInheritance deployed to: ${address}`);

  // Save deployment info
  const deploymentInfo = {
    contract: "TimeLockInheritance",
    address: address,
    network: network.name,
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment-timelock.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📝 Deployment info saved to deployment-timelock.json");
  console.log("\n🔍 Verify contract with:");
  console.log(`npx hardhat verify --network ${network.name} ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
