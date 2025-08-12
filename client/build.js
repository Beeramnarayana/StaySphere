const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting client build process...');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// Check if we're in the client directory
const isInClientDir = __dirname.endsWith('client');
const clientPath = isInClientDir ? '.' : 'client';

console.log(`Building client in: ${path.resolve(clientPath)}`);

// Run npm install
exec(`cd ${clientPath} && npm install --legacy-peer-deps`, (installError, installStdout, installStderr) => {
  if (installError) {
    console.error('Error during npm install:', installError);
    console.error('stderr:', installStderr);
    process.exit(1);
  }
  
  console.log('npm install completed successfully');
  console.log(installStdout);
  
  // Run npm run build
  exec(`cd ${clientPath} && npm run build`, (buildError, buildStdout, buildStderr) => {
    if (buildError) {
      console.error('Error during build:', buildError);
      console.error('Build stderr:', buildStderr);
      
      // Try to get more detailed error from build output
      try {
        const buildLogPath = path.join(clientPath, 'build', 'build-log.txt');
        if (fs.existsSync(buildLogPath)) {
          const buildLog = fs.readFileSync(buildLogPath, 'utf8');
          console.error('Build log:', buildLog);
        }
      } catch (e) {
        console.error('Could not read build log:', e);
      }
      
      process.exit(1);
    }
    
    console.log('Build completed successfully');
    console.log(buildStdout);
    
    // Verify build directory
    const buildDir = path.join(clientPath, 'build');
    if (fs.existsSync(buildDir)) {
      console.log('Build directory contents:', fs.readdirSync(buildDir).join(', '));
      
      // Check for index.html
      const indexPath = path.join(buildDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log('✅ Found index.html in build directory');
      } else {
        console.error('❌ index.html not found in build directory');
      }
    } else {
      console.error('❌ Build directory not found after build');
    }
  });
});
