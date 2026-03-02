#!/bin/bash
# Build script for Mac App Store (MAS) target.
# Strips electron-updater from package.json before electron-builder runs,
# so that the dependency is not listed inside the asar. Restores after build.

set -euo pipefail

# Step 1: Vite build with MAS_BUILD flag (compile-time elimination of updater code)
MAS_BUILD=1 npx electron-vite build

# Step 2: Backup package.json OUTSIDE the project dir (so it doesn't end up in the asar)
cp package.json /tmp/cv-assistant-package.json.bak

# Step 3: Strip electron-updater from package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.dependencies['electron-updater'];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Step 4: Run electron-builder with MAS config, forwarding all extra args
# Use trap to guarantee restore even if build fails
trap 'mv /tmp/cv-assistant-package.json.bak package.json' EXIT

npx electron-builder --mac --config electron-builder.mas.yml "$@"
