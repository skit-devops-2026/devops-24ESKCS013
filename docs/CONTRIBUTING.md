# Student Hub — Developer Documentation

## Project Structure

```
devops-24ESKCS013/
├── index.html          # Landing page / home
├── auth/               # Login & registration pages
├── student/            # Student dashboard pages
├── admin/              # Admin dashboard pages
├── css/                # Stylesheets
├── js/                 # JavaScript modules
├── scripts/            # CI/CD helper scripts
├── docs/               # Documentation (this folder)
├── k8s/                # Kubernetes manifests (M5)
├── monitoring/         # Monitoring configs (M6)
├── Makefile            # Build targets: install, test, build, run
├── Jenkinsfile         # Jenkins declarative pipeline (M4)
└── .github/workflows/  # GitHub Actions CI (M3)
```

## Contributing

1. Create a branch: `git checkout -b feature/<name>`
2. Make your changes and commit
3. Open a pull request into `main`
4. CI must pass before merging

## CI Pipeline (M3)

The GitHub Actions workflow runs on every push and pull request:

- **hygiene** job: checks README, .gitignore, commit messages
- **build-and-test** job: runs `make install && make test && make build`

## Test Suite

Run locally with:

```bash
make test
```

Tests verify:
1. Required files and directories exist
2. `index.html` structure (DOCTYPE, html, title, meta, body)
3. Auth pages present (login, student-login, admin-login, register)
4. README has no unfilled placeholders
5. JS files are non-empty

