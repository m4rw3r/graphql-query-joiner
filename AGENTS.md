# Agent Guide

PNPM monorepo for GraphQL client utilities and demo app.

## Repo Layout

- packages/ast-client: GraphQL AST client core
- packages/react-hooks: React hooks built on the AST client
- packages/rollup-plugin-ast-import: Rollup plugin for .graphql imports
- packages/example-app: Vite/Vavite demo app

## Setup

- Install deps: `pnpm install`
- Root scripts live in `package.json`

## Commands

Root (all packages)

- Typecheck: `pnpm check`
- Tests: `pnpm test`
- Type tests: `pnpm test:types`
- Lint: `pnpm lint`
- Format: `pnpm format` (check only: `pnpm format:check`)
- Build: `pnpm build`
- Full pipeline: `pnpm dist`

Single package

- Run a script in one package: `pnpm -C packages/ast-client <script>`
- Examples: `pnpm -C packages/ast-client check`, `pnpm -C packages/react-hooks test`

Single test (Jest)

- One file: `pnpm -C packages/ast-client jest --runTestsByPath src/client.test.ts`
- One test name: `pnpm -C packages/react-hooks jest -t "useQuery"`
- Watch: `pnpm -C packages/ast-client test:watch`

Type tests (tstyche)

- All: `pnpm -C packages/ast-client test:types`
- One file: `pnpm -C packages/ast-client test:types -- src/query.test-d.ts`

Example app

- Dev server: `pnpm -C packages/example-app dev`
- Build: `pnpm -C packages/example-app build`
- Typecheck+codegen: `pnpm -C packages/example-app check`

## Build Notes

- Multi-stage: typecheck with paths, rollup .d.ts, then per-package tsc into `dist/`.

## Code Style

Imports/Exports

- Use `import type` for type-only imports; keep a blank line between groups.
- Prefer named exports for public API (`export function`, `export type`).

Formatting

- Prettier is source of truth; 2-space indentation, LF, final newline.

Types/Naming

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- `useUnknownInCatchVariables: true`; avoid `any` unless required.
- Types/interfaces: PascalCase; functions/vars: camelCase; constants: UPPER_SNAKE_CASE.
- Use `Record<string, unknown>` for loose objects; use helper types like
  `OptionalParameterIfEmpty` for optional variables.

Error Handling

- Throw `Error` with clear messages for invariants.
- Use helpers in `packages/ast-client/src/error.ts` for GraphQL errors.
- Validate external data before trusting shape (see `handleFetchResponse`).

Testing

- Jest for runtime tests; tstyche for type-level tests in ast-client.
- Keep tests next to source with `*.test.ts` or `*.test-d.ts`.

Safety/Perf

- Avoid implicit any/implicit returns; be explicit in control flow.
- Favor predictable allocations; handle async rejections at boundaries.

## Generated Artifacts

- `dist/` is generated; never edit manually.
- Example app generates GraphQL typings in `packages/example-app/src`.

## Expectations for Agents

- Match existing patterns and JSDoc usage for public APIs.
- Keep changes minimal and focused; avoid cross-cutting refactors.
- Always run tests after modifying code.
