import type { FileChange, LineChange, ReviewIssue } from './code-reviewer.js';

export class CodeAnalyzer {
  
  async analyzeFileChange(fileChange: FileChange, prompt: string): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];
    
    // Enhanced static analysis
    issues.push(...this.analyzeCodeQuality(fileChange));
    issues.push(...this.analyzeSecurityIssues(fileChange));
    issues.push(...this.analyzeBestPractices(fileChange));
    issues.push(...this.analyzeLogicalBugs(fileChange));
    issues.push(...this.analyzeJSDocIssues(fileChange));
    issues.push(...this.analyzePerformanceIssues(fileChange));
    
    return issues;
  }

  async generateSummary(files: FileChange[], issues: ReviewIssue[], prompt: string): Promise<string> {
    const totalFiles = files.length;
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
    
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    
    let summary = `This code review analyzed ${totalFiles} files with ${totalAdditions} additions and ${totalDeletions} deletions.\n\n`;
    
    if (issues.length === 0) {
      summary += '✅ **Excellent work!** No significant issues were found.';
    } else {
      summary += `Found ${issues.length} issues:\n`;
      if (criticalIssues > 0) summary += `- 🚨 ${criticalIssues} critical issues\n`;
      if (majorIssues > 0) summary += `- ⚠️ ${majorIssues} major issues\n`;
    }
    
    return summary;
  }

  private analyzeCodeQuality(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    
    for (const line of addedLines) {
      // Check for long lines
      if (line.content.length > 120) {
        issues.push(this.createIssue(
          'minor',
          'Long line detected',
          `Line is ${line.content.length} characters long`,
          fileChange.fileName,
          line.lineNumber,
          'Break into multiple lines for better readability',
          fileChange,
          3
        ));
      }
      
      // Check for TODO comments
      if (line.content.match(/\b(TODO|FIXME)\b/i)) {
        issues.push(this.createIssue(
          'info',
          'TODO/FIXME comment found',
          'Unresolved TODO or FIXME comment',
          fileChange.fileName,
          line.lineNumber,
          'Address the TODO or create a proper issue',
          fileChange,
          2
        ));
      }
    }
    
    return issues;
  }

  private analyzeSecurityIssues(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    
    for (const line of addedLines) {
      // Check for hardcoded secrets
      if (line.content.match(/(password|secret|key|token)\s*[:=]\s*['""][^'""]+['""]|api_key/i)) {
        issues.push({
          severity: 'critical',
          title: 'Potential hardcoded secret',
          description: 'Possible hardcoded credential or secret',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Move to environment variables',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 2).replace(/(['""])[^'""]*(['""])/g, '$1***$2'),
        });
      }
    }
    
    return issues;
  }

  private analyzeBestPractices(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const fileExt = this.getFileExtension(fileChange.fileName);
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    
    if (fileExt === '.ts' || fileExt === '.js') {
      for (const line of addedLines) {
        // Check for == instead of ===
        if (line.content.match(/[^=!]==[^=]|[^=!]!=[^=]/)) {
          issues.push({
            severity: 'minor',
            title: 'Use strict equality',
            description: 'Using loose equality instead of strict',
            file: fileChange.fileName,
            line: line.lineNumber,
            suggestion: 'Use === or !== for strict comparison',
            codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 2),
          });
        }
      }
    }
    
    return issues;
  }

  private analyzeLogicalBugs(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    const fileExt = this.getFileExtension(fileChange.fileName);
    
    for (const line of addedLines) {
      // Check for null/undefined access without proper checks
      if (line.content.match(/\w+\.\w+/) && !line.content.match(/\?\./)) {
        const hasNullCheck = this.hasNullCheckNearby(fileChange, line.lineNumber);
        if (!hasNullCheck && !line.content.match(/if\s*\(|&&|catch|try/)) {
                  issues.push({
          severity: 'major',
          title: 'Potential null/undefined access',
          description: 'Object property access without null checking',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Add null check or use optional chaining (?.)',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
        });
        }
      }
      
      // Check for array access without bounds checking
      if (line.content.match(/\[\s*\d+\s*\]/) || line.content.match(/\[.*\]/) && !line.content.match(/\.length/)) {
        issues.push({
          severity: 'minor',
          title: 'Array access without bounds check',
          description: 'Direct array indexing without length validation',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Check array length before accessing elements',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 2),
        });
      }
      
      // Check for infinite loop potential
      if (line.content.match(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/)) {
        issues.push({
          severity: 'major',
          title: 'Potential infinite loop',
          description: 'Loop condition that may never become false',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Add proper exit condition or break statement',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 4),
        });
      }
      
      // Check for assignment in conditional
      if (line.content.match(/if\s*\([^)]*=[^=]/)) {
        issues.push({
          severity: 'major',
          title: 'Assignment in conditional',
          description: 'Assignment (=) used instead of comparison (==, ===)',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Use comparison operator or wrap assignment in extra parentheses if intentional',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
        });
      }
      
      // Check for unreachable code patterns
      if (line.content.match(/return.*\n.*[^}]/)) {
        issues.push({
          severity: 'minor',
          title: 'Potentially unreachable code',
          description: 'Code after return statement may be unreachable',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Remove unreachable code or restructure logic',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 4),
        });
      }
      
      // Check for type coercion issues (JavaScript/TypeScript)
      if ((fileExt === '.js' || fileExt === '.ts') && line.content.match(/\+\s*['""]|['""].*\+/)) {
        issues.push({
          severity: 'minor',
          title: 'Potential type coercion',
          description: 'String concatenation with + operator may cause unexpected type conversion',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Use template literals or explicit type conversion',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 2),
        });
      }
    }
    
    return issues;
  }

  private analyzeJSDocIssues(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const fileExt = this.getFileExtension(fileChange.fileName);
    
    // Only analyze JavaScript/TypeScript files
    if (fileExt !== '.js' && fileExt !== '.ts' && fileExt !== '.jsx' && fileExt !== '.tsx') {
      return issues;
    }
    
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    
    for (let i = 0; i < addedLines.length; i++) {
      const line = addedLines[i];
      
      // Check for function declarations without JSDoc
      if (this.isFunctionDeclaration(line.content)) {
        const hasJSDoc = this.hasJSDocAbove(addedLines, i);
        if (!hasJSDoc) {
          const functionInfo = this.extractFunctionInfo(line.content);
          issues.push({
            severity: 'minor',
            title: 'Missing JSDoc documentation',
            description: `Function '${functionInfo.name}' lacks JSDoc documentation`,
            file: fileChange.fileName,
            line: line.lineNumber,
            suggestion: this.generateJSDocSuggestion(functionInfo),
            codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
          });
        }
      }
      
      // Check for class declarations without JSDoc
      if (line.content.match(/^[\s]*(?:export\s+)?class\s+\w+/)) {
        const hasJSDoc = this.hasJSDocAbove(addedLines, i);
        if (!hasJSDoc) {
          const className = line.content.match(/class\s+(\w+)/)?.[1] || 'Unknown';
          issues.push({
            severity: 'minor',
            title: 'Missing class JSDoc',
            description: `Class '${className}' lacks JSDoc documentation`,
            file: fileChange.fileName,
            line: line.lineNumber,
            suggestion: `Add JSDoc:\n/**\n * Description of ${className} class\n */`,
            codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
          });
        }
      }
      
      // Check for incomplete JSDoc
      if (line.content.match(/\/\*\*/)) {
        const jsDocBlock = this.extractJSDocBlock(addedLines, i);
        const nextFunctionLine = this.findNextFunction(addedLines, i);
        
        if (nextFunctionLine) {
          const functionInfo = this.extractFunctionInfo(nextFunctionLine.content);
          const jsDocIssues = this.validateJSDoc(jsDocBlock, functionInfo);
          
          jsDocIssues.forEach(issue => {
            issues.push({
              severity: 'minor',
              title: 'Incomplete JSDoc',
              description: issue,
              file: fileChange.fileName,
              line: line.lineNumber,
              suggestion: 'Add missing JSDoc tags (@param, @returns, @throws)',
              codeSnippet: jsDocBlock.substring(0, 100) + '...',
            });
          });
        }
      }
    }
    
    return issues;
  }

  private analyzePerformanceIssues(fileChange: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const addedLines = fileChange.changes.filter(c => c.type === 'addition');
    const fileExt = this.getFileExtension(fileChange.fileName);
    
    for (const line of addedLines) {
      // Check for inefficient loops
      if (line.content.match(/for\s*\([^)]*\.length[^)]*\)/)) {
        issues.push({
          severity: 'minor',
          title: 'Inefficient loop condition',
          description: 'Array length accessed in every loop iteration',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Cache array length in a variable before the loop',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
        });
      }
      
      // Check for nested loops
      if (line.content.match(/for\s*\(/) && this.hasNestedLoop(fileChange, line.lineNumber)) {
        issues.push({
          severity: 'minor',
          title: 'Nested loop detected',
          description: 'Nested loops can have O(n²) complexity',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Consider optimizing with better data structures or algorithms',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 4),
        });
      }
      
      // Check for synchronous file operations
      if (line.content.match(/\.(readFileSync|writeFileSync|existsSync|statSync)\s*\(/)) {
        issues.push({
          severity: 'major',
          title: 'Synchronous file operation',
          description: 'Synchronous operations block the event loop',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Use asynchronous alternatives with async/await',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
        });
      }
      
      // Check for inefficient string concatenation
      if (line.content.match(/\+=.*['""]/) && (fileExt === '.js' || fileExt === '.ts')) {
        issues.push({
          severity: 'minor',
          title: 'Inefficient string concatenation',
          description: 'String concatenation in loops can be inefficient',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Use array.join() or template literals for better performance',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 3),
        });
      }
      
      // Check for missing memoization opportunities
      if (line.content.match(/function.*\(.*\).*\{/) && this.hasExpensiveOperation(line.content)) {
        issues.push({
          severity: 'info',
          title: 'Consider memoization',
          description: 'Function with expensive operations could benefit from memoization',
          file: fileChange.fileName,
          line: line.lineNumber,
          suggestion: 'Consider caching results for repeated calls with same parameters',
          codeSnippet: this.getCodeContext(fileChange, line.lineNumber, 4),
        });
      }
    }
    
    return issues;
  }

  // Helper methods for enhanced analysis
  private createIssue(
    severity: 'critical' | 'major' | 'minor' | 'info',
    title: string,
    description: string,
    file: string,
    line: number,
    suggestion: string,
    fileChange: FileChange,
    contextLines: number = 2
  ): ReviewIssue {
    return {
      severity,
      title,
      description,
      file,
      line,
      suggestion,
      codeSnippet: this.getCodeContext(fileChange, line, contextLines),
      language: this.getLanguageFromExtension(this.getFileExtension(file)),
    };
  }

  private getCodeContext(fileChange: FileChange, targetLineNumber: number, contextLines: number = 2): string {
    // Get all lines sorted by line number
    const allLines = [...fileChange.changes].sort((a, b) => a.lineNumber - b.lineNumber);
    
    // Find the target line
    const targetLine = allLines.find(line => line.lineNumber === targetLineNumber);
    if (!targetLine) {
      return `// Line ${targetLineNumber} not found in changes`;
    }
    
    // Find lines that are close to our target line
    const contextLinesData: LineChange[] = [];
    
    // Get lines before the target
    const beforeLines = allLines
      .filter(line => line.lineNumber < targetLineNumber && line.lineNumber >= targetLineNumber - contextLines)
      .slice(-contextLines); // Take only the last N lines
    
    // Get lines after the target
    const afterLines = allLines
      .filter(line => line.lineNumber > targetLineNumber && line.lineNumber <= targetLineNumber + contextLines)
      .slice(0, contextLines); // Take only the first N lines
    
    // Combine: before + target + after
    contextLinesData.push(...beforeLines, targetLine, ...afterLines);
    
    // Format the lines for display
    const formattedLines = contextLinesData.map(line => {
      const isTarget = line.lineNumber === targetLineNumber;
      const prefix = isTarget ? '> ' : '  ';
      const lineNumberStr = String(line.lineNumber).padStart(3, ' ');
      const typeIndicator = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';
      const content = line.content || '';
      
      return `${prefix}${lineNumberStr}${typeIndicator} ${content}`;
    });
    
    // If we only have the target line, add some context indication
    if (formattedLines.length === 1) {
      const line = targetLine;
      const lineNumberStr = String(line.lineNumber).padStart(3, ' ');
      const typeIndicator = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';
      return `> ${lineNumberStr}${typeIndicator} ${line.content}`;
    }
    
    return formattedLines.join('\n');
  }

  private hasNullCheckNearby(fileChange: FileChange, lineNumber: number): boolean {
    const contextLines = fileChange.changes.filter(c => 
      Math.abs(c.lineNumber - lineNumber) <= 3 && 
      (c.content.match(/if\s*\([^)]*null/) || 
       c.content.match(/if\s*\([^)]*undefined/) ||
       c.content.match(/&&\s*\w+/) ||
       c.content.match(/\?\./))
    );
    return contextLines.length > 0;
  }

  private isFunctionDeclaration(content: string): boolean {
    return !!(
      content.match(/^[\s]*(?:export\s+)?(?:async\s+)?function\s+\w+/) ||
      content.match(/^[\s]*(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/) ||
      content.match(/^[\s]*(?:async\s+)?\w+\s*\([^)]*\)\s*\{/) ||
      content.match(/^[\s]*(?:public|private|protected)\s+(?:async\s+)?\w+\s*\([^)]*\)/)
    );
  }

  private hasJSDocAbove(lines: LineChange[], currentIndex: number): boolean {
    if (currentIndex === 0) return false;
    
    for (let i = currentIndex - 1; i >= 0 && i >= currentIndex - 5; i--) {
      if (lines[i].content.match(/\*\//)) return true;
      if (lines[i].content.trim() && !lines[i].content.match(/^\s*[\*\/]/)) break;
    }
    return false;
  }

  private extractFunctionInfo(content: string): { name: string; params: string[]; hasReturn: boolean } {
    const functionMatch = content.match(/(?:function\s+(\w+)|(\w+)\s*\(|(\w+)\s*=)/);
    const name = functionMatch?.[1] || functionMatch?.[2] || functionMatch?.[3] || 'anonymous';
    
    const paramsMatch = content.match(/\(([^)]*)\)/);
    const params = paramsMatch?.[1] 
      ? paramsMatch[1].split(',').map(p => p.trim().split(/\s+/)[0].replace(/[=:].*/, '')) 
      : [];
    
    const hasReturn = content.includes('return') || content.includes('=>');
    
    return { name, params, hasReturn };
  }

  private generateJSDocSuggestion(functionInfo: { name: string; params: string[]; hasReturn: boolean }): string {
    let jsdoc = '/**\n * Description of ' + functionInfo.name + '\n';
    
    functionInfo.params.forEach(param => {
      if (param.trim()) {
        jsdoc += ` * @param {*} ${param.trim()} - Description\n`;
      }
    });
    
    if (functionInfo.hasReturn) {
      jsdoc += ' * @returns {*} Description\n';
    }
    
    jsdoc += ' */';
    return jsdoc;
  }

  private extractJSDocBlock(lines: LineChange[], startIndex: number): string {
    let block = '';
    for (let i = startIndex; i < lines.length; i++) {
      block += lines[i].content + '\n';
      if (lines[i].content.includes('*/')) break;
    }
    return block;
  }

  private findNextFunction(lines: LineChange[], startIndex: number): LineChange | null {
    for (let i = startIndex + 1; i < lines.length && i < startIndex + 10; i++) {
      if (this.isFunctionDeclaration(lines[i].content)) {
        return lines[i];
      }
    }
    return null;
  }

  private validateJSDoc(jsDocBlock: string, functionInfo: { name: string; params: string[]; hasReturn: boolean }): string[] {
    const issues: string[] = [];
    
    functionInfo.params.forEach(param => {
      if (param.trim() && !jsDocBlock.includes(`@param`) || !jsDocBlock.includes(param)) {
        issues.push(`Missing @param for '${param}'`);
      }
    });
    
    if (functionInfo.hasReturn && !jsDocBlock.includes('@returns') && !jsDocBlock.includes('@return')) {
      issues.push('Missing @returns documentation');
    }
    
    return issues;
  }

  private hasNestedLoop(fileChange: FileChange, lineNumber: number): boolean {
    const nextLines = fileChange.changes.filter(c => 
      c.lineNumber > lineNumber && c.lineNumber <= lineNumber + 20
    );
    
    return nextLines.some(line => 
      line.content.match(/for\s*\(|while\s*\(|forEach\s*\(/)
    );
  }

  private hasExpensiveOperation(content: string): boolean {
    return !!(
      content.match(/sort\s*\(/) ||
      content.match(/filter\s*\(/) ||
      content.match(/map\s*\(/) ||
      content.match(/reduce\s*\(/) ||
      content.match(/JSON\.parse|JSON\.stringify/) ||
      content.match(/RegExp|new\s+RegExp/)
    );
  }

  private getFileExtension(fileName: string): string {
    const ext = fileName.toLowerCase().match(/\.[^.]*$/);
    return ext ? ext[0] : '';
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };
    
    return languageMap[ext] || 'text';
  }
} 