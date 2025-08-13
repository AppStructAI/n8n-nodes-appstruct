# Testing Guide for AppStruct n8n Node

This guide provides step-by-step instructions for testing the AppStruct n8n integration.

## Prerequisites

- Node.js 18.x or higher
- n8n installed globally or locally
- AppStruct account with valid credentials
- At least one project in your AppStruct account

## Installation Methods

### Method 1: Local Development Testing

1. **Clone and build the node**:
```bash
cd appstruct-n8n-node
npm install
npm run build
```

2. **Link the package locally**:
```bash
npm link
```

3. **Install n8n globally** (if not already installed):
```bash
npm install -g n8n
```

4. **Link the node to n8n**:
```bash
npm link n8n-nodes-appstruct
```

5. **Start n8n**:
```bash
n8n start
```

### Method 2: Direct Installation Testing

1. **Install n8n** (if not already installed):
```bash
npm install -g n8n
```

2. **Install the node from local directory**:
```bash
npm install /path/to/appstruct-n8n-node
```

3. **Start n8n**:
```bash
n8n start
```

### Method 3: Docker Testing

1. **Create a docker-compose.yml**:
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
    volumes:
      - ./appstruct-n8n-node:/home/node/.n8n/custom/
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

2. **Start the container**:
```bash
docker-compose up -d
```

## Setting Up Credentials

1. **Access n8n**: Open http://localhost:5678 in your browser
2. **Go to Credentials**: Click on "Credentials" in the left sidebar
3. **Add New Credential**: Click "Add Credential"
4. **Search for AppStruct**: Type "AppStruct" in the search box
5. **Select AppStruct API**: Click on "AppStruct API"
6. **Enter your credentials**:
   - **Email**: Your AppStruct account email
   - **Password**: Your AppStruct account password
7. **Test the connection**: Click "Test" to verify credentials work
8. **Save**: Click "Save" to store the credentials

## Testing the Main AppStruct Node

### Test 1: Get Projects

1. **Create a new workflow**
2. **Add AppStruct node**
3. **Configure the node**:
   - Resource: `Project`
   - Operation: `Get Many`
   - Credentials: Select your AppStruct API credentials
4. **Execute the node**: Click the "Execute Node" button
5. **Verify results**: You should see a list of your projects

### Test 2: Get Tables

1. **Add another AppStruct node**
2. **Configure the node**:
   - Resource: `Table`
   - Operation: `Get Many`
   - Project: Select a project from the dropdown
   - Credentials: Select your AppStruct API credentials
3. **Execute the node**
4. **Verify results**: You should see a list of tables in the selected project

### Test 3: Create a Table

1. **Add another AppStruct node**
2. **Configure the node**:
   - Resource: `Table`
   - Operation: `Create`
   - Project: Select a project
   - Table Name: Enter a test table name (e.g., "test_table")
3. **Execute the node**
4. **Verify results**: Should return success confirmation
5. **Verify in AppStruct**: Check your AppStruct dashboard to confirm the table was created

### Test 4: Add a Column

1. **Add another AppStruct node**
2. **Configure the node**:
   - Resource: `Column`
   - Operation: `Add`
   - Project: Select your project
   - Table Name: Select the table you just created
   - Column Name: Enter "test_column"
   - Column Type: Select "text"
   - Is Nullable: true
3. **Execute the node**
4. **Verify results**: Should return success confirmation

### Test 5: Insert a Record

1. **Add another AppStruct node**
2. **Configure the node**:
   - Resource: `Record`
   - Operation: `Create`
   - Project: Select your project
   - Table Name: Select your test table
   - Data: Enter JSON like `{"test_column": "Hello World"}`
3. **Execute the node**
4. **Verify results**: Should return success confirmation

### Test 6: Get Records

1. **Add another AppStruct node**
2. **Configure the node**:
   - Resource: `Record`
   - Operation: `Get Many`
   - Project: Select your project
   - Table Name: Select your test table
   - Limit: 10
3. **Execute the node**
4. **Verify results**: Should return the record you just inserted

## Testing the AppStruct Trigger Node

### Test 7: New Row Trigger

1. **Create a new workflow**
2. **Add AppStruct Trigger node**
3. **Configure the trigger**:
   - Trigger On: `New Row`
   - Project: Select your project
   - Table Name: Select your test table
   - Poll Interval: 1 (minute for faster testing)
4. **Add a simple action node** (like "Set" node to log the data)
5. **Activate the workflow**: Toggle the workflow to "Active"
6. **Test the trigger**: 
   - Manually insert a new record into your table via AppStruct dashboard or another workflow
   - Wait 1-2 minutes for the trigger to poll
   - Check the execution history to see if the trigger fired

### Test 8: New Table Trigger

