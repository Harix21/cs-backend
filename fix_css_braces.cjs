const fs = require('fs');
const path = require('path');

const cssFiles = [
  'pages/Auth.css',
  'components/common/Sidebar.css',
  'pages/public/PortalHub.css',
  'pages/admin/AdminDashboard.css',
  'pages/coordinator/CoordinatorDashboard.css',
  'utilities.css'
];

const srcDir = '/Users/apple/Desktop/Cybersentinel2k25/CS-backend copy/src';

cssFiles.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // separate the appended media queries
  const parts = content.split('/* Responsive Base for Mobile & Tablet */');
  let mainContent = parts[0];
  const appended = parts.length > 1 ? '/* Responsive Base for Mobile & Tablet */' + parts[1] : '';

  // count braces in mainContent
  let openBraces = 0;
  for (let i = 0; i < mainContent.length; i++) {
    if (mainContent[i] === '{') openBraces++;
    else if (mainContent[i] === '}') openBraces--;
  }

  // append missing closing braces
  if (openBraces > 0) {
    console.log(`Fixing ${file}: appending ${openBraces} closing braces.`);
    for (let i = 0; i < openBraces; i++) {
      mainContent += '}\n';
    }
    fs.writeFileSync(filePath, mainContent + '\n' + appended);
  }
});
