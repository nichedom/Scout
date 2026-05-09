'use strict';

var match = /^v?(\d+)/.exec(process.version);
var major = match ? parseInt(match[1], 10) : 0;

if (major < 18) {
  console.error('');
  console.error('This project requires Node.js 18 or newer.');
  console.error('Current version: ' + process.version);
  console.error('');
  console.error('Install Node 20 LTS from https://nodejs.org/');
  console.error('Or with nvm: nvm install 20 && nvm use 20');
  console.error('');
  process.exit(1);
}
