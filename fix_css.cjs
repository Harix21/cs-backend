const fs = require('fs');
const path = require('path');

const srcDir = '/Users/apple/Desktop/Cybersentinel2k25/CS-backend copy/src';

// Fix utilities.css
let utils = fs.readFileSync(path.join(srcDir, 'utilities.css'), 'utf8');
utils = utils.replace(/^[\s\S]*?\}/m, ''); // remove everything up to first }
fs.writeFileSync(path.join(srcDir, 'utilities.css'), utils);

// Fix PortalHub.css
let portal = fs.readFileSync(path.join(srcDir, 'pages/public/PortalHub.css'), 'utf8');
portal = portal.replace(/^[\s\S]*?\}/m, '');
fs.writeFileSync(path.join(srcDir, 'pages/public/PortalHub.css'), portal);

// Fix AdminDashboard.css
let admin = fs.readFileSync(path.join(srcDir, 'pages/admin/AdminDashboard.css'), 'utf8');
admin = admin.replace(/^[\s\S]*?\}/m, '');
fs.writeFileSync(path.join(srcDir, 'pages/admin/AdminDashboard.css'), admin);

// Fix Sidebar.css
let sidebar = fs.readFileSync(path.join(srcDir, 'components/common/Sidebar.css'), 'utf8');
sidebar = ':root {\n' + sidebar;
fs.writeFileSync(path.join(srcDir, 'components/common/Sidebar.css'), sidebar);

console.log('CSS files fixed');
