#!/bin/bash

SERVER="a1-fe"
APP_DIR="~/a1-store-build"
PM2_NAME="fe"
PORT="3000"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building Next.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run build || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Ensuring directories exist..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER "mkdir -p $APP_DIR/.next/static"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying standalone build..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --delete --progress \
-e ssh \
.next/standalone/ \
$SERVER:$APP_DIR/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying static files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --progress \
-e ssh \
.next/static/ \
$SERVER:$APP_DIR/.next/static/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploying public folder..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

rsync -az --progress \
-e ssh \
public/ \
$SERVER:$APP_DIR/public/

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Reloading PM2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh $SERVER "
  cd $APP_DIR &&
  pm2 reload $PM2_NAME || PORT=$PORT pm2 start server.js --name $PM2_NAME
"

# Optional: add sample data after deploy. Off by default; enable with
#   SEED_SAMPLE_DATA=true SEED_API_URL=<backend url> SEED_USERNAME=<phone> SEED_PASSWORD=<pwd> ./deploy.sh
if [ "$SEED_SAMPLE_DATA" = "true" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Seeding sample data..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npm run seed:sample:deploy || echo "Sample data seed failed (deploy itself succeeded)."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment complete."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"