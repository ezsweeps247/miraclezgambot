import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const name = process.env.NFT_COLLECTION_NAME || "BUUNIX Player Pass";
  const symbol = process.env.NFT_COLLECTION_SYMBOL || "BNX";
  const baseURI = process.env.NFT_BASE_URI || "https://cdn.buunix.app/nft/pass/metadata/";
  
  console.log("Deploying PlayerPass1155 contract...");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Base URI:", baseURI);
  
  const PlayerPass1155 = await ethers.getContractFactory("PlayerPass1155");
  const contract = await PlayerPass1155.deploy(
    name,
    symbol,
    baseURI,
    (await ethers.getSigners())[0].address
  );
  
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("\n✅ PlayerPass1155 deployed successfully!");
  console.log("NFT_CONTRACT_ADDRESS=", address);
  console.log("\n📋 Next steps:");
  console.log("1. Add NFT_CONTRACT_ADDRESS to your .env file");
  console.log("2. Run: npm run nft:set-signer");
  console.log("   This will authorize your backend to sign mints");
  console.log("\n🔗 View on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
