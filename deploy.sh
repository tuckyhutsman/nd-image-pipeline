#!/bin/bash

# Usage: ./deploy.sh dev  OR  ./deploy.sh prod

ENV=$1

if [ "$ENV" = "dev" ]; then
    HOST="nd-dev"
    BRANCH="dev"
elif [ "$ENV" = "prod" ]; then
    HOST="nd-prod"
    BRANCH="main"
else
    echo "Usage: ./deploy.sh [dev|prod]"
    exit 1
fi

echo "🚀 Deploying $BRANCH branch to $HOST..."
echo ""

ssh $HOST << EOF
    cd /opt/nd-image-pipeline

    echo "📥 Pulling latest code from GitHub..."
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH

    echo ""
    echo "🔄 Restarting containers..."
    sudo docker compose down
    BUILD_DATE=\$(date +%Y-%m-%d) sudo -E docker compose up -d --build
    
    echo ""
    echo "✅ Deployment complete! 🎉"
    echo ""
    echo "📊 Container status:"
    sudo docker compose ps
    
    echo ""
    echo "📋 Recent logs:"
    sudo docker compose logs --tail=20
EOF

echo ""
echo "🎉 Done! Your changes are live on $ENV"
