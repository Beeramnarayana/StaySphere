const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting client build process...');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Function to run commands with error handling
function runCommand(command, cwd = process.cwd()) {
  console.log(`\n🔧 Running: ${command} in ${cwd}`);
  try {
    execSync(command, { stdio: 'inherit', cwd, env: process.env });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`, error);
    return false;
  }
}

// Main build function
async function buildClient() {
  try {
    // 1. Install client dependencies
    console.log('\n📦 Installing client dependencies...');
    if (!runCommand('npm install --legacy-peer-deps')) {
      throw new Error('Failed to install client dependencies');
    }

    // 2. Check if react-scripts is installed
    console.log('\n🔍 Checking for react-scripts...');
    const packageJson = require('./package.json');
    if (!packageJson.dependencies['react-scripts'] && !packageJson.devDependencies?.['react-scripts']) {
      console.log('⚠️ react-scripts not found in package.json, installing...');
      if (!runCommand('npm install react-scripts@5.0.1 --save --legacy-peer-deps')) {
        throw new Error('Failed to install react-scripts');
      }
    }

    // 3. Run the build
    console.log('\n🔨 Building client...');
    if (!runCommand('npm run build')) {
      throw new Error('Client build failed');
    }

    // 4. Verify build directory
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      throw new Error(`Build directory not found at ${buildDir}`);
    }

    // 5. List build directory contents
    console.log('\n📁 Build directory contents:');
    const files = fs.readdirSync(buildDir);
    console.log(files.join('\n'));

    if (!files.includes('index.html')) {
      throw new Error('index.html not found in build directory');
    }

    console.log('\n✅ Client build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Client build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildClient();
