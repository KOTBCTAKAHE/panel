# HWID Management UI Implementation

## Overview

The HWID (Hardware ID) Management feature has been fully integrated into the PasarGuard dashboard UI. Users can now manage device limits and reset registered HWIDs directly from the admin panel.

## Components Created

### 1. HWIDManagementModal Component
**File:** `dashboard/src/components/dialogs/hwid-management-modal.tsx`

A comprehensive modal dialog for managing HWID settings with two tabs:

#### Features:
- **Info Tab**: Displays current HWID usage
  - Device count and utilization percentage
  - Available slots remaining
  - List of registered device HWIDs
  - Refresh button to update information

- **Settings Tab**: Manage HWID configuration
  - Set or modify HWID limit
  - Reset all registered devices
  - Confirmation dialog for destructive actions

#### Props:
```typescript
interface HWIDManagementModalProps {
  user: UserResponse | null           // User object
  isOpen: boolean                      // Modal visibility state
  onOpenChange: (open: boolean) => void // State setter
  onSuccess?: () => void                // Success callback
}
```

#### API Integration:
The modal makes direct HTTP requests to:
- `GET /api/user/{username}/hwid_info` - Fetch HWID information
- `PATCH /api/user/{username}/hwid_limit` - Set HWID limit
- `DELETE /api/user/{username}/hwids` - Reset devices

## Integration with UI

### Action Buttons Component
**File:** `dashboard/src/components/users/action-buttons.tsx`

#### Changes Made:

1. **Import HWIDManagementModal**
   ```typescript
   import HWIDManagementModal from '@/components/dialogs/hwid-management-modal'
   import { HardDrive } from 'lucide-react'  // Icon for menu item
   ```

2. **Added Modal State**
   ```typescript
   type ActionButtonsModalState = {
     // ... existing states ...
     isHWIDModalOpen: boolean  // New state for HWID modal
   }
   ```

3. **Updated Default Modal State**
   ```typescript
   const createDefaultModalState = (user: UserResponse): ActionButtonsModalState => ({
     // ... existing defaults ...
     isHWIDModalOpen: false,
   })
   ```

4. **Added Modal Setter**
   ```typescript
   const setHWIDModalOpen = useCallback(
     (value: boolean) => setModalState({ isHWIDModalOpen: value }),
     [setModalState]
   )
   ```

5. **Added Dropdown Menu Item**
   ```typescript
   <DropdownMenuItem onSelect={() => setHWIDModalOpen(true)}>
     <HardDrive className="mr-2 h-4 w-4" />
     <span>{t('hwid.management', { defaultValue: 'HWID Management' })}</span>
   </DropdownMenuItem>
   ```

6. **Rendered Modal Component**
   ```typescript
   <HWIDManagementModal 
     user={user} 
     isOpen={isHWIDModalOpen} 
     onOpenChange={setHWIDModalOpen} 
     onSuccess={() => {
       invalidateUserMetricsQueries(queryClient)
     }} 
   />
   ```

## Localization Support

### Translations Added to All Languages

**Files Updated:**
- `dashboard/public/statics/locales/en.json` (English)
- `dashboard/public/statics/locales/fa.json` (Farsi)
- `dashboard/public/statics/locales/ru.json` (Russian)
- `dashboard/public/statics/locales/zh.json` (Chinese)

### Translation Keys:
```json
{
  "hwid": {
    "title": "HWID Management",
    "description": "Manage device hardware ID limits",
    "management": "HWID Management",
    "info": "Info",
    "settings": "Settings",
    "deviceCount": "Devices",
    "available": "Available Slots",
    "unlimited": "Unlimited",
    "registeredDevices": "Registered Devices",
    "refresh": "Refresh",
    "limit": "HWID Limit",
    "limitPlaceholder": "Enter limit (0 for unlimited)",
    "limitHelp": "Enter 0 for unlimited devices",
    "dangerZone": "Danger Zone",
    "resetDevices": "Reset Registered Devices",
    "resetHelp": "This will clear all registered HWIDs...",
    "resetConfirmTitle": "Reset Devices?",
    "resetConfirmDesc": "This will clear all registered hardware IDs..."
  }
}
```

## User Interface Flow

### Accessing HWID Management

1. **Navigate to Users Page**: Click on "Users" in the sidebar
2. **Open User Actions Menu**: Click the three-dot menu (...) on any user row
3. **Select "HWID Management"**: Click the "HWID Management" option
4. **Modal Opens**: Shows current HWID information and settings

### Managing HWIDs - Info Tab

**What You See:**
- Current device count vs limit (e.g., "2 / 3")
- Visual progress bar showing utilization
- Number of available slots remaining
- List of registered HWID hashes (truncated for display)
- Refresh button to reload information

### Managing HWIDs - Settings Tab

**Available Actions:**

1. **Adjust HWID Limit**
   - Enter a number (0 = unlimited, 1-100+ = specific limit)
   - Click "Set" button
   - Limit updates immediately

2. **Reset Registered Devices**
   - Click "Reset Registered Devices" button
   - Confirm in the alert dialog
   - All HWIDs are cleared
   - User can immediately register new devices

## Visual Design

