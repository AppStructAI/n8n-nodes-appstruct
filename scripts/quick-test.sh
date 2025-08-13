#!/bin/bash

# AppStruct n8n Node - Quick Test Script
# This script sets up a quick testing environment

echo "🚀 AppStruct n8n Node - Quick Test Setup"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

# Build the project
echo "🔨 Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"

# Run linting
echo "🔍 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  Linting issues found (but continuing...)"
else
    echo "✅ Linting passed"
fi

# Check if n8n is installed globally
if command -v n8n &> /dev/null; then
    echo "✅ n8n is installed globally"
    
    # Link the package
    echo "🔗 Linking the package..."
    npm link
    
    # Link to n8n
    echo "🔗 Linking to n8n..."
    npm link n8n-nodes-appstruct
    
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo "   1. Run 'n8n start' to start n8n"
    echo "   2. Open http://localhost:5678 in your browser"
    echo "   3. Look for 'AppStruct' and 'AppStruct Trigger' nodes"
    echo ""
    echo "📖 For detailed testing instructions, see TESTING.md"
    
else
    echo "⚠️  n8n is not installed globally"
    echo ""
    echo "To install n8n and continue:"
    echo "   npm install -g n8n"
    echo "   npm link"
    echo "   npm link n8n-nodes-appstruct"
    echo "   n8n start"
    echo ""
    echo "📖 For detailed setup instructions, see TESTING.md"
fi
