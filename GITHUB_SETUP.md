# GitHub Auto-Update Setup Guide

This guide will help you set up automatic updates for your Electron app using GitHub Releases.

## Step 1: Update package.json with Your GitHub Info

1. Open `package.json`
2. Find the `publish` section under `build`:
   ```json
   "publish": {
     "provider": "github",
     "owner": "YOUR_GITHUB_USERNAME",
     "repo": "YOUR_REPO_NAME"
   }
   ```
3. Replace:
   - `YOUR_GITHUB_USERNAME` with your GitHub username (e.g., `blazarow`)
   - `YOUR_REPO_NAME` with your repository name (e.g., `todo`)

Example:
```json
"publish": {
  "provider": "github",
  "owner": "blazarow",
  "repo": "todo"
}
```

## Step 2: Create a GitHub Personal Access Token

You need a GitHub token with permissions to create releases:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it: `electron-builder-release`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

## Step 3: Set Up GitHub Actions (Recommended - Automated)

### Option A: Using GitHub Actions (Automatic)

The workflow file (`.github/workflows/release.yml`) is already created. It will automatically:
- Build your app when you create a version tag
- Upload the release to GitHub Releases
- Make it available for auto-updates

**To use it:**

1. **Push the workflow file to GitHub:**
   ```bash
   git add .github/workflows/release.yml
   git commit -m "Add GitHub Actions release workflow"
   git push
   ```

2. **Create a release:**
   - Update version in `package.json` (e.g., `1.4.2` → `1.4.3`)
   - Commit and push:
     ```bash
     git add package.json
     git commit -m "Bump version to 1.4.3"
     git push
     ```
   - Create a tag:
     ```bash
     git tag v1.4.3
     git push origin v1.4.3
     ```
   - GitHub Actions will automatically build and publish!

**Note:** GitHub Actions uses `GITHUB_TOKEN` automatically - no manual token setup needed!

## Step 4: Manual Publishing (Alternative)

If you prefer to publish manually or test locally:

### On Windows (PowerShell):

1. **Set the GitHub token as environment variable:**
   ```powershell
   $env:GH_TOKEN = "your_github_token_here"
   ```

2. **Build and publish:**
   ```bash
   pnpm run electron:publish
   ```

   This will:
   - Build your app
   - Create a GitHub Release
   - Upload the portable exe
   - Make it available for auto-updates

### On Windows (Command Prompt):

```cmd
set GH_TOKEN=your_github_token_here
pnpm run electron:publish
```

## Step 5: Test the Update Flow

1. **Publish version 1.4.2** (current version) to GitHub Releases
2. **Update version to 1.4.3** in `package.json`
3. **Publish version 1.4.3** to GitHub Releases
4. **Run version 1.4.2** - it should detect and offer the update!

## How It Works

1. **App checks for updates** on startup (after 3 seconds)
2. **electron-updater** queries GitHub Releases API
3. **If update found**, it downloads the new portable exe
4. **When user accepts**, it replaces the old exe and restarts

## Troubleshooting

### "No releases found" error
- Make sure you've created at least one release on GitHub
- Check that the `owner` and `repo` in `package.json` are correct
- Verify the release has the portable exe attached

### "Authentication failed" error
- Check your `GH_TOKEN` environment variable
- Ensure the token has `repo` scope
- For GitHub Actions, `GITHUB_TOKEN` is automatically provided

### Update not detected
- Ensure the version in `package.json` is higher than the running version
- Check GitHub Releases - the latest release should have a higher version
- Verify the release has the correct file attached (portable exe)

## Release Checklist

Before creating a new release:

- [ ] Update version in `package.json`
- [ ] Test the app locally
- [ ] Commit and push changes
- [ ] Create version tag (`git tag v1.4.3`)
- [ ] Push tag (`git push origin v1.4.3`)
- [ ] Wait for GitHub Actions to complete (if using automated workflow)
- [ ] Verify release appears on GitHub Releases page
- [ ] Test update flow with previous version

## GitHub Actions vs Manual Publishing

**GitHub Actions (Recommended):**
- ✅ Fully automated
- ✅ No token management needed
- ✅ Consistent builds
- ✅ Works on every tag push

**Manual Publishing:**
- ✅ More control
- ✅ Can test locally first
- ❌ Requires token management
- ❌ Manual process each time

Choose the method that works best for you!

