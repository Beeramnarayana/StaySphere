const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function updateGridInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace sm={} with xs={{
  content = content.replace(/sm=\{(\d+)\}/g, 'xs={{$1}}');
  
  // Replace md={} with sm={{
  content = content.replace(/md=\{(\d+)\}/g, 'sm={{$1}}');
  
  // Replace lg={} with md={{
  content = content.replace(/lg=\{(\d+)\}/g, 'md={{$1}}');
  
  // Save the updated content
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

// Find all JS files in the src directory
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      updateGridInFile(fullPath);
    }
  });
}

// Start processing from the src directory
processDirectory(srcDir);

console.log('Grid prop updates complete!');
