# @shopify/dev-mcp

## 1.2.0

### Minor Changes

- 4c3c9fb: ## Major Improvements

  ### Build System Overhaul (PR #88)

  - Migrated from TypeScript compiler (tsc) to Vite for faster builds and better bundling
  - Implemented automatic tool loading from directories, improving modularity
  - Switched to env-paths for cross-platform cache directory support
  - Renamed output to index.js and made it executable for better npm bin support

  ### Theme Validation Enhancements

  - **Full theme validation** (PR #70): Added `validate_theme` tool to check entire theme directories
  - **Theme file validation** (PR #69): Added validation for individual theme files and codeblocks
  - **Improved validation granularity** (PR #84): Separated partial and full theme validation capabilities
  - **Smart validation** (PR #83): Automatically run liquid validation on files modified by LLM
  - **Enhanced error reporting** (PR #82): Added support for schema and doc errors in liquid tools
  - **Updated dependencies** (PR #79): Updated to latest theme-check packages

  ### Tool Improvements

  - **Multi-turn conversations** (PR #90): Enhanced learn_shopify_api tool to better support conversations where API surfaces change
  - **Modular architecture** (PR #87): Reorganized tools into separate files for better maintainability
  - **Search enhancements** (PR #67): Added max_num_results parameter to search_docs_chunks for better control
  - **Tool renaming** (PR #63): Renamed tools for clarity:
    - get_started → learn_shopify_api
    - search_dev_docs → search_docs_chunks
    - fetch_docs_by_path → fetch_full_docs
  - **GraphQL validation** (PR #51): Added validate_graphql_codeblocks tool for Admin API GraphQL validation

  ### GraphQL Schema Support

  - **Multiple schema support** (PR #73): Added support for multiple MCP GraphQL schemas
  - Improved schema fetching and local caching mechanisms
  - Better version management for GraphQL schemas

  ### Bug Fixes & Maintenance

  - Fixed Vite configuration for theme-check-node package (PR #95)
  - Fixed flaky tests in theme validation (PR #77)
  - Added deploy workflow (PR #40)
  - Various tool description updates and improvements
