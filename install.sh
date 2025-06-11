#!/bin/bash

# MCP Code Reviewer Installation Script

echo "🚀 Installing MCP Code Reviewer..."

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

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the project
echo "🔨 Building TypeScript code..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build project"
    exit 1
fi

echo "✅ Build completed successfully"

# Get the current directory
CURRENT_DIR=$(pwd)

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Open Cursor"
echo "2. Go to Settings > MCP Servers"
echo "3. Add the following configuration:"
echo ""
echo "{"
echo "  \"code-reviewer\": {"
echo "    \"command\": \"node\","
echo "    \"args\": [\"$CURRENT_DIR/dist/index.js\"],"
echo "    \"cwd\": \"$CURRENT_DIR\","
echo "    \"env\": {}"
echo "  }"
echo "}"
echo ""
echo "4. Restart Cursor to load the MCP server"
echo ""
echo "📖 Usage examples:"
echo "- review_commits from_commit=\"abc123\" to_commit=\"def456\""
echo "- review_branches source_branch=\"feature/new-api\" target_branch=\"main\""
echo "- list_review_templates"
echo ""
echo "For more information, see the README.md file." 