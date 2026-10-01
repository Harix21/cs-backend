const fs = require('fs');
const path = require('path');

const srcDir = '/Users/apple/Desktop/Cybersentinel2k25/CS-backend copy/src';
const cssFiles = [
  'pages/Auth.css',
  'utilities.css',
  'components/common/Sidebar.css',
  'pages/public/PortalHub.css',
  'pages/admin/AdminDashboard.css',
  'pages/coordinator/CoordinatorDashboard.css'
];

const responsiveCss = `
/* Responsive Base for Mobile & Tablet */
@media (max-width: 900px) {
  body { font-size: 15px; }
  .cyber-login-container, .hud-login-card { padding: 20px; }
}
@media (max-width: 600px) {
  body { font-size: 14px; }
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr !important; }
}
`;

cssFiles.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@media (max-width: 900px)') && !content.includes('@media (max-width: 600px)') && !content.includes('@media (max-width: 768px)')) {
      fs.appendFileSync(filePath, '\n' + responsiveCss);
      console.log('Added responsive styles to ' + file);
    } else {
        // Even if it has media queries, let's just append the general grid fallback if it doesn't have it
        if (!content.includes('.grid-4 { grid-template-columns: 1fr !important; }')) {
            fs.appendFileSync(filePath, '\n' + responsiveCss);
            console.log('Added responsive styles to ' + file);
        }
    }
  }
});

