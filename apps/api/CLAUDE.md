# apps/api

- **A feature is a folder under `src/app/` with one subfolder per kind of file**, as `auth/` is: `controllers/`, `services/`, `guards/`, `decorators/`, `dto/`, `interfaces/`, `constants/`, `modules/`. Only create the kinds the feature has. Tests sit next to the file they test (`guards/session.guard.spec.ts`).
- **Root `package.json` lists the API's runtime dependencies on purpose.** Nx's webpack plugin leaves only root dependencies out of the bundle; without them `main.js` bundles all of `node_modules` (2.5 MB instead of 4 KB). Add a new runtime dependency to both `apps/api/package.json` and the root.
