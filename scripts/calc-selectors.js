const ethers = require('ethers');

function getSelector(signature) {
    const selector = ethers.id(signature).slice(0, 10);
    console.log(`${signature} -> ${selector}`);
}

getSelector('getThreatIntel(string)');
getSelector('getThreatScore(string)');
getSelector('addThreatIntel(string,uint8,string)');
getSelector('getAllThreatIPs(uint256)');
