#!/bin/bash

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. using sudo)"
  exit 1
fi

echo " Setting up SponsorPulse VPS Environment   "

echo "1. Installing Nginx..."
apt-get update
apt-get install -y nginx curl

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

echo "2. Configuring Nginx..."
CURRENT_DIR=$(pwd)
NGINX_CONF_PATH="$CURRENT_DIR/nginx.conf"

if [ ! -f "$NGINX_CONF_PATH" ]; then
    echo "Error: nginx.conf not found in current directory ($CURRENT_DIR)!"
    echo "Please ensure you run this script from the apps/server/deploy/ directory."
    exit 1
fi

echo "Linking $NGINX_CONF_PATH to Nginx sites-enabled..."
ln -sf "$NGINX_CONF_PATH" /etc/nginx/sites-available/sponsorpulse
ln -sf /etc/nginx/sites-available/sponsorpulse /etc/nginx/sites-enabled/
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test and restart Nginx
echo "Testing Nginx configuration..."
nginx -t

echo "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

echo " Setup Complete! "
echo "Next steps:"
echo "1. Edit nginx.conf to add your actual domain names."
echo "2. Run 'docker compose up -d' in the apps/server/ directory to start the containers."
echo "3. Run 'systemctl reload nginx' whenever you change the Nginx config."
echo "4. (Optional) Run 'sudo apt install python3-certbot-nginx && sudo certbot --nginx' to set up free SSL certificates."
