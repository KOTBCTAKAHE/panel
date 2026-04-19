# HWID Limit - Quick Start Guide

## Overview

The HWID (Hardware ID) limit feature restricts the number of devices that can use a single subscription. This guide shows common use cases and how to implement them.

## Basic Concepts

- **HWID**: A unique identifier calculated from the client's User-Agent (automatically generated)
- **hwid_limit**: Maximum number of different devices allowed (0 or NULL = unlimited)
- **hwids**: List of registered device identifiers

## Quick Examples

### 1. Set a Device Limit for a User

**Scenario**: Limit user "john" to 3 devices

```bash
curl -X PATCH \
  "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=3" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

**Response**: User data with new limit
```json
{
  "username": "john",
  "hwid_limit": 3,
  "hwids": [],
  "status": "active"
}
```

### 2. Check How Many Devices Are Registered

**Scenario**: See current device usage for user "john"

```bash
curl -X GET \
  "http://localhost:8000/api/user/john/hwid_info" \
  -H "Authorization: Bearer <admin_token>"
```

**Response**:
```json
{
  "username": "john",
  "current_count": 2,
  "limit": 3,
  "available": 1,
  "devices": [
    "a1b2c3d4e5f6...",
    "x9y8z7w6v5u4..."
  ]
}
```

### 3. Reset Devices (User Lost/Changed Devices)

**Scenario**: User's devices broke, reset their HWID list to allow new ones

```bash
curl -X DELETE \
  "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <admin_token>"
```

**Response**: User data with cleared HWID list
```json
{
  "username": "john",
  "hwids": [],
  "hwid_limit": 3,
  "status": "active"
}
```

### 4. Set No Limit (Unlimited Devices)

**Scenario**: Allow user "vip_user" unlimited device access

```bash
curl -X PATCH \
  "http://localhost:8000/api/user/vip_user/hwid_limit?hwid_limit=0" \
  -H "Authorization: Bearer <admin_token>"
```

## Common Use Cases

### Use Case 1: Premium vs Standard Plans

```bash
# Premium: 5 devices
curl -X PATCH \
  "http://localhost:8000/api/user/premium_user/hwid_limit?hwid_limit=5" \
  -H "Authorization: Bearer <admin_token>"

# Standard: 2 devices
curl -X PATCH \
  "http://localhost:8000/api/user/standard_user/hwid_limit?hwid_limit=2" \
  -H "Authorization: Bearer <admin_token>"

# Free: 1 device
curl -X PATCH \
  "http://localhost:8000/api/user/free_user/hwid_limit?hwid_limit=1" \
  -H "Authorization: Bearer <admin_token>"

# Reseller: Unlimited
curl -X PATCH \
  "http://localhost:8000/api/user/reseller/hwid_limit?hwid_limit=0" \
  -H "Authorization: Bearer <admin_token>"
```

### Use Case 2: Bulk Set Limits for Multiple Users

```python
import requests
import json

admin_token = "your_admin_token_here"
api_base = "http://localhost:8000"

users_and_limits = {
    "user1": 3,
    "user2": 5,
    "user3": 2,
    "user4": 0,  # unlimited
}

for username, limit in users_and_limits.items():
    url = f"{api_base}/api/user/{username}/hwid_limit"
    params = {"hwid_limit": limit}
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.patch(url, params=params, headers=headers)
    if response.status_code == 200:
        print(f"✓ {username}: set to {limit} devices")
    else:
        print(f"✗ {username}: failed - {response.json()}")
```

### Use Case 3: Monitor Users Approaching Limit

```python
import requests

admin_token = "your_admin_token_here"
api_base = "http://localhost:8000"

# Get all users (requires list endpoint - adjust as needed)
users = ["user1", "user2", "user3", "user4", "user5"]

for username in users:
    url = f"{api_base}/api/user/{username}/hwid_info"
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"\n{username}:")
        print(f"  Devices: {data['current_count']}/{data['limit']}")
        print(f"  Available: {data['available']}")
        
        # Alert if close to limit
        if data['available'] <= 1 and data['limit'] != "unlimited":
            print(f"  ⚠️  WARNING: User approaching device limit!")
```

### Use Case 4: Handle "Device Limit Exceeded" Error

When a user tries to access from a new device but limit is reached:

```
HTTP Status: 403 Forbidden
Response Body:
{
  "detail": "HWID limit reached. Maximum 3 devices allowed."
}
```

**Admin Response Steps**:

```bash
# 1. Check current devices
curl -X GET \
  "http://localhost:8000/api/user/john/hwid_info" \
  -H "Authorization: Bearer <admin_token>"

# 2. Option A: Increase their limit if justified
curl -X PATCH \
  "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=5" \
  -H "Authorization: Bearer <admin_token>"

# 2. Option B: Reset if user lost old devices
curl -X DELETE \
  "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <admin_token>"

# 2. Option C: Remove specific old device (if needed)
# Note: This requires a custom admin tool, not available via API yet
```

## Error Scenarios and Solutions

### Scenario 1: User Can't Connect - Getting 403

```bash
# Check their HWID info
curl -X GET "http://localhost:8000/api/user/problematic_user/hwid_info" \
  -H "Authorization: Bearer <token>"

# If they have too many devices, reset or increase limit
curl -X PATCH \
  "http://localhost:8000/api/user/problematic_user/hwid_limit?hwid_limit=5" \
  -H "Authorization: Bearer <token>"
```

### Scenario 2: User Has Multiple Client Installations

Each client installation is a different HWID:
- v2rayNG on Phone
- Clash on PC
- V2Ray CLI on Router
- Outline on Tablet

**Solution**: Set appropriate limit to cover all their devices

```bash
curl -X PATCH \
  "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=4" \
  -H "Authorization: Bearer <token>"
