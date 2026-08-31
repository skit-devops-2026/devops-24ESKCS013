#!/usr/bin/env bash
# Repository hygiene check (M1). Runs on every push.
# This is a helper so you can see problems yourself without waiting for grading.
set -uo pipefail
fail=0
err() { echo "FAIL: $1"; fail=1; }
ok()  { echo "  ok: $1"; }

# --- README placeholders ---
if grep -q '<roll>\|<name>\|<username>\|<Project Name>\|<Two or three sentences' README.md 2>/dev/null; then
  err "README.md still has unfilled <placeholders>"
else
  ok "README.md placeholders filled"
fi

# --- README must list roll no, name and GitHub username ---
rows=$(grep -cE '^\|[^|]+\|[^|]+\|[^|]+\|' README.md 2>/dev/null || echo 0)
if [ "$rows" -lt 3 ]; then
  err "README.md author table needs a header, separator and your details row"
else
  ok "author table present"
fi

# --- .gitignore ---
[ -f .gitignore ] && ok ".gitignore present" || err ".gitignore missing"

# --- nothing heavy committed ---
big=$(git ls-files -z | xargs -0 -I{} du -b {} 2>/dev/null | awk '$1 > 10485760 {print $2}')
if [ -n "$big" ]; then
  err "Files over 10 MB committed: $big"
else
  ok "no oversized files"
fi

exit $fail
