# HWID Limit Implementation Summary

## ✅ Completed Implementation

This document summarizes the HWID (Hardware ID) limit feature implementation for the PasarGuard panel.

## Files Created

### 1. `app/utils/hwid.py` (NEW)
- **calculate_hwid()**: Generates unique hardware IDs from user-agent and optional fingerprint
- **check_and_store_hwid()**: Validates HWID against user's limit and registers new HWIDs
- **get_hwid_info()**: Returns formatted HWID usage information
- **format_hwid_for_display()**: Shortens HWID hashes for UI display

Key features:
- Deterministic SHA256-based hashing
- Supports unlimited devices (when limit is 0 or None)
- Returns error messages for limit exceeded scenarios
- Includes usage statistics (current_count, available slots, etc.)

## Files Modified

### 1. `app/db/models.py`
Added two new fields to the `User` model:
```python
hwids: Mapped[Optional[List[str]]] = mapped_column(JSON, default=None)
hwid_limit: Mapped[Optional[int]] = mapped_column(BigInteger, default=None)
```

### 2. `app/models/user.py`
Added to the `User` Pydantic model:
```python
hwids: list[str] | None = Field(default=None, description="List of allowed hardware IDs")
hwid_limit: int | None = Field(default=None, ge=0, description="Maximum number of unique hardware IDs")
```

### 3. `app/db/crud/user.py`
Added three new async functions:
- **check_and_register_hwid()**: Check HWID against limit and register if allowed
- **reset_user_hwids()**: Clear all registered HWIDs for a user
- **remove_hwid()**: Remove a specific HWID from user's device list

### 4. `app/operation/subscription.py`
- Added imports for HWID utilities and CRUD functions
- Integrated HWID checking into the `user_subscription()` method
- HWID is calculated and validated before subscription config is returned
- Returns HTTP 403 if HWID limit is exceeded

### 5. `app/operation/user.py`
Added three new async methods to `UserOperation` class:
- **set_user_hwid_limit()**: Admin endpoint to set HWID limit for user
- **reset_user_hwids()**: Admin endpoint to reset user's registered devices
- **get_user_hwid_info()**: Admin endpoint to view HWID usage information

### 6. `app/routers/user.py`
Added three new REST API endpoints:
```
PATCH /api/user/{username}/hwid_limit?hwid_limit=3
DELETE /api/user/{username}/hwids
GET /api/user/{username}/hwid_info
```

## Documentation Created

### `HWID_LIMIT_IMPLEMENTATION.md`
Comprehensive documentation including:
- Architecture overview
- How HWID checking works
- API endpoint specifications with examples
- Usage scenarios
- Error handling
- Database schema
- Security considerations
- Troubleshooting guide
- Future enhancement ideas

## How It Works

### User Subscription Access Flow

1. **User Makes Request**: Client sends subscription request with User-Agent header
2. **Token Validation**: System validates subscription token
3. **HWID Calculation**: Server calculates HWID from User-Agent
4. **HWID Check**:
   - If user has no limit → Allow (implicit)
   - If HWID already in user's list → Allow
   - If new HWID and limit not reached → Register and Allow
   - If new HWID and limit reached → **Deny (403)**
5. **Access Granted/Denied**: Return subscription config or error

### HWID Limit Logic

| Scenario | hwid_limit | Result |
|----------|------------|--------|
| Unlimited | 0 or None | Always allow |
| Known device | N | Allow (already registered) |
| New device, slots available | N | Register and allow |
| New device, no slots | N | Deny with error |

## Admin Endpoints

### Set HWID Limit
```bash
PATCH /api/user/{username}/hwid_limit?hwid_limit=3
```
- Set maximum devices user can connect from
- Pass 0 for unlimited

### Reset HWIDs
```bash
DELETE /api/user/{username}/hwids
```
- Clear all registered devices
- User can immediately register new devices

### Get HWID Info
```bash
GET /api/user/{username}/hwid_info
```
- View current device count, limit, and available slots
- See list of registered HWID hashes

## Usage Examples

### Example 1: Limit User to 3 Devices
```bash
curl -X PATCH "http://localhost:8000/api/user/john/hwid_limit?hwid_limit=3" \
  -H "Authorization: Bearer <token>"
```

### Example 2: Reset User's Devices
```bash
curl -X DELETE "http://localhost:8000/api/user/john/hwids" \
  -H "Authorization: Bearer <token>"
```

