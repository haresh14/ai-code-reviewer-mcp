#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { CodeReviewer } from './code-reviewer.js';
import { ReviewPromptManager } from './review-prompts.js';

class CodeReviewMCPServer {
  private server: Server;
  private codeReviewer: CodeReviewer;
  private promptManager: ReviewPromptManager;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-code-reviewer',
        version: '1.0.0',
      }
    );

    this.codeReviewer = new CodeReviewer();
    this.promptManager = new ReviewPromptManager();
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'review_commits',
            description: 'Review code changes between two commits',
            inputSchema: {
              type: 'object',
              properties: {
                from_commit: {
                  type: 'string',
                  description: 'Source commit hash or branch name',
                },
                to_commit: {
                  type: 'string',
                  description: 'Target commit hash or branch name (default: HEAD)',
                },
                repository_path: {
                  type: 'string',
                  description: 'Path to the git repository (default: current directory)',
                },
                review_prompt: {
                  type: 'string',
                  description: 'Custom review prompt or use predefined templates',
                },
                file_extensions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File extensions to review (e.g., [".ts", ".js", ".py"])',
                },
                exclude_patterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Patterns to exclude from review (e.g., ["test", "spec"])',
                },
              },
              required: ['from_commit'],
            },
          },
          {
            name: 'review_branches',
            description: 'Review code changes between two branches',
            inputSchema: {
              type: 'object',
              properties: {
                source_branch: {
                  type: 'string',
                  description: 'Source branch name',
                },
                target_branch: {
                  type: 'string',
                  description: 'Target branch name (default: main/master)',
                },
                repository_path: {
                  type: 'string',
                  description: 'Path to the git repository (default: current directory)',
                },
                review_prompt: {
                  type: 'string',
                  description: 'Custom review prompt or use predefined templates',
                },
                file_extensions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File extensions to review (e.g., [".ts", ".js", ".py"])',
                },
                exclude_patterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Patterns to exclude from review (e.g., ["test", "spec"])',
                },
              },
              required: ['source_branch'],
            },
          },
          {
            name: 'list_review_templates',
            description: 'List available review prompt templates',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_review_template',
            description: 'Get a specific review prompt template',
            inputSchema: {
              type: 'object',
              properties: {
                template_name: {
                  type: 'string',
                  description: 'Name of the review template',
                },
              },
              required: ['template_name'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'review_commits':
            return await this.handleReviewCommits(args);
          case 'review_branches':
            return await this.handleReviewBranches(args);
          case 'list_review_templates':
            return await this.handleListTemplates();
          case 'get_review_template':
            return await this.handleGetTemplate(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async handleReviewCommits(args: any) {
    const {
      from_commit,
      to_commit = 'HEAD',
      repository_path = '.',
      review_prompt,
      file_extensions,
      exclude_patterns,
    } = args;

    const result = await this.codeReviewer.reviewCommits({
      fromCommit: from_commit,
      toCommit: to_commit,
      repositoryPath: repository_path,
      reviewPrompt: review_prompt,
      fileExtensions: file_extensions,
      excludePatterns: exclude_patterns,
    });

    return {
      content: [
        {
          type: 'text',
          text: this.formatReviewResult(result),
        },
      ],
    };
  }

  private async handleReviewBranches(args: any) {
    const {
      source_branch,
      target_branch,
      repository_path = '.',
      review_prompt,
      file_extensions,
      exclude_patterns,
    } = args;

    const result = await this.codeReviewer.reviewBranches({
      sourceBranch: source_branch,
      targetBranch: target_branch,
      repositoryPath: repository_path,
      reviewPrompt: review_prompt,
      fileExtensions: file_extensions,
      excludePatterns: exclude_patterns,
    });

    return {
      content: [
        {
          type: 'text',
          text: this.formatReviewResult(result),
        },
      ],
    };
  }

  private async handleListTemplates() {
    const templates = this.promptManager.listTemplates();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(templates, null, 2),
        },
      ],
    };
  }

  private async handleGetTemplate(args: any) {
    const { template_name } = args;
    const template = this.promptManager.getTemplate(template_name);
    return {
      content: [
        {
          type: 'text',
          text: template || `Template "${template_name}" not found`,
        },
      ],
    };
  }

  private formatReviewResult(result: any): string {
    let output = `# Code Review Report\n\n`;
    output += `**Review Summary:**\n`;
    output += `- Files Changed: ${result.filesChanged}\n`;
    output += `- Lines Added: ${result.linesAdded}\n`;
    output += `- Lines Removed: ${result.linesRemoved}\n`;
    output += `- Issues Found: ${result.issues.length}\n\n`;

    if (result.issues.length > 0) {
      output += `## Issues and Recommendations\n\n`;
      result.issues.forEach((issue: any, index: number) => {
        output += `### ${index + 1}. ${issue.severity.toUpperCase()}: ${issue.title}\n\n`;
        output += `**File:** \`${issue.file}\`\n`;
        if (issue.line) {
          output += `**Line:** ${issue.line}\n`;
        }
        output += `**Description:** ${issue.description}\n\n`;
        if (issue.suggestion) {
          output += `**Suggestion:** ${issue.suggestion}\n\n`;
        }
        if (issue.codeSnippet) {
          output += `**Code:**\n\`\`\`${issue.language || ''}\n${issue.codeSnippet}\n\`\`\`\n\n`;
        }
        output += `---\n\n`;
      });
    }

    if (result.summary) {
      output += `## Overall Assessment\n\n${result.summary}\n\n`;
    }

    return output;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Code Reviewer server running on stdio');
  }
}

const server = new CodeReviewMCPServer();
server.run().catch(console.error); 