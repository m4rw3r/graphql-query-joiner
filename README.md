## Packages

### GraphQL AST Client

GraphQL client based on parsed query ASTs with a simple API.

## Development

Requirements:

- [PNPM](https://pnpm.io/)

```bash
pnpm install

# Typecheck TypeScript in all packages
pnpm check

# Run tests for all packages
pnpm test

# Lint all packages
pnpm lint

# Format code in all packages using Prettier
pnpm format

# Build all packages
pnpm build
```

The build is a multistage:

- Typechecks using `tsconfig.json` with paths to all types.
- Rollup builds treeshaked `.d.ts` files, placed in `dist/` where
  `package.json` of each package can find them using
  `types: "dist/index.d.ts"`.
- Typescript builds each project individually, without path-mappings, and
  places the files in `dist/`, using the previously built `.d.ts` files for
  typechecking during build.