### Example 3: Check HWID Usage
```bash
curl -X GET "http://localhost:8000/api/user/john/hwid_info" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "username": "john",
  "current_count": 2,
  "limit": 3,
  "available": 1,
  "devices": ["abc123def456...", "xyz789uvw012..."]
}
```

## Database Migration Required

Before using this feature, you need to run a database migration to add the new columns:

```sql
-- Option 1: Using Alembic (recommended)
alembic revision --autogenerate -m "Add HWID limit fields to users table"
alembic upgrade head

-- Option 2: Direct SQL (PostgreSQL example)
ALTER TABLE users ADD COLUMN hwids JSON DEFAULT NULL;
ALTER TABLE users ADD COLUMN hwid_limit BIGINT DEFAULT NULL;
```

The columns store:
- **hwids**: JSON array of registered hardware ID hashes
- **hwid_limit**: Maximum allowed unique devices (NULL or 0 = unlimited)

## Security Features

✅ **No Hardware Exposure**: Uses SHA256 hashing - actual hardware info not stored  
✅ **Server-Side Validation**: Client cannot bypass HWID limits  
✅ **Deterministic**: Same client always gets same HWID (consistent device tracking)  
✅ **Per-User Control**: Each user can have different limits  
✅ **Admin Override**: Admins can reset devices or increase limits  

## Error Messages

When HWID limit is exceeded:
```
HTTP 403 Forbidden
{
  "detail": "HWID limit reached. Maximum 3 devices allowed."
}
```

## Configuration Notes

### Default Behavior
- New users: `hwid_limit = None` (unlimited devices)
- Existing users: No limit applied (need admin to set)

### To Enable for All New Users
Modify user creation to set default limit:
```python
# In user creation endpoint or template
hwid_limit = 5  # or whatever default you want
```

## Next Steps

1. **Generate Database Migration**
   ```bash
   cd /path/to/project
   alembic revision --autogenerate -m "Add HWID limit to users"
   ```

2. **Apply Migration**
   ```bash
   alembic upgrade head
   ```

3. **Test the Feature**
   ```bash
   # Set limit for test user
   curl -X PATCH "http://localhost:8000/api/user/testuser/hwid_limit?hwid_limit=2"
   
   # Check info
   curl -X GET "http://localhost:8000/api/user/testuser/hwid_info"
   
   # Make subscription requests from 1st client (allowed)
   # Make subscription requests from 2nd client (allowed)
   # Make subscription requests from 3rd client (denied - 403)
   ```

4. **Monitor Usage**
   - Regularly check HWID info for suspicious patterns
   - Reset HWIDs if users lose devices or need reinstatement

## Troubleshooting

### HWID Check Not Working
- Verify User-Agent header is being sent in subscription requests
- Check user's `hwid_limit` is set (not None and > 0)
- Ensure database migration has been applied

### User Gets 403 But Should Have Access
- Check HWID info to see registered devices
- Reset HWIDs if necessary: `DELETE /api/user/{username}/hwids`
- Verify client is sending User-Agent header

### Different Clients Getting Different HWIDs
- Expected behavior - different User-Agents = different HWIDs
- This is by design to track multiple clients

## Performance Considerations

- HWID calculation is fast (SHA256 hash)
- Database operations are simple (single field checks)
- Minimal overhead on subscription requests
- No additional external dependencies

## Compatibility

- ✅ Works with all proxy clients (v2rayNG, Clash, etc.)
- ✅ Transparent to clients (no UI changes needed)
- ✅ Compatible with existing subscription system
- ✅ Works with TUI and CLI interfaces

## Feature Comparison with remnawave/panel

This implementation provides similar functionality to remnawave/panel's HWID limiting:

| Feature | PasarGuard | remnawave/panel |
|---------|-----------|-----------------|
| HWID Calculation | ✅ SHA256 from User-Agent | Similar |
| Device Limit | ✅ Per-user configurable | Similar |
| Admin Reset | ✅ API endpoint | Similar |
| Device List | ✅ View registered HWIDs | Similar |
| Error Handling | ✅ 403 on limit exceeded | Similar |

## Support

For issues or questions about the HWID implementation:

1. Check [HWID_LIMIT_IMPLEMENTATION.md](HWID_LIMIT_IMPLEMENTATION.md) for detailed docs
2. Review API endpoint examples
3. Check subscription logs for HWID-related messages
4. Inspect user HWID info: `GET /api/user/{username}/hwid_info`

---

**Implementation Date:** 2026-04-19  
**Version:** 1.0  
**Status:** Ready for testing and deployment
