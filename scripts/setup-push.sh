#!/bin/sh
# One-time setup for daily push reminders. Run from the project folder:
#   sh scripts/setup-push.sh
# Generates the push keys and a cron secret, adds them to .env.local, and to
# Vercel (Production + Preview). Secrets are never printed.
set -e
cd "$(dirname "$0")/.."

if grep -q '^VAPID_PRIVATE_KEY=' .env.local 2>/dev/null; then
  echo "Push keys already in .env.local; not overwriting them."
  exit 0
fi

KEYS=$(node -e 'const k=require("web-push").generateVAPIDKeys();console.log(k.publicKey+" "+k.privateKey)')
PUB=${KEYS% *}
PRIV=${KEYS#* }
CRON=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')

printf '\n# Push reminders (scripts/setup-push.sh)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=%s\nVAPID_PRIVATE_KEY=%s\nCRON_SECRET=%s\n' "$PUB" "$PRIV" "$CRON" >> .env.local
echo "Added to .env.local."

for ENV in production preview; do
  printf '%s' "$PUB"  | npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY "$ENV" >/dev/null
  printf '%s' "$PRIV" | npx vercel env add VAPID_PRIVATE_KEY "$ENV" >/dev/null
  printf '%s' "$CRON" | npx vercel env add CRON_SECRET "$ENV" >/dev/null
  echo "Added to Vercel ($ENV)."
done
echo "Done. Redeploy (or push any change) so the site picks up the keys."
