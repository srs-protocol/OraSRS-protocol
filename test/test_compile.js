const fs = require('fs');
const path = require('path');

// Check if all necessary files exist
const contractsDir = './contracts';
const files = fs.readdirSync(contractsDir);

console.log('Found contract files:');
files.filter(f => f.endsWith('.sol')).forEach(f => console.log('  - ' + f));

// Check if OpenZeppelin contracts exist in node_modules
const ozPath = './node_modules/@openzeppelin/contracts';
if (fs.existsSync(ozPath)) {
  console.log('\\nOpenZeppelin contracts found in node_modules');
} else {
  console.log('\\nERROR: OpenZeppelin contracts NOT found in node_modules');
}

// Check for import statements in contracts
files.filter(f => f.endsWith('.sol')).forEach(file => {
  const content = fs.readFileSync(path.join(contractsDir, file), 'utf8');
  const imports = content.match(/import ["'@][^"']*["']/g);
  if (imports) {
    console.log(`\\n${file} imports:`);
    imports.forEach(imp => console.log('  - ' + imp));
  }
});
