Option A — Update Vercel Install Command (recommended)
1. In Vercel project Settings → Build & Output, set the Install Command to:
    - `npm ci --include=dev`
    This installs exact versions and includes `devDependencies` (so `vite` is available).
2. Keep Build Command as `npm run build` and Output Directory `build`.
3. Redeploy.

If you're using GitHub Actions to build and deploy (we added example workflows), ensure the Actions also install devDependencies by using:

```yaml
- name: Install dependencies (include devDependencies)
   run: npm ci --include=dev
```

Alternatively you can set the environment variable `NPM_CONFIG_PRODUCTION=false` in the project settings of Vercel/Netlify so normal installs include devDependencies.

Notes & troubleshooting
...
Deployment guide — Vercel / Netlify

This project is a Vite React app whose production build output is written to the `build` directory.

Quick checklist before deploying
- Confirm `package.json` has `build` script (typically `vite build`).
- Ensure `vite.config.ts` sets `build.outDir = 'build'` (this repo already uses `build`).
- Create or set the following environment variables in your hosting provider (recommended):
   - `VITE_FUNCTIONS_BASE` — the public Supabase Functions base URL that the frontend calls.
      Example (this repo's project): `https://ibumptwkzlkniqcqmgvx.supabase.co/functions/v1/make-server-8a3943bb`

Deploy to Vercel
1. Push your repository to GitHub/GitLab/Bitbucket and connect it to Vercel.
2. In the Vercel project settings:
   - Set the **Build Command** to `npm run build`.
   - Set the **Output Directory** to `build`.
   - Add an environment variable `VITE_FUNCTIONS_BASE` with the deployed Supabase functions URL.
3. Deploy. Vercel will run the build and host the `build` directory.

Deploy to Netlify
1. Push your repository to a Git remote and connect the repo in Netlify.
2. Netlify will auto-detect. If not, set:
   - Build command: `npm run build`
   - Publish directory: `build`
3. In Site settings → Build & Deploy → Environment, add `VITE_FUNCTIONS_BASE` with the Supabase functions URL.
4. Deploy.

Notes & troubleshooting
- If your functions are hosted on Supabase, ensure CORS or any auth settings allow requests from your deployed frontend domain.
- If you rely on Supabase anon keys or other secrets in the frontend, add them as `VITE_...` environment variables in the provider.
- If you have serverless backend functions you want to deploy separately, deploy those to Supabase Functions (or another platform) and point `VITE_FUNCTIONS_BASE` to the deployed endpoint.

Optional: automatic environment injection (not recommended for secrets)
- The `netlify.toml` file in this repo includes an example `VITE_FUNCTIONS_BASE`. Prefer setting secrets in the provider's UI.

After deployment
- Visit your Vercel/Netlify URL and verify:
  - The page title is `Pet House Veterinary Clinic`.
  - The logo and login flow work.
  - Booking pages can reach the functions endpoint (use browser devtools Network tab).

Continuous deployment with GitHub Actions

You can automatically build and deploy on every push to `main` using GitHub Actions. Two example workflows are included in `.github/workflows/`:

- `deploy-netlify.yml` — builds the project and deploys to Netlify using the Netlify CLI. Required repository secrets:
   - `NETLIFY_AUTH_TOKEN` — your Netlify personal access token
   - `NETLIFY_SITE_ID` — the target Netlify site ID
   - Optional: set `VITE_FUNCTIONS_BASE` in Netlify site env if you need to override at deploy time

- `deploy-vercel.yml` — builds the project and deploys to Vercel via the Vercel GitHub Action. Required repository secrets:
   - `VERCEL_TOKEN` — your Vercel personal token
   - `VERCEL_ORG_ID` — your Vercel organization id
   - `VERCEL_PROJECT_ID` — your Vercel project id

Add these secrets in your GitHub repository Settings → Secrets → Actions before enabling the workflows.

