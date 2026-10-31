# Publishing react-easy-editor

Everything here is run from the project folder. Nothing in `docs/` ships in the npm package.

## The first release under the new name (done for 1.1.0, kept for reference)

1. **Rename the GitHub repository** to `react-easy-editor` (Settings → General → Repository name).
   `package.json`, the README badges and the demo site all point at `AKASHNEGI-github/react-easy-editor`.
   GitHub redirects the old repository address for a while.
2. **Copy this project into the repository** and push it to `main`. The `CI` workflow runs on every push.
3. **Deploy the demo site on Netlify** (done: <https://react-easy-editor.netlify.app/>). In Netlify choose Add new site →
   Import from Git and pick the repository. `netlify.toml` already sets the build command (`npm run build:demo`) and
   the publish folder (`demo-dist`), so nothing needs typing in. Netlify then redeploys on every push to `main`.
   (`npm run build` builds the npm package into `dist/`; the site has its own command.)
4. **Check the name is still free**, then publish the first version by hand:

   ```bash
   npm view react-easy-editor        # should say "404 Not Found"
   npm install
   npm login                         # opens your browser; first time only
   npm publish                       # asks for your 2FA code
   ```

   `npm publish` runs `prepublishOnly` first: lint, unit tests, build, the CSS scope check, and the package
   metadata and types checks (publint and Are The Types Wrong). If any step fails, nothing is published.
   If npm shows the release as waiting for approval, approve it on npmjs.com (it asks for your 2FA code).
5. **Send people from the old package to the new one.** This moves existing users and the old package's search
   traffic:

   ```bash
   npm deprecate react-easy-text-editor "Renamed to react-easy-editor. Run: npm install react-easy-editor"
   ```

6. **Tag the release** so GitHub shows it, and paste the 1.1.0 section of `CHANGELOG.md` as the release notes:

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

   The `Release` workflow notices that 1.1.0 is already on npm and does nothing.
7. **Set up trusted publishing** so later releases need no token and carry a provenance badge. The setting lives
   on the package's page, so the package has to exist first (step 4). On npmjs.com open `react-easy-editor` →
   Settings and add a trusted publisher of type **GitHub Actions** with these values (the wording on the page may
   differ slightly):

   | Field | Value |
   | --- | --- |
   | Owner or user | `AKASHNEGI-github` |
   | Repository | `react-easy-editor` |
   | Workflow filename | `release.yml` |

8. Do the **GitHub settings and posts** in [LAUNCH.md](./LAUNCH.md).

## Every release after that

1. Move the "Unreleased" notes in `CHANGELOG.md` under a new version heading.
2. Bump the version, which also commits and tags it, then push:

   ```bash
   npm version patch        # or: minor, major
   git push --follow-tags
   ```

3. The `Release` workflow publishes to npm from GitHub's servers, with provenance. Watch it under the
   repository's Actions tab.

Want to see what will be uploaded without publishing? `npm pack --dry-run` lists the files.

## Good to know

- **A version can only be published once.** Even after `npm unpublish` you can never reuse it. Fix mistakes with
  a new version.
- **The name is public.** `react-easy-editor` is not a scoped name, so it is public automatically, and
  `publishConfig.access` is `public` anyway.
- **Installs may lag a minute.** npm scans new releases, so `npm install react-easy-editor` can fail briefly right
  after `npm publish`. Wait a minute and retry.
- **Version numbering.** The package starts at 1.1.0 so that it continues the old package's version history.

## Check it after publishing

```bash
mkdir try && cd try && npm init -y && npm install react react-dom react-easy-editor
```

Then import `{ Editor }` in a React app. It should render a full toolbar with no other setup.