### Modal Layout
```
┌─────────────────────────────────────┐
│ 🖥️  HWID Management                 │
│ Manage device hardware ID limits    │
├─────────────────────────────────────┤
│ [Info] [Settings]                   │
├─────────────────────────────────────┤
│                                     │
│ Info Tab Content:                   │
│ ┌─────────────────────────────────┐ │
│ │ Devices                         │ │
│ │ 2 / 3                           │ │
│ │ [████░░░░░░░░░░░░░░░░]        │ │
│ ├─────────────────────────────────┤ │
│ │ Available Slots                 │ │
│ │ 1                               │ │
│ ├─────────────────────────────────┤ │
│ │ Registered Devices              │ │
│ │ • abc123def456...               │ │
│ │ • xyz789uvw012...               │ │
│ ├─────────────────────────────────┤ │
│ │ [Refresh]                       │ │
│                                     │
└─────────────────────────────────────┘
```

### Settings Tab Layout
```
┌─────────────────────────────────────┐
│ HWID Limit                          │
│ [5] [Set]                           │
│ Enter 0 for unlimited devices       │
│                                     │
│ ⚠️  Danger Zone                      │
│ [Reset Registered Devices]          │
│ This will clear all registered...   │
└─────────────────────────────────────┘
```

## Error Handling

### Display Error Messages
- API request failures display toast notifications
- User-friendly error messages in modals
- Validation for invalid input (negative numbers, etc.)

### Common Scenarios
1. **Failed to Fetch**: Show error message and retry button
2. **Invalid Input**: Display validation error and prevent submission
3. **Network Error**: Show connection error with retry option

## Success Feedback

- ✅ Toast notification displays "Success" message
- Modal automatically refreshes data after successful operation
- Cache is invalidated to reflect changes across dashboard
- Optional success callback can be provided for custom handling

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Modal fetches data only when opened
- **Request Cancellation**: Previous requests cancelled before new ones
- **Cache Invalidation**: Only invalidates relevant user queries
- **Memoization**: Component uses React.memo for performance

### Network Requests
- Minimal API calls (only when user explicitly opens/refreshes)
- No polling or auto-refresh by default
- Manual refresh button for explicit updates

## Code Quality

### TypeScript Support
- Fully typed components
- Interface definitions for props and API responses
- Type-safe error handling

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Focus management in modals
- Semantic HTML structure

### Internationalization
- Full i18n support with fallbacks
- Right-to-left (RTL) language support for Farsi
- Translations in 4 languages

## How to Use

### For Admin Users

#### Set Device Limit
```
1. Go to Users page
2. Click user's action menu (...)
3. Select "HWID Management"
4. Go to "Settings" tab
5. Enter desired limit (0 for unlimited)
6. Click "Set"
```

#### View Device Status
```
1. Go to Users page
2. Click user's action menu (...)
3. Select "HWID Management"
4. Check "Info" tab for:
   - How many devices registered
   - How many slots available
   - List of registered device IDs
```

#### Reset Devices
```
1. Go to Users page
2. Click user's action menu (...)
3. Select "HWID Management"
4. Go to "Settings" tab
5. Click "Reset Registered Devices"
6. Confirm in the dialog
7. User's devices will be cleared
```

## Integration Checklist

- ✅ HWID Modal component created
- ✅ Integrated into action-buttons component
- ✅ Menu item added to user actions dropdown
- ✅ Translations added (EN, FA, RU, ZH)
- ✅ API endpoints connected
- ✅ Error handling implemented
- ✅ Success feedback added
- ✅ TypeScript types defined
- ✅ Responsive design implemented
- ✅ Accessibility features included

## File Summary

### New Files
- `dashboard/src/components/dialogs/hwid-management-modal.tsx` (203 lines)

### Modified Files
- `dashboard/src/components/users/action-buttons.tsx`
  - Added HWID modal state and handlers
  - Added dropdown menu item
  - Added modal rendering
  
- `dashboard/public/statics/locales/en.json`
  - Added HWID translations
  
- `dashboard/public/statics/locales/fa.json`
  - Added HWID translations
  
- `dashboard/public/statics/locales/ru.json`
  - Added HWID translations
  
- `dashboard/public/statics/locales/zh.json`
  - Added HWID translations

## Testing Recommendations

### Manual Testing
1. ✅ Open HWID management modal
2. ✅ View current HWID information
3. ✅ Set new HWID limit
4. ✅ Verify limit saves correctly
5. ✅ Reset device list
6. ✅ Confirm reset clears devices
7. ✅ Test error scenarios (network failures)
8. ✅ Verify translations in different languages

### Edge Cases
- User with no registered devices
- User with limit reached
- User with unlimited devices
- Network timeouts and failures
- Very large device lists (scroll handling)

## Deployment Notes

### Prerequisites
- Backend API endpoints must be running
- Database migrations applied for HWID fields
- API returns correct response format

### Post-Deployment
1. Verify HWID endpoints are accessible
2. Test UI components in all supported browsers
3. Verify translations display correctly
4. Monitor error logs for API issues

## Future Enhancements

Potential improvements for future versions:
- Device renaming/labeling
- Device activity logs
- Automatic device removal after inactivity
- Bulk HWID management operations
- HWID import/export functionality
- Device geolocation information
- Client version tracking
- Suspicious activity alerts

---

**Status:** ✅ Implementation Complete  
**Version:** 1.0  
**Last Updated:** 2026-04-19
