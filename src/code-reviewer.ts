import { simpleGit, SimpleGit, DiffResult } from 'simple-git';
import { createTwoFilesPatch } from 'diff';
import { ReviewPromptManager } from './review-prompts.js';
import { CodeAnalyzer } from './code-analyzer.js';

export interface ReviewOptions {
  fromCommit?: string;
  toCommit?: string;
  sourceBranch?: string;
  targetBranch?: string;
  repositoryPath?: string;
  reviewPrompt?: string;
  fileExtensions?: string[];
  excludePatterns?: string[];
}

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  title: string;
  description: string;
  file: string;
  line?: number;
  suggestion?: string;
  codeSnippet?: string;
  language?: string;
}

export interface ReviewResult {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  issues: ReviewIssue[];
  summary?: string;
}

export class CodeReviewer {
  private git!: SimpleGit;
  private promptManager: ReviewPromptManager;
  private codeAnalyzer: CodeAnalyzer;

  constructor() {
    this.promptManager = new ReviewPromptManager();
    this.codeAnalyzer = new CodeAnalyzer();
  }

  async reviewCommits(options: ReviewOptions): Promise<ReviewResult> {
    const { fromCommit, toCommit = 'HEAD', repositoryPath = '.' } = options;
    
    if (!fromCommit) {
      throw new Error('fromCommit is required');
    }

    this.git = simpleGit(repositoryPath);
    
    try {
      // Validate commits exist
      await this.git.show([fromCommit, '--format=format:', '--name-only']);
      await this.git.show([toCommit, '--format=format:', '--name-only']);
    } catch (error) {
      throw new Error(`Invalid commit reference: ${error}`);
    }

    const diffSummary = await this.git.diffSummary([fromCommit, toCommit]);
    const diff = await this.git.diff([fromCommit, toCommit]);

    return this.analyzeDiff(diff, diffSummary, options);
  }

  async reviewBranches(options: ReviewOptions): Promise<ReviewResult> {
    const { sourceBranch, targetBranch, repositoryPath = '.' } = options;
    
    if (!sourceBranch) {
      throw new Error('sourceBranch is required');
    }

    this.git = simpleGit(repositoryPath);

    try {
      // Get default branch if targetBranch not specified
      let actualTargetBranch = targetBranch;
      if (!actualTargetBranch) {
        const branches = await this.git.branch(['-r']);
        actualTargetBranch = branches.all.includes('origin/main') ? 'origin/main' : 'origin/master';
      }

      // Validate branches exist
      await this.git.show([sourceBranch, '--format=format:', '--name-only']);
      await this.git.show([actualTargetBranch, '--format=format:', '--name-only']);

      const diffSummary = await this.git.diffSummary([actualTargetBranch, sourceBranch]);
      const diff = await this.git.diff([actualTargetBranch, sourceBranch]);

      return this.analyzeDiff(diff, diffSummary, options);
    } catch (error) {
      throw new Error(`Invalid branch reference: ${error}`);
    }
  }

  private async analyzeDiff(diff: string, diffSummary: any, options: ReviewOptions): Promise<ReviewResult> {
    const { reviewPrompt, fileExtensions, excludePatterns } = options;

    // Parse diff and filter files
    const parsedDiff = this.parseDiff(diff);
    const filteredFiles = this.filterFiles(parsedDiff, fileExtensions, excludePatterns);

    // Get review prompt
    const prompt = reviewPrompt || this.promptManager.getTemplate('comprehensive');

    // Analyze each file change
    const issues: ReviewIssue[] = [];
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;

    for (const fileChange of filteredFiles) {
      totalLinesAdded += fileChange.additions;
      totalLinesRemoved += fileChange.deletions;

      const fileIssues = await this.codeAnalyzer.analyzeFileChange(fileChange, prompt);
      issues.push(...fileIssues);
    }

    // Generate overall summary
    const summary = await this.codeAnalyzer.generateSummary(filteredFiles, issues, prompt);

    return {
      filesChanged: filteredFiles.length,
      linesAdded: totalLinesAdded,
      linesRemoved: totalLinesRemoved,
      issues: issues.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      summary,
    };
  }

  private parseDiff(diff: string): FileChange[] {
    const files: FileChange[] = [];
    const fileRegex = /^diff --git a\/(.*?) b\/(.*?)$/gm;
    const hunks = diff.split(/^diff --git/m).slice(1);

    hunks.forEach((hunk) => {
      const lines = hunk.split('\n');
      const header = 'diff --git' + lines[0];
      
      const fileMatch = header.match(/^diff --git a\/(.*?) b\/(.*?)$/);
      if (!fileMatch) return;

      const fileName = fileMatch[2];
      const isDeleted = lines.some(line => line.startsWith('deleted file mode'));
      const isNewFile = lines.some(line => line.startsWith('new file mode'));
      
      let additions = 0;
      let deletions = 0;
      const changes: LineChange[] = [];
      let currentLineOld = 0;
      let currentLineNew = 0;

      lines.forEach((line, index) => {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (match) {
            currentLineOld = parseInt(match[1]);
            currentLineNew = parseInt(match[2]);
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
          changes.push({
            type: 'addition',
            lineNumber: currentLineNew,
            content: line.substring(1),
          });
          currentLineNew++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
          changes.push({
            type: 'deletion',
            lineNumber: currentLineOld,
            content: line.substring(1),
          });
          currentLineOld++;
        } else if (!line.startsWith('\\') && !line.startsWith('diff') && 
                   !line.startsWith('index') && !line.startsWith('+++') && 
                   !line.startsWith('---') && !line.startsWith('@@') && 
                   line.trim() !== '') {
          changes.push({
            type: 'context',
            lineNumber: currentLineOld,
            content: line.startsWith(' ') ? line.substring(1) : line,
          });
          currentLineOld++;
          currentLineNew++;
        }
      });

      files.push({
        fileName,
        oldFileName: fileMatch[1],
        isDeleted,
        isNewFile,
        additions,
        deletions,
        changes,
        rawDiff: 'diff --git' + hunk,
      });
    });

    return files;
  }

  private filterFiles(files: FileChange[], extensions?: string[], excludePatterns?: string[]): FileChange[] {
    return files.filter(file => {
      // Filter by extensions
      if (extensions && extensions.length > 0) {
        const hasValidExtension = extensions.some(ext => 
          file.fileName.toLowerCase().endsWith(ext.toLowerCase())
        );
        if (!hasValidExtension) return false;
      }

      // Filter by exclude patterns
      if (excludePatterns && excludePatterns.length > 0) {
        const shouldExclude = excludePatterns.some(pattern => 
          file.fileName.toLowerCase().includes(pattern.toLowerCase())
        );
        if (shouldExclude) return false;
      }

      return true;
    });
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'major': return 3;
      case 'minor': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }
}

export interface FileChange {
  fileName: string;
  oldFileName: string;
  isDeleted: boolean;
  isNewFile: boolean;
  additions: number;
  deletions: number;
  changes: LineChange[];
  rawDiff: string;
}

export interface LineChange {
  type: 'addition' | 'deletion' | 'context';
  lineNumber: number;
  content: string;
} 