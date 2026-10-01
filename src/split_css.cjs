const fs = require('fs');
const path = require('path');

const srcDir = '/Users/apple/Desktop/Cybersentinel2k25/CS-backend copy/src';
const indexCssPath = path.join(srcDir, 'index.css');

const lines = fs.readFileSync(indexCssPath, 'utf8').split('\n');

const sections = [
  { name: 'base', end: 472, file: 'index.css' },
  { name: 'auth', start: 472, end: 864, file: 'pages/Auth.css' },
  { name: 'utils', start: 864, end: 1215, file: 'utilities.css' },
  { name: 'sidebar', start: 1215, end: 1502, file: 'components/common/Sidebar.css' },
  { name: 'portalHub', start: 1502, end: 1592, file: 'pages/public/PortalHub.css' },
  { name: 'adminDashboard', start: 1592, end: 1722, file: 'pages/admin/AdminDashboard.css' },
  { name: 'coordinatorDashboard', start: 1722, end: lines.length, file: 'pages/coordinator/CoordinatorDashboard.css' }
];

sections.forEach(sec => {
  if (sec.name === 'base') return;
  let content = lines.slice(sec.start, sec.end).join('\n');
  const filePath = path.join(srcDir, sec.file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Created ' + sec.file);
});

// Update index.css
let newIndexCss = lines.slice(0, 472).join('\n') + '\n\n@import "./utilities.css";\n';
fs.writeFileSync(indexCssPath, newIndexCss);
console.log('Updated index.css');

// Function to add import to a file
function addImport(relativeFilePath, importStatement) {
  const fullPath = path.join(srcDir, relativeFilePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(importStatement)) {
        // Find last import
        const contentLines = content.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < contentLines.length; i++) {
            if (contentLines[i].startsWith('import ')) {
                lastImportIdx = i;
            }
        }
        if (lastImportIdx !== -1) {
            contentLines.splice(lastImportIdx + 1, 0, importStatement);
            fs.writeFileSync(fullPath, contentLines.join('\n'));
            console.log('Added import to ' + relativeFilePath);
        } else {
            fs.writeFileSync(fullPath, importStatement + '\n' + content);
            console.log('Added import to ' + relativeFilePath);
        }
    }
  } else {
      console.log('File not found: ' + relativeFilePath);
  }
}

addImport('pages/admin/AdminLogin.jsx', "import '../Auth.css';");
addImport('pages/coordinator/CoordinatorLogin.jsx', "import '../Auth.css';");
addImport('pages/admin/AdminLayout.jsx', "import '../../components/common/Sidebar.css';");
addImport('pages/coordinator/CoordinatorLayout.jsx', "import '../../components/common/Sidebar.css';");
addImport('pages/public/PortalHub.jsx', "import './PortalHub.css';");
addImport('pages/admin/AdminDashboard.jsx', "import './AdminDashboard.css';");
addImport('pages/coordinator/CoordinatorDashboard.jsx', "import './CoordinatorDashboard.css';");

