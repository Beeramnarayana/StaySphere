const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting build process...');
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
async function build() {
  try {
    // 1. Install root dependencies
    console.log('\n📦 Installing root dependencies...');
    if (!runCommand('npm install --legacy-peer-deps')) {
      throw new Error('Failed to install root dependencies');
    }

    // 2. Ensure client directory exists
    const clientPath = path.join(__dirname, 'client');
    if (!fs.existsSync(clientPath)) {
      throw new Error(`Client directory not found at ${clientPath}`);
    }

    // 3. Run the client build script
    console.log('\n🚀 Starting client build...');
    if (!runCommand('node build-client.js', clientPath)) {
      throw new Error('Client build failed');
    }

    // 4. Verify build directory
    const buildDir = path.join(clientPath, 'build');
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

    console.log('\n✅ Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
