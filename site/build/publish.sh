#!/bin/sh
# Publish the built site to the gh-pages branch, which GitHub Pages serves at
# https://plei99.github.io/notes/.
#
# The branch holds one commit, replaced on every publish, so the generated HTML
# never accumulates in the repository's history. Run `deno task notes` first if
# any note has changed; this only rebuilds the Lume site around them.
set -eu

site=$(cd "$(dirname "$0")/.." && pwd)
remote=$(git -C "$site/.." remote get-url origin)

cd "$site"
deno task build

out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
cp -R _site/. "$out"
touch "$out/.nojekyll" # serve files as they are, without Jekyll

cd "$out"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$site" config user.name)" \
  -c user.email="$(git -C "$site" config user.email)" \
  commit -q -m "Publish notes site from $(git -C "$site" rev-parse --short HEAD)"
git push -f "$remote" gh-pages
echo "Published to gh-pages."
