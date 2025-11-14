import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  const signerAddress = (await ethers.getSigners())[0].address;
  
  if (!contractAddress) {
    throw new Error("NFT_CONTRACT_ADDRESS environment variable not set");
  }
  
  console.log("Setting trusted signer for PlayerPass1155...");
  console.log("Contract:", contractAddress);
  console.log("Signer address:", signerAddress);
  
  const PlayerPass1155 = await ethers.getContractAt("PlayerPass1155", contractAddress);
  
  const tx = await PlayerPass1155.setTrustedSigner(signerAddress, true);
  console.log("\n⏳ Transaction submitted:", tx.hash);
  
  await tx.wait();
  console.log("✅ Trusted signer set successfully!");
  
  // Verify
  const isTrusted = await PlayerPass1155.trustedSigners(signerAddress);
  console.log("✓ Verified:", signerAddress, "is trusted:", isTrusted);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