1. **Create a new workflow**
2. **Add AppStruct Trigger node**
3. **Configure the trigger**:
   - Trigger On: `New Table`
   - Project: Select your project
   - Poll Interval: 1
4. **Add a simple action node**
5. **Activate the workflow**
6. **Test**: Create a new table in AppStruct and wait for the trigger

## Complete Test Workflow

Here's a complete test workflow you can import:

1. **Copy this workflow JSON** (save as `test-workflow.json`):

```json
{
  "name": "AppStruct Complete Test",
  "nodes": [
    {
      "parameters": {},
      "id": "start-node",
      "name": "When clicking \"Test workflow\"",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "resource": "project",
        "operation": "getMany"
      },
      "id": "get-projects",
      "name": "Get Projects",
      "type": "n8n-nodes-appstruct.appStruct",
      "typeVersion": 1,
      "position": [460, 300],
      "credentials": {
        "appStructApi": {
          "id": "YOUR_CREDENTIAL_ID",
          "name": "AppStruct API"
        }
      }
    },
    {
      "parameters": {
        "resource": "table",
        "operation": "getMany",
        "projectId": "={{ $json.id }}"
      },
      "id": "get-tables",
      "name": "Get Tables",
      "type": "n8n-nodes-appstruct.appStruct",
      "typeVersion": 1,
      "position": [680, 300],
      "credentials": {
        "appStructApi": {
          "id": "YOUR_CREDENTIAL_ID",
          "name": "AppStruct API"
        }
      }
    }
  ],
  "connections": {
    "When clicking \"Test workflow\"": {
      "main": [
        [
          {
            "node": "Get Projects",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get Projects": {
      "main": [
        [
          {
            "node": "Get Tables",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

2. **Import the workflow**:
   - Go to n8n dashboard
   - Click "Import from JSON"
   - Paste the JSON
   - Update the credential IDs
   - Save the workflow

3. **Execute the workflow**: Click "Execute Workflow"

## Troubleshooting Common Issues

### Issue 1: Node Not Appearing
**Problem**: AppStruct nodes don't appear in n8n
**Solution**: 
- Restart n8n after installation
- Check that the node was built correctly (`npm run build`)
- Verify the package is linked properly

### Issue 2: Credential Test Fails
**Problem**: "Authentication failed" error
**Solution**:
- Verify your AppStruct email/password are correct
- Check if your AppStruct account is active
- Ensure you have internet connectivity

### Issue 3: Empty Dropdowns
**Problem**: Project or Table dropdowns are empty
**Solution**:
- Make sure you have projects in your AppStruct account
- Check that credentials are properly configured
- Verify the API is accessible

### Issue 4: GraphQL Errors
**Problem**: "GraphQL Error" messages
**Solution**:
- Check the n8n console for detailed error messages
- Verify the project/table names are correct
- Ensure you have permissions for the operation

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Basic Functionality
- [ ] Node appears in n8n node palette
- [ ] Credentials can be created and tested successfully
- [ ] Project dropdown loads user projects
- [ ] Table dropdown loads tables for selected project

### Project Operations
- [ ] Get Many Projects returns project list

### Table Operations  
- [ ] Get Many Tables returns table list
- [ ] Create Table creates new table
- [ ] Get Schema returns table structure
- [ ] Delete Table removes table

### Record Operations
- [ ] Get Many Records returns data
- [ ] Create Record inserts new record
- [ ] Update Record modifies existing record
- [ ] Delete Record removes record

### Column Operations
- [ ] Add Column creates new column
- [ ] Delete Column removes column

### Trigger Operations
- [ ] New Row trigger detects new records
- [ ] New Table trigger detects new tables
- [ ] New Column trigger detects new columns
- [ ] Triggers respect polling intervals

### Error Handling
- [ ] Invalid credentials show proper error
- [ ] Invalid project/table selections show errors
- [ ] Network errors are handled gracefully
- [ ] Malformed JSON data shows validation errors

## Performance Testing

### Load Testing
1. Create a table with 1000+ records
2. Test "Get Many Records" with different limits
3. Verify performance is acceptable

### Trigger Performance
1. Set up multiple triggers with different intervals
2. Create rapid data changes
3. Verify triggers don't miss events or duplicate

## Automated Testing Script

Create this test script for automated testing:

```javascript
// test-script.js
const { exec } = require('child_process');

const tests = [
  'npm run build',
  'npm run lint',
  'npm run format -- --check'
];

async function runTests() {
  for (const test of tests) {
    console.log(`Running: ${test}`);
    try {
      await new Promise((resolve, reject) => {
        exec(test, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log('✅ Passed');
    } catch (error) {
      console.log('❌ Failed:', error.message);
    }
  }
}

runTests();
```

Run with: `node test-script.js`

This comprehensive testing approach will ensure your AppStruct n8n integration works correctly across all features and edge cases!
