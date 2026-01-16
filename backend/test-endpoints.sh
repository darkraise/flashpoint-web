#!/bin/bash

echo "=== Testing Authentication Endpoints ==="
echo ""

# Test 1: Login
echo "1. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✓ Login successful"
echo ""

# Test 2: Get current user
echo "2. Testing GET /api/auth/me..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me | head -c 200
echo ""
echo ""

# Test 3: Get auth settings
echo "3. Testing GET /api/settings/auth (public)..."
curl -s http://localhost:3001/api/settings/auth | head -c 200
echo ""
echo ""

# Test 4: Get users (protected)
echo "4. Testing GET /api/users (requires auth)..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/users | head -c 200
echo ""
echo ""

# Test 5: Get roles (protected)
echo "5. Testing GET /api/roles (requires auth)..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/roles | head -c 300
echo ""
echo ""

# Test 6: Get activities (protected)
echo "6. Testing GET /api/activities (requires auth)..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/activities | head -c 200
echo ""
echo ""

echo "=== All tests complete ==="
