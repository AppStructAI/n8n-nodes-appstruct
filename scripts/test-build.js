#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 AppStruct n8n Node - Build Test Script\n');

const tests = [
  {
    name: 'TypeScript Build',
    command: 'npm run build',
    description: 'Compiling TypeScript files'
  },
  {
    name: 'ESLint Check',
    command: 'npm run lint',
    description: 'Checking code style and errors'
  },
  {
    name: 'File Structure',
    command: null,
    description: 'Verifying required files exist',
    custom: checkFileStructure
  }
];

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function checkFileStructure() {
  const requiredFiles = [
    'dist/nodes/AppStruct/AppStruct.node.js',
    'dist/nodes/AppStruct/AppStructTrigger.node.js',
    'dist/credentials/AppStructApi.credentials.js',
    'dist/nodes/AppStruct/appstruct.svg'
  ];

  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Missing files: ${missingFiles.join(', ')}`);
  }

  return { success: true, message: 'All required files present' };
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`📋 ${test.name}: ${test.description}`);
    
    try {
      if (test.custom) {
        const result = test.custom();
        console.log(`✅ ${test.name} - ${result.message}\n`);
      } else {
        const result = await runCommand(test.command);
        console.log(`✅ ${test.name} - Success\n`);
      }
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - Failed`);
      if (error.error) {
        console.log(`   Error: ${error.error.message}`);
        if (error.stderr) {
          console.log(`   Details: ${error.stderr}`);
        }
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
      failed++;
    }
  }

  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The node is ready for testing in n8n.');
    console.log('\nNext steps:');
    console.log('1. npm link');
    console.log('2. npm link n8n-nodes-appstruct (in your n8n installation)');
    console.log('3. Start n8n and test the AppStruct nodes');
  } else {
    console.log('\n🔧 Please fix the failing tests before proceeding.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
