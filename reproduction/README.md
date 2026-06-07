# Next.js Prerendering Bug Reproduction

## Bug
`next build` crashes with:
```
Error: <Html> should not be imported outside of pages/_document.
```

## To Reproduce
```bash
cd reproduction
pnpm install
npx next build
```

## Environment
- Next.js: 15.5.19
- React: 18.3.1
- Node: >=18

## Expected
Build succeeds with App Router pages generated.

## Actual
Build crashes during prerendering. The error occurs even with `not-found.js` and `error.js` present.

## Versions Affected
- 14.2.15 ❌
- 14.2.35 ❌
- 15.5.19 ❌
- 16.2.7 ❌
- 16.3.0-canary.43 ❌
