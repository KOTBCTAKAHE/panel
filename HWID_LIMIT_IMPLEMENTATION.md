# HWID (Hardware ID) Limit Feature

## Overview

The HWID (Hardware ID) limit feature in PasarGuard panel allows administrators to restrict the number of unique devices (identified by their hardware characteristics) that can simultaneously use a single user's subscription. This is a common security measure in proxy services to prevent license sharing and unauthorized distribution.

## Architecture

### Components

1. **HWID Calculation** (`app/utils/hwid.py`)
   - Generates deterministic device identifiers from user-agent and optional fingerprint
   - Uses SHA256 hashing for consistent, privacy-friendly device IDs
   - Example HWID: `a1b2c3d4e5f6789012345678901234a1b2c3d4e5f6789012345678901234`

2. **Database Models** (`app/db/models.py`)
   - `User.hwids`: List of allowed hardware IDs (stored as JSON)
   - `User.hwid_limit`: Maximum number of unique HWIDs (None/0 = unlimited)

3. **CRUD Operations** (`app/db/crud/user.py`)
   - `check_and_register_hwid()`: Check if current HWID is allowed
   - `reset_user_hwids()`: Clear all registered devices
   - `remove_hwid()`: Remove specific device

4. **Subscription Operation** (`app/operation/subscription.py`)
   - Integrates HWID check into subscription request flow
   - Calculates HWID from user-agent header
   - Denies access if HWID limit is exceeded

5. **Admin Endpoints** (`app/routers/user.py`)
   - Set HWID limits for users
   - Reset user's registered devices
   - View HWID usage information

## How It Works

### Subscription Access Flow

```
Client Request (with User-Agent header)
    ↓
Subscription Token Validation
    ↓
Calculate HWID from User-Agent
    ↓
Check Against User's HWID Limit
    ├─ If HWID limit is unlimited (0 or None) → Allow
    ├─ If HWID already registered → Allow
    ├─ If new HWID and limit not reached → Register and Allow
    └─ If limit reached → Deny (HTTP 403)
    ↓
Update subscription info (user-agent, timestamp)
    ↓
Return subscription config
```

### HWID Limit Logic

1. **No Limit (hwid_limit = 0 or None)**
   - Unlimited devices can access the subscription
   - HWID checking is disabled

2. **With Limit (hwid_limit > 0)**
   - First device: HWID registered, access allowed
   - Same device: HWID matches, access allowed
   - New device (if limit not reached): HWID registered, access allowed
   - New device (if limit reached): Access denied with error message

### HWID Calculation

The HWID is calculated from:
- **User-Agent header**: Client type and version (e.g., "v2rayNG/1.9.46")
- **Optional fingerprint**: Additional device characteristics (reserved for future use)

Example calculation:
```python
from app.utils.hwid import calculate_hwid

hwid = calculate_hwid(
    user_agent="v2rayNG/1.9.46",
    fingerprint=""  # Optional device fingerprint
)
# Returns: a deterministic 32-character SHA256 hash
```

## API Endpoints

### 1. Set HWID Limit for User

**Endpoint:** `PATCH /api/user/{username}/hwid_limit`

**Parameters:**
- `username` (path): Target user's username
- `hwid_limit` (query): Maximum devices (0 for unlimited, 1-100+)

**Example Request:**
```bash
curl -X PATCH "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=3" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": 1,
  "username": "john",
  "status": "active",
  "hwid_limit": 3,
  "hwids": ["abc123...", "def456..."],
  "used_traffic": 1073741824,
  "data_limit": 10737418240,
  ...
}
```

### 2. Reset User's Registered HWIDs

**Endpoint:** `DELETE /api/user/{username}/hwids`

**Parameters:**
- `username` (path): Target user's username

**Example Request:**
```bash
curl -X DELETE "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "id": 1,
  "username": "john",
  "hwids": [],  // Empty after reset
  "hwid_limit": 3,
  ...
}
```

### 3. Get User's HWID Information

**Endpoint:** `GET /api/user/{username}/hwid_info`

**Parameters:**
- `username` (path): Target user's username

**Example Request:**
```bash
curl -X GET "http://localhost:8000/api/user/john/hwid_info" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "username": "john",
  "current_count": 2,
  "limit": 3,
  "available": 1,
  "devices": ["abc123...", "def456..."]
}
```

## Usage Examples

### Scenario 1: Limit User to 3 Devices

```bash
# Admin sets HWID limit for user 'john' to 3 devices
curl -X PATCH "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=3" \
  -H "Authorization: Bearer <admin_token>"

# User tries to access from device 1 (allowed - registers HWID)
# User tries to access from device 2 (allowed - registers HWID)
# User tries to access from device 3 (allowed - registers HWID)
# User tries to access from device 4 (denied - limit reached)
# Error: "HWID limit reached. Maximum 3 devices allowed."
```

### Scenario 2: Reset Device Registration

```bash
# User accidentally exceeded limit, admin resets their devices
curl -X DELETE "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <admin_token>"

# Now user can re-register devices on new hardware
```

### Scenario 3: Check HWID Usage

```bash
# Admin checks how many devices a user has registered
curl -X GET "http://localhost:8000/api/user/john/hwid_info" \
  -H "Authorization: Bearer <admin_token>"

# Response shows: 2 devices registered out of 3 allowed (1 slot available)
```

