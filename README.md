# MCP Code Reviewer

An AI-powered Model Context Protocol (MCP) server for Cursor that provides comprehensive code review functionality between commits and branches.

## Features

- 🔍 **Code Review Between Commits**: Compare any two commits and get detailed analysis
- 🌿 **Branch Comparison**: Review changes between branches (e.g., feature branch vs main)
- 🎯 **Customizable Review Prompts**: Use predefined templates or create custom review criteria
- 📊 **Detailed Reports**: Get comprehensive reports with file references and line numbers
- 🚨 **Security Analysis**: Detect potential security vulnerabilities
- ⚡ **Performance Review**: Identify performance bottlenecks and improvements
- 📋 **Best Practices**: Ensure code follows industry standards and conventions
- 🔧 **Language Support**: Works with multiple programming languages
- 🐛 **Advanced Logical Bug Detection**: Find null pointer access, infinite loops, type coercion issues
- 📝 **JSDoc Analysis**: Automatically suggest missing JSDoc and validate documentation completeness
- 🔄 **Smart Context Analysis**: Understand code context for better issue detection

## Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-code-reviewer
npm install
```

2. **Build the TypeScript code:**
```bash
npm run build
```

3. **Configure Cursor MCP:**
Add this MCP server to your Cursor settings. In Cursor, go to `Settings` > `MCP Servers` and add the following configuration:

```json
{
  "code-reviewer": {
    "command": "node",
    "args": ["<path-to-project>/dist/index.js"],
    "cwd": "<path-to-project>",
    "env": {}
  }
}
```

## Usage

### Available Tools

#### 1. `review_commits`
Compare code changes between two commits.

**Parameters:**
- `from_commit` (required): Source commit hash or branch name
- `to_commit` (optional): Target commit hash or branch name (default: HEAD)
- `repository_path` (optional): Path to git repository (default: current directory)
- `review_prompt` (optional): Custom review prompt or template name
- `file_extensions` (optional): Array of file extensions to review (e.g., [".ts", ".js"])
- `exclude_patterns` (optional): Array of patterns to exclude (e.g., ["test", "spec"])

**Example:**
```
review_commits from_commit="abc123" to_commit="def456" review_prompt="security"
```

#### 2. `review_branches`
Compare code changes between two branches.

**Parameters:**
- `source_branch` (required): Source branch name
- `target_branch` (optional): Target branch name (default: main/master)
- `repository_path` (optional): Path to git repository
- `review_prompt` (optional): Custom review prompt or template name
- `file_extensions` (optional): File extensions to review
- `exclude_patterns` (optional): Patterns to exclude

**Example:**
```
review_branches source_branch="feature/new-api" target_branch="main" review_prompt="comprehensive"
```

#### 3. `list_review_templates`
List all available review prompt templates.

#### 4. `get_review_template`
Get a specific review template.

**Parameters:**
- `template_name` (required): Name of the template

### Review Templates

The system includes several predefined review templates:

- **comprehensive**: Complete code review covering all aspects
- **security**: Security-focused review for vulnerabilities
- **performance**: Performance impact analysis
- **maintainability**: Long-term maintainability assessment
- **bestPractices**: Coding standards and best practices
- **bugPrevention**: Logic errors and potential bugs
- **logicalBugs**: Advanced logical bug detection and runtime errors
- **documentation**: JSDoc and documentation compliance analysis
- **api**: API design and implementation review
- **database**: Database operations and design review

### Example Review Report

```markdown
# Code Review Report

**Review Summary:**
- Files Changed: 5
- Lines Added: 127
- Lines Removed: 23
- Issues Found: 4

## Issues and Recommendations

### 1. CRITICAL: Potential hardcoded secret

**File:** `src/config.ts`
**Line:** 15
**Description:** Line 15 appears to contain a hardcoded secret or sensitive information.
**Suggestion:** Move sensitive information to environment variables or secure configuration.

**Code:**
```typescript
   13  // Configuration settings
   14+ const BASE_URL = 'https://api.example.com';
>  15+ const API_KEY = "***";
   16+ const TIMEOUT = 5000;
```

### 2. MAJOR: Potential null/undefined access

**File:** `src/api.ts`
**Line:** 28
**Description:** Object property access without null checking
**Suggestion:** Add null check or use optional chaining (?.)

**Code:**
```javascript
   25  function updateUser(user) {
   26+   if (user) {
>  27+     user.profile.name = 'John';
   28+     user.profile.email = email;
   29+   }
```

### 3. MINOR: Missing JSDoc documentation

**File:** `src/helpers.ts`
**Line:** 15
**Description:** Function 'calculateTotal' lacks JSDoc documentation
**Code:**
```javascript
   14  
>  15+ function calculateTotal(items, tax) {
   16+   let total = 0;
   17+   for (let item of items) {
```

**Suggestion:** Add JSDoc:
```javascript
/**
 * Description of calculateTotal
 * @param {*} items - Description
 * @param {*} tax - Description
 * @returns {*} Description
 */
```

### 4. MINOR: Long line detected

**File:** `src/utils.ts`
**Line:** 42
**Description:** Line 42 is 135 characters long, which exceeds the recommended 120 character limit.
**Suggestion:** Consider breaking this line into multiple lines for better readability.

---

## Overall Assessment

This code review analyzed 5 files with 127 additions and 23 deletions.

Found 4 issues requiring attention:
- 🚨 1 critical issues that must be addressed
- ⚠️ 1 major issues that should be fixed
- 💡 2 minor improvements suggested

**Key Recommendations:**
1. Potential hardcoded secret (src/config.ts)
2. Potential null/undefined access (src/api.ts)
3. Missing JSDoc documentation (src/helpers.ts)
```

## Development

### Scripts

- `npm run build`: Build TypeScript to JavaScript
- `npm run dev`: Watch mode for development
- `npm run start`: Start the MCP server
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Project Structure

```
src/
├── index.ts              # Main MCP server entry point
├── code-reviewer.ts      # Core code review functionality
├── code-analyzer.ts      # Static code analysis engine
└── review-prompts.ts     # Review prompt templates
```

## Customization

### Adding Custom Review Templates

You can add custom review templates by extending the `ReviewPromptManager`:

```typescript
// Add a new template
promptManager.addTemplate('custom', `
  Focus on:
  1. Custom criteria
  2. Specific patterns
  3. Domain-specific rules
`);
```

### Extending Analysis Rules

Add new analysis rules by extending the `CodeAnalyzer` class and implementing additional analysis methods.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 