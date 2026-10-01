const fs = require('fs');
const path = require('path');

const srcDir = '/Users/apple/Desktop/Cybersentinel2k25/CS-backend copy/src';

const filesToFix = [
  { file: 'pages/public/PortalHub.jsx', css: "import './PortalHub.css';" },
  { file: 'pages/admin/AdminDashboard.jsx', css: "import './AdminDashboard.css';" },
  { file: 'pages/coordinator/CoordinatorDashboard.jsx', css: "import './CoordinatorDashboard.css';" },
  { file: 'pages/admin/AdminLayout.jsx', css: "import '../../components/common/Sidebar.css';" },
  { file: 'pages/coordinator/CoordinatorLayout.jsx', css: "import '../../components/common/Sidebar.css';" }
];

filesToFix.forEach(item => {
  const filePath = path.join(srcDir, item.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(item.css)) {
      content = content.replace(item.css + '\n', '');
      content = content.replace(item.css, '');
      const lines = content.split('\n');
      lines.splice(2, 0, item.css); // insert at line 3
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log('Fixed ' + item.file);
    }
  }
});

const indexCssPath = path.join(srcDir, 'index.css');
let indexContent = fs.readFileSync(indexCssPath, 'utf8');
if (indexContent.includes('@import "./utilities.css";')) {
    indexContent = indexContent.replace('@import "./utilities.css";', '');
    indexContent = '@import "./utilities.css";\n' + indexContent;
    fs.writeFileSync(indexCssPath, indexContent);
    console.log('Fixed index.css');
}

