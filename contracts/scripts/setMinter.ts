import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const minterAddress = process.env.MINTER_ADDRESS || (await ethers.getSigners())[0].address;
  
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable not set");
  }
  
  console.log("Setting minter for BUUNIX1155 contract...");
  console.log("Contract:", contractAddress);
  console.log("Minter address:", minterAddress);
  
  const BUUNIX1155 = await ethers.getContractAt("BUUNIX1155", contractAddress);
  
  const tx = await BUUNIX1155.setMinter(minterAddress, true);
  console.log("\n⏳ Transaction submitted:", tx.hash);
  
  await tx.wait();
  console.log("✅ Minter set successfully!");
  
  // Verify
  const isMinter = await BUUNIX1155.minters(minterAddress);
  console.log("✓ Verified:", minterAddress, "is minter:", isMinter);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