```

### Scenario 3: User Moved to New Device

```bash
# Reset their old registrations to allow new device
curl -X DELETE \
  "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <token>"

# User can now register on their new device
```

## Database-Level Operations

### View All Users with HWID Limits (SQL)

```sql
SELECT 
  username, 
  hwid_limit, 
  json_array_length(hwids) as device_count,
  hwids
FROM users
WHERE hwid_limit IS NOT NULL
ORDER BY hwid_limit DESC;
```

### Clear All HWID Data (Reset Everything)

```sql
UPDATE users SET hwids = NULL, hwid_limit = NULL;
```

### Find Users at Maximum Limit

```sql
SELECT 
  username,
  hwid_limit,
  json_array_length(hwids) as device_count
FROM users
WHERE json_array_length(hwids) >= hwid_limit
  AND hwid_limit IS NOT NULL;
```

## Testing the Feature

### Step 1: Set Up Test User

```bash
# Create test user
curl -X POST "http://localhost:8000/api/user" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_hwid_user",
    "status": "active"
  }'

# Set HWID limit
curl -X PATCH \
  "http://localhost:8000/api/user/test_hwid_user/hwid_limit?hwid_limit=2" \
  -H "Authorization: Bearer <token>"
```

### Step 2: Get Subscription Token

```bash
# Get subscription URL for the user
# (This typically comes from user list or user info endpoint)
```

### Step 3: Simulate Multiple Devices

```bash
#!/bin/bash

# Simulate Device 1 - v2rayNG
echo "Testing Device 1 (v2rayNG)..."
curl -s "http://localhost:8000/api/sub/USER_TOKEN_HERE/" \
  -H "User-Agent: v2rayNG/1.9.46" \
  -H "Accept: application/json" > /dev/null && echo "✓ Device 1 OK"

# Simulate Device 2 - Clash
echo "Testing Device 2 (Clash)..."
curl -s "http://localhost:8000/api/sub/USER_TOKEN_HERE/" \
  -H "User-Agent: Clash/1.0.0" \
  -H "Accept: application/json" > /dev/null && echo "✓ Device 2 OK"

# Simulate Device 3 - Should Fail
echo "Testing Device 3 (Should fail - limit is 2)..."
curl -s "http://localhost:8000/api/sub/USER_TOKEN_HERE/" \
  -H "User-Agent: SingBox/1.8.0" \
  -H "Accept: application/json" | jq . && echo "✗ Device 3 FAILED (as expected)"
```

### Step 4: Verify HWID Info

```bash
curl -X GET \
  "http://localhost:8000/api/user/test_hwid_user/hwid_info" \
  -H "Authorization: Bearer <token>" | jq .
```

**Expected Output**:
```json
{
  "username": "test_hwid_user",
  "current_count": 2,
  "limit": 2,
  "available": 0,
  "devices": [
    "hash_of_v2rayng_user_agent",
    "hash_of_clash_user_agent"
  ]
}
```

## Admin Dashboard Integration

For a web admin dashboard, you might show:

```html
<div class="user-hwid-info">
  <h3>Device Management</h3>
  
  <div class="hwid-usage">
    <p>Devices: <strong>2/3</strong> (1 available)</p>
    <div class="progress-bar">
      <div class="progress" style="width: 66%"></div>
    </div>
  </div>
  
  <div class="registered-devices">
    <h4>Registered Devices:</h4>
    <ul>
      <li>Device 1: abc123def456... (v2rayNG)</li>
      <li>Device 2: xyz789uvw012... (Clash)</li>
    </ul>
  </div>
  
  <div class="admin-actions">
    <button onclick="increaseLimit()">Increase Limit</button>
    <button onclick="resetDevices()">Reset Devices</button>
    <button onclick="refreshInfo()">Refresh</button>
  </div>
</div>
```

## Performance Tips

1. **Cache HWID Info**: Don't query on every request
2. **Batch Operations**: Use bulk endpoints if available
3. **Index hwid_limit**: Add DB index for faster filtering
4. **Monitor**: Track HWID rejections for abuse patterns

## Migration from No Limit to With Limit

If you're adding HWID limits to existing users:

```bash
# 1. Gradually enable for new users
# 2. Send notification to existing users
# 3. Set grace period with high initial limits
# 4. Gradually reduce limits over time
# 5. Provide admin tool to request more devices

# Example: Start with high limit
curl -X PATCH \
  "http://localhost:8000/api/user/{username}/hwid_limit?hwid_limit=10" \
  -H "Authorization: Bearer <token>"

# After 30 days, reduce to final limit
curl -X PATCH \
  "http://localhost:8000/api/user/{username}/hwid_limit?hwid_limit=3" \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### HWID Feature Not Working

1. **Check database migration applied**:
   ```bash
   alembic current  # Should show latest revision
   ```

2. **Verify user has limit set**:
   ```bash
   curl -X GET "http://localhost:8000/api/user/{username}/hwid_info" \
     -H "Authorization: Bearer <token>"
   ```

3. **Check if User-Agent header is being sent**:
   ```bash
   # Add -v flag to see headers
   curl -v "http://localhost:8000/api/sub/TOKEN/" \
     -H "User-Agent: TestClient/1.0"
   ```

4. **Review logs for HWID errors**:
   ```bash
   grep -i "hwid" /path/to/logs/*.log
   ```

## Related Documentation

- [HWID Implementation Details](./HWID_LIMIT_IMPLEMENTATION.md)
- [API Endpoints](./HWID_LIMIT_IMPLEMENTATION.md#api-endpoints)
- [Security Considerations](./HWID_LIMIT_IMPLEMENTATION.md#security-considerations)

---

**Last Updated:** 2026-04-19
