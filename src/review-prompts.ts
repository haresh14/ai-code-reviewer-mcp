export class ReviewPromptManager {
  private templates: { [key: string]: string } = {
    comprehensive: `
      Perform a comprehensive code review focusing on:
      1. Code quality and maintainability
      2. Security vulnerabilities and best practices
      3. Performance considerations
      4. Logic errors and potential bugs
      5. Adherence to coding standards
      6. Documentation and comments
      7. Test coverage considerations
      
      For each issue found, provide:
      - Severity level (critical/major/minor/info)
      - Clear description of the problem
      - Specific suggestion for improvement
      - Line number reference where applicable
    `,
    
    security: `
      Focus specifically on security aspects:
      1. Authentication and authorization issues
      2. Input validation and sanitization
      3. SQL injection vulnerabilities
      4. Cross-site scripting (XSS) prevention
      5. Hardcoded secrets or credentials
      6. Insecure data transmission
      7. Access control issues
      8. Cryptographic implementation
      
      Prioritize critical security vulnerabilities that could lead to data breaches or system compromise.
    `,
    
    performance: `
      Analyze code changes for performance impact:
      1. Algorithm efficiency and complexity
      2. Database query optimization
      3. Memory usage and potential leaks
      4. I/O operations and blocking calls
      5. Caching opportunities
      6. Resource utilization
      7. Scalability considerations
      8. Network request optimization
      
      Focus on changes that could significantly impact application performance.
    `,
    
    maintainability: `
      Review code for long-term maintainability:
      1. Code readability and clarity
      2. Function and class design
      3. Separation of concerns
      4. Code duplication (DRY principle)
      5. Naming conventions
      6. Comment quality and documentation
      7. Code structure and organization
      8. Dependency management
      
      Emphasize changes that affect how easy the code will be to modify and extend.
    `,
    
    bestPractices: `
      Check adherence to coding best practices:
      1. Language-specific conventions
      2. Design patterns usage
      3. Error handling implementation
      4. Logging and monitoring
      5. Configuration management
      6. Code formatting and style
      7. Version control practices
      8. Testing approach
      
      Focus on ensuring the code follows established industry standards and team conventions.
    `,
    
    bugPrevention: `
      Look for potential bugs and logic errors:
      1. Null pointer/undefined access
      2. Off-by-one errors in loops
      3. Race conditions and concurrency issues
      4. Incorrect error handling
      5. Edge case handling
      6. Data type mismatches
      7. Resource cleanup (memory leaks, file handles)
      8. State management issues
      
      Prioritize issues that could cause runtime errors or unexpected behavior.
    `,
    
    api: `
      Review API-related changes:
      1. RESTful design principles
      2. HTTP status code usage
      3. Request/response validation
      4. Rate limiting and throttling
      5. API versioning strategy
      6. Documentation completeness
      7. Backward compatibility
      8. Error response consistency
      
      Focus on API usability, reliability, and maintainability.
    `,
    
    database: `
      Analyze database-related code changes:
      1. Query performance and optimization
      2. Index usage and effectiveness
      3. Transaction handling
      4. Data integrity constraints
      5. Migration safety
      6. Connection pooling
      7. ORM usage patterns
      8. Data access layer design
      
      Emphasize changes that could impact data consistency or query performance.
    `,
    
    logicalBugs: `
      Focus on detecting logical bugs and runtime errors:
      1. Null/undefined pointer access
      2. Array bounds checking
      3. Infinite loops and termination conditions
      4. Assignment vs comparison in conditionals
      5. Type coercion and conversion issues
      6. Unreachable code detection
      7. Memory leaks and resource cleanup
      8. Race conditions in async code
      9. Off-by-one errors in loops
      10. Edge case handling
      
      Prioritize issues that could cause runtime failures or incorrect behavior.
    `,
    
    documentation: `
      Analyze documentation and JSDoc compliance:
      1. Missing JSDoc on public functions/classes
      2. Incomplete JSDoc (@param, @returns, @throws)
      3. JSDoc format validation and consistency
      4. Type annotations in JSDoc
      5. Example usage in documentation
      6. API documentation completeness
      7. Code comments for complex logic
      8. README and inline documentation
      
      Focus on ensuring code is well-documented for maintainability.
    `,
  };

  listTemplates(): { name: string; description: string }[] {
    return [
      { name: 'comprehensive', description: 'Complete code review covering all aspects' },
      { name: 'security', description: 'Security-focused review for vulnerabilities' },
      { name: 'performance', description: 'Performance impact analysis' },
      { name: 'maintainability', description: 'Long-term maintainability assessment' },
      { name: 'bestPractices', description: 'Coding standards and best practices' },
      { name: 'bugPrevention', description: 'Logic errors and potential bugs' },
      { name: 'logicalBugs', description: 'Advanced logical bug detection and runtime errors' },
      { name: 'documentation', description: 'JSDoc and documentation compliance analysis' },
      { name: 'api', description: 'API design and implementation review' },
      { name: 'database', description: 'Database operations and design review' },
    ];
  }

  getTemplate(name: string): string {
    return this.templates[name] || this.templates['comprehensive'];
  }

  addTemplate(name: string, prompt: string): void {
    this.templates[name] = prompt;
  }

  removeTemplate(name: string): boolean {
    if (this.templates[name]) {
      delete this.templates[name];
      return true;
    }
    return false;
  }

  updateTemplate(name: string, prompt: string): boolean {
    if (this.templates[name]) {
      this.templates[name] = prompt;
      return true;
    }
    return false;
  }
} 