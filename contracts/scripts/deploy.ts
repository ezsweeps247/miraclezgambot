import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const baseURI = process.env.NFT_BASE_URI || "https://miraclezgaming.com/api/nft/metadata/";
  
  console.log("Deploying BUUNIX1155 contract...");
  console.log("Base URI:", baseURI);
  
  const BUUNIX1155 = await ethers.getContractFactory("BUUNIX1155");
  const contract = await BUUNIX1155.deploy(baseURI);
  
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("\n✅ BUUNIX1155 deployed successfully!");
  console.log("CONTRACT_ADDRESS=", address);
  console.log("\n📋 Next steps:");
  console.log("1. Add CONTRACT_ADDRESS to your .env file");
  console.log("2. Set the operator as a minter:");
  console.log(`   contract.setMinter("YOUR_OPERATOR_ADDRESS", true)`);
  console.log("3. (Optional) Mark soulbound token IDs:");
  console.log(`   contract.setSoulbound(1, true) // e.g., achievement badges`);
  console.log("\n🔗 View on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
