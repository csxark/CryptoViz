# Troubleshooting Guide

This guide helps resolve common setup, development, build, and runtime issues when working with **CryptoViz**.

---

# Prerequisites Checklist

Before starting, ensure the following tools are installed:

| Tool    | Required Version | Check Command   |
| ------- | ---------------- | --------------- |
| Node.js | 22.x LTS         | `node -v`       |
| npm     | 10.x or later    | `npm -v`        |
| Git     | Latest           | `git --version` |

If any command fails, install or update the required software before continuing.

---

# Installation Issues

## `npm install` fails

### Possible Causes

* Unsupported Node.js version
* Corrupted npm cache
* Network connectivity issues

### Solution

Verify your Node.js version:

```bash
node -v
```

Clear the npm cache and reinstall dependencies:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

Windows (PowerShell):

```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

---

# Incorrect Node.js Version

CryptoViz requires **Node.js 22.x LTS**.

Check your version:

```bash
node -v
```

If necessary, install the recommended version using:

* nvm (Linux/macOS)
* nvm-windows (Windows)
* Official Node.js installer

---

# Missing Environment Variables

## Application fails to start

### Cause

The required `.env.local` file is missing.

### Solution

Create a file named:

```
.env.local
```

Add:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Restart the development server after saving the file.

---

# Development Server Won't Start

## `npm run dev` exits unexpectedly

### Possible Causes

* Missing dependencies
* Invalid environment variables
* Port already in use

### Solutions

Reinstall dependencies:

```bash
npm install
```

Start again:

```bash
npm run dev
```

If port **3000** is already occupied, stop the conflicting application or configure a different port.

---

# Build Errors

## `npm run build` fails

### Possible Causes

* TypeScript compilation errors
* ESLint violations
* Missing imports
* Incorrect file paths

### Solution

Run:

```bash
npm run lint
```

Resolve reported issues before attempting another production build.

---

# TypeScript Errors

Common issues include:

* Missing module imports
* Incorrect relative paths
* Invalid type definitions

### Recommended Steps

* Verify import paths.
* Check exported symbols.
* Ensure TypeScript compiles successfully.

---

# Web Worker Issues

CryptoViz performs cryptographic computations inside Web Workers.

If cryptographic visualizations fail:

* Restart the development server.
* Verify worker imports.
* Ensure worker files haven't been renamed or moved.

---

# Page Not Loading

If the application loads a blank page:

1. Open browser Developer Tools.
2. Check the Console tab.
3. Restart the development server.
4. Verify that dependencies installed successfully.

---

# MDX Documentation Problems

If documentation pages fail to render:

* Verify the `.mdx` file syntax.
* Check frontmatter fields.
* Confirm the document is placed in the correct content directory.

---

# Search Not Working

CryptoViz uses **Pagefind** for static search.

If search returns no results:

* Rebuild the project.
* Ensure the search index has been generated successfully.
* Verify Pagefind assets exist in the public directory.

---

# Styling Issues

If Tailwind styles are missing:

* Restart the development server.
* Ensure Tailwind dependencies are installed.
* Clear browser cache.

---

# Git Issues

## Unable to pull latest changes

Run:

```bash
git fetch origin
git pull origin main
```

Resolve merge conflicts before continuing.

---

## Branch is behind main

Update your branch:

```bash
git checkout main
git pull origin main
git checkout <your-branch>
git merge main
```

---

# Common Runtime Errors

## Module not found

Install missing dependencies:

```bash
npm install
```

---

## Command not found

If commands like `npm` or `node` are unavailable, verify they are installed and available in your system's PATH.

---

# Frequently Asked Questions

### Which Node.js version should I use?

Node.js **22.x LTS**.

---

### Where should environment variables be stored?

Create a `.env.local` file in the project root.

---

### How do I start the development server?

```bash
npm run dev
```

---

### How do I build the project?

```bash
npm run build
```

---

### How do I check code quality?

```bash
npm run lint
```

---

# Related Documentation

* [README.md](./README.md)
* [CONTRIBUTING.md](./CONTRIBUTING.md)
* [GUIDELINES.md](./GUIDELINES.md)
* [LICENSE](./LICENSE)

---

# Need More Help?

If your issue persists after following this guide:

1. Search existing GitHub Issues.
2. Review the project documentation.
3. Open a new issue with:

   * Operating System
   * Node.js version
   * npm version
   * Error message
   * Steps to reproduce
   * Screenshots or logs (if applicable)

Providing complete information helps maintainers diagnose and resolve issues more efficiently.
