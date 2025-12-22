#!/bin/sh
echo "=== ICECAST DEPLOYMENT DIAGNOSIS ==="

echo "\n1. Checking running processes..."
ps aux | grep -E "icecast|node"

echo "\n2. Checking listening ports..."
netstat -tulpn | grep -E "8000|8100|3000"

echo "\n3. Testing Internal Connection (Icecast Direct)..."
curl -I -v http://127.0.0.1:8100/status.xsl

echo "\n4. Testing Node Proxy Connection..."
curl -I -v http://127.0.0.1:3000/stream/new

echo "\n5. Checking Logs (Last 20 lines)..."
echo "--- Icecast Access Log ---"
tail -n 20 /var/log/icecast/access.log 2>/dev/null
echo "--- Icecast Error Log ---"
tail -n 20 /var/log/icecast/error.log 2>/dev/null
