import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    baseSepolia: { 
      url: process.env.RPC_URL!, 
      accounts: [process.env.OPERATOR_PRIVATE_KEY!] 
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts"
  }
};

export default config;
