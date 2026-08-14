# Commit these packed @yaadro phone packages so isolated CI/CD can install
# without a sibling monorepo checkout or private npm registry.
# Regenerate with:
#   pnpm --filter @yaadro/phone-kit build
#   pnpm --filter @yaadro/phone-input build
#   npm pack in each package dir, copy into this folder, then npm install.
