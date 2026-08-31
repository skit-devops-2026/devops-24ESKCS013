#!/usr/bin/env bash
# Basic project tests for Student Hub (static HTML/CSS/JS site)
# Runs on every push via CI.
set -uo pipefail

fail=0
err()  { echo "FAIL: $1"; fail=1; }
ok()   { echo "  ok: $1"; }

echo "=== Student Hub — Test Suite ==="

# -------------------------------------------------------
# 1. Required files exist
# -------------------------------------------------------
echo ""
echo "-- Required files --"

for f in index.html css js auth admin student; do
  if [ -e "$f" ]; then
    ok "$f exists"
  else
    err "$f is missing"
  fi
done

# -------------------------------------------------------
# 2. index.html structure checks
# -------------------------------------------------------
echo ""
echo "-- index.html structure --"

if grep -qi "<!DOCTYPE html>" index.html 2>/dev/null; then
  ok "DOCTYPE declared"
else
  err "index.html missing DOCTYPE"
fi

if grep -qi "<html" index.html 2>/dev/null; then
  ok "<html> tag present"
else
  err "index.html missing <html> tag"
fi

if grep -qi "<title>" index.html 2>/dev/null; then
  ok "<title> tag present"
else
  err "index.html missing <title> tag"
fi

if grep -qi "<meta" index.html 2>/dev/null; then
  ok "<meta> tag present"
else
  err "index.html missing <meta> tag"
fi

if grep -qi "</body>" index.html 2>/dev/null; then
  ok "closing </body> present"
else
  err "index.html missing closing </body>"
fi

# -------------------------------------------------------
# 3. Auth pages exist
# -------------------------------------------------------
echo ""
echo "-- Auth pages --"

for page in auth/login.html auth/student-login.html auth/admin-login.html auth/student-register.html; do
  if [ -f "$page" ]; then
    ok "$page exists"
  else
    err "$page missing"
  fi
done

# -------------------------------------------------------
# 4. No placeholder text left in README
# -------------------------------------------------------
echo ""
echo "-- README sanity --"

if grep -q '<roll>\|<name>\|<username>\|<Project Name>' README.md 2>/dev/null; then
  err "README.md still has unfilled placeholders"
else
  ok "README.md placeholders all filled"
fi

# -------------------------------------------------------
# 5. JS files are non-empty
# -------------------------------------------------------
echo ""
echo "-- JS files non-empty --"

for jsfile in js/main.js js/auth.js js/admin.js; do
  if [ -s "$jsfile" ]; then
    ok "$jsfile is non-empty"
  else
    err "$jsfile is empty or missing"
  fi
done

# -------------------------------------------------------
echo ""
if [ "$fail" -eq 0 ]; then
  echo "All tests passed ✓"
else
  echo "Some tests FAILED — see above"
fi

exit $fail