## Error Handling

### When HWID Limit is Exceeded

**HTTP Status:** 403 Forbidden  
**Response Body:** `{"detail": "HWID limit reached. Maximum 3 devices allowed."}`

**How to Fix:**
1. User can try again from one of their already-registered devices
2. User can ask admin to:
   - Increase their HWID limit
   - Reset their HWID list to allow new devices

### Invalid HWID Limit

**HTTP Status:** 400 Bad Request  
**Response Body:** `{"detail": "HWID limit cannot be negative"}`

## Configuration

### Default HWID Limit

By default, new users have `hwid_limit = None` (unlimited devices).

To set a default limit for all new users, you would need to:
1. Modify the User model migration to set a default value
2. Or add logic in the user creation endpoint

### Recommended HWID Limits

- **Premium subscribers:** 5-10 devices
- **Standard subscribers:** 3-5 devices
- **Basic subscribers:** 1-2 devices
- **Resellers:** Unlimited (0)

## Database Schema

### User Table Changes

```sql
-- Added columns to users table
ALTER TABLE users ADD COLUMN hwids JSON DEFAULT NULL;
ALTER TABLE users ADD COLUMN hwid_limit BIGINT DEFAULT NULL;
```

### JSON Structure of hwids

```json
[
  "a1b2c3d4e5f6789012345678901234a1b2c3d4e5f6789012345678901234",
  "b2c3d4e5f67890123456789012345678ab2c3d4e5f67890123456789012345",
  "c3d4e5f67890123456789012345678abac3d4e5f67890123456789012345"
]
```

## Security Considerations

### HWID Privacy

- HWIDs are SHA256 hashes - they do NOT expose actual hardware information
- The user-agent string is used as input, so similar clients may share the same HWID (by design)
- Only the admin and subscription system can see HWID lists

### HWID Tampering

- Users cannot modify their HWID
- HWIDs are calculated server-side based on the user-agent they send
- Changing user-agent = different HWID

### Bypass Prevention

- Each client must send a valid user-agent header
- HWIDs are persistent - the same client always gets the same HWID
- Admin can verify usage through the HWID info endpoint

## Monitoring & Logging

### View HWID Usage

Check individual user HWID info:
```python
# In admin dashboard or API
GET /api/user/{username}/hwid_info
```

### Track Changes

The system logs when:
- New HWID is registered (implicit in subscription request)
- HWID limit is changed (visible in user modification logs)
- HWIDs are reset (visible in user modification logs)

## Troubleshooting

### Problem: User getting "HWID limit reached" but shows 0 devices

**Cause:** HWID checking was just enabled or there's a sync issue  
**Solution:** Reset the user's HWIDs and let them re-register

### Problem: Same device shows different HWIDs

**Cause:** User-agent changed (client updated, different client, etc.)  
**Solution:** This is expected behavior - different clients = different HWIDs

### Problem: Admin cannot change HWID limit

**Cause:** Permissions issue - only admins can modify HWID limits  
**Solution:** Verify the admin account has proper permissions

## Implementation Details

### File Modifications

1. **app/db/models.py**
   - Added `hwids` field (JSON array)
   - Added `hwid_limit` field (BigInteger)

2. **app/models/user.py**
   - Added `hwids` field to User Pydantic model
   - Added `hwid_limit` field to User Pydantic model

3. **app/utils/hwid.py** (NEW)
   - `calculate_hwid()`: Generate device ID
   - `check_and_store_hwid()`: Validate against limit
   - `get_hwid_info()`: Format HWID information
   - `format_hwid_for_display()`: Shorten for UI

4. **app/db/crud/user.py**
   - `check_and_register_hwid()`: Async HWID validation
   - `reset_user_hwids()`: Clear device list
   - `remove_hwid()`: Remove specific device

5. **app/operation/subscription.py**
   - Integrated HWID check into `user_subscription()` method
   - Returns 403 if HWID limit exceeded

6. **app/operation/user.py**
   - `set_user_hwid_limit()`: Set limit for user
   - `reset_user_hwids()`: Admin reset function
   - `get_user_hwid_info()`: Get usage info

7. **app/routers/user.py**
   - `PATCH /api/user/{username}/hwid_limit`: Set limit
   - `DELETE /api/user/{username}/hwids`: Reset HWIDs
   - `GET /api/user/{username}/hwid_info`: Get info

## Future Enhancements

1. **Advanced Fingerprinting**
   - Include OS, CPU architecture in HWID calculation
   - Detect spoofing attempts

2. **HWID Whitelisting**
   - Allow users to name/label their devices
   - Admin approval for new devices

3. **Device Activity Tracking**
   - Track last access time per HWID
   - Show device details (OS, client version, etc.)

4. **Automatic Cleanup**
   - Remove inactive HWIDs after X days
   - Auto-rotate old devices

5. **HWID Sharing Prevention**
   - Detect simultaneous access from same HWID
   - Throttle rapid device switches

## Support & Questions

For issues related to HWID limiting:

1. Check HWID info: `GET /api/user/{username}/hwid_info`
2. Review subscription logs for access patterns
3. Contact admin for HWID limit adjustments
4. Check user-agent header in subscription requests
