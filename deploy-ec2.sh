#!/bin/bash

# Deploy script for EC2 using Git
EC2_IP="your-ec2-ip"
EC2_USER="ec2-user"
PROJECT_NAME="shopdev-backend"
GIT_REPO="https://github.com/your-username/shopdev-backend.git"
BRANCH="main"

echo "🚀 Starting Git deployment to EC2..."

# Commit and push changes
echo "📝 Committing changes..."
git add .
git commit -m "Deploy to EC2 - $(date)"
git push origin $BRANCH

echo "✅ Code pushed to Git!"

# Deploy to EC2
echo "🚀 Deploying to EC2..."
ssh $EC2_USER@$EC2_IP << EOF
cd ~/$PROJECT_NAME

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin $BRANCH

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Build project (if needed)
echo "🔨 Building project..."
npm run build:ec2

# Stop existing process
echo "⏹️ Stopping existing process..."
pm2 stop shopdev-backend 2>/dev/null || true
pm2 delete shopdev-backend 2>/dev/null || true

# Start new process
echo "▶️ Starting new process..."
pm2 start dist/index.js --name "shopdev-backend"
pm2 save
pm2 startup

echo "✅ Backend deployed successfully!"
pm2 status
EOF

echo "🎉 Git deployment completed!"
echo "🌐 Backend should be running on EC2"
echo "📊 Check status: ssh $EC2_USER@$EC2_IP 'pm2 status'"
