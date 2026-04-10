# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```sh
cargo build                      # Build mdBook
cargo test --workspace           # Run all unit and integration tests
cargo test --test gui            # Run GUI tests (requires npm install + browser-ui-test)
cargo xtask test-all             # Run all quality checks (workspace tests, clippy, doc, fmt, semver-checks, eslint, gui)
cargo xtask test-workspace        # Just workspace tests
cargo xtask clippy               # Linting
cargo xtask fmt                  # Check formatting
cargo xtask semver-checks        # Verify no SemVer breaking changes
cargo xtask bump <patch|minor|major|alpha|beta|rc>  # Bump versions for release
npm run lint                     # Lint JavaScript files
```

Single test: `cargo test --package <package> --lib <test_name>` or `cargo test --test gui -- <filter>`

## Architecture

mdBook is a Rust workspace with a layered crate architecture:

### Crate Hierarchy

```
mdbook (CLI binary)
├── mdbook-core       - Core types: Book, Config, errors, utilities (internal use only)
├── mdbook-driver     - High-level library: loads books, orchestrates rendering
│   ├── mdbook-preprocessor - Trait/helpers for implementing preprocessors
│   ├── mdbook-renderer     - Trait/helpers for implementing renderers
│   ├── mdbook-html         - HTML renderer (handlebars templates)
│   ├── mdbook-markdown     - Markdown renderer
│   └── mdbook-summary      - SUMMARY.md parser
├── mdbook-compare    - Comparison utility for testing
└── xtask             - Build helper tasks (release, changelog)
```

### Rendering Pipeline

1. `MDBook::load()` reads `book.toml` and `SUMMARY.md` into a `Book` struct
2. Built-in preprocessors run first (links, index, cmd)
3. Custom preprocessors (via `mdbook-foo` commands) transform the book
4. Renderers receive `RenderContext` via stdin, output to `destination/`
5. The HTML renderer uses Handlebars templates in `crates/mdbook-html/src/theme/`

### Key Types

- `mdbook_core::book::Book` - In-memory book representation with chapters
- `mdbook_core::config::Config` - `book.toml` deserialized
- `mdbook_driver::MDBook` - Main entry point for the library API
- `RenderContext` / `PreprocessorContext` - Passed to external renderers/preprocessors via JSON

### Important Patterns

- External preprocessors/renderers are invoked as subprocesses with JSON on stdin/stdout
- Preprocessors: first invocation is `supports <renderer>` to check compatibility, second invocation passes JSON
- Renderers: receive full `RenderContext` as JSON on stdin
- Feature flags: `watch`, `serve`, `search` are default; disable with `--no-default-features`

## Development Notes

- **Tests use snapbox**: Use `str![]` and `file![]` macros; set `SNAPSHOTS=overwrite` to auto-update
- **GUI tests**: Use `.goml` files in `tests/gui/` with `browser-ui-test` framework
- **Tests**: `tests/testsuite/` uses `BookTest` helper for integration testing
- **Edition 2024**, minimum Rust 1.88.0
- **Breaking changes**: CLI and API are considered stable; SemVer breaking changes only in major releases
