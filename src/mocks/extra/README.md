Drop a module here that exports `handlers` (an array of MSW handlers) to add
feature-specific mock endpoints. `../handlers.ts` picks them up automatically
with `import.meta.glob`, for both the browser worker and the test server.
