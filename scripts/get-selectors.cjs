const { ethers } = require("hardhat");

async function main() {
    console.log("getThreatIntel(string):", ethers.id("getThreatIntel(string)").slice(0, 10));
    console.log("getThreatScore(string):", ethers.id("getThreatScore(string)").slice(0, 10));
    console.log("addThreatIntel(string,uint8,string):", ethers.id("addThreatIntel(string,uint8,string)").slice(0, 10));
    console.log("isThreatSource(string):", ethers.id("isThreatSource(string)").slice(0, 10));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
