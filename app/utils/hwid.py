"""
HWID (Hardware ID) utilities for device tracking and limiting.

This module provides functions to calculate HWID from device characteristics,
validate HWID limits, and manage device tracking.
"""

import hashlib
from typing import Optional
from datetime import datetime as dt, timezone as tz


def calculate_hwid(user_agent: str = "", fingerprint: str = "") -> str:
    """
    Calculate a unique Hardware ID based on device characteristics.
    
    This function generates a deterministic hash from user agent and device fingerprint.
    The HWID can be derived from:
    - User-Agent header (client type and version)
    - Device fingerprint (optional, can include OS, arch, etc.)
    
    Args:
        user_agent: User-Agent header string from the client
        fingerprint: Optional device fingerprint data
        
    Returns:
        str: A 32-character hex hash representing the unique device
        
    Example:
        hwid = calculate_hwid(
            user_agent="v2rayNG/1.9.46",
            fingerprint="Linux-x86_64-CPU:Intel"
        )
    """
    # Combine user agent and fingerprint for device identification
    combined = f"{user_agent}:{fingerprint}".encode('utf-8')
    
    # Generate SHA256 hash
    hwid = hashlib.sha256(combined).hexdigest()
    
    return hwid


async def check_and_store_hwid(
    user_hwids: Optional[list[str]],
    hwid_limit: Optional[int],
    current_hwid: str
) -> tuple[bool, Optional[str]]:
    """
    Check if current HWID is allowed based on the limit.
    
    Logic:
    1. If hwid_limit is None or 0, unlimited devices are allowed
    2. If current HWID already exists in the list, allow access
    3. If HWID is new but limit not reached, add it and allow
    4. If limit is reached, deny access
    
    Args:
        user_hwids: Current list of stored HWIDs (can be None or empty)
        hwid_limit: Maximum number of unique HWIDs (None or 0 = unlimited)
        current_hwid: The current device's HWID to check
        
    Returns:
        tuple: (is_allowed: bool, error_message: Optional[str])
        - (True, None) if access is allowed
        - (False, error_message) if access is denied
        
    Example:
        allowed, error = await check_and_store_hwid(
            user_hwids=["abc123", "def456"],
            hwid_limit=3,
            current_hwid="abc123"
        )
        if not allowed:
            raise HTTPException(status_code=403, detail=error)
    """
    # Unlimited devices - no check needed
    if hwid_limit is None or hwid_limit == 0:
        return True, None
    
    # Initialize if None
    if user_hwids is None:
        user_hwids = []
    
    # HWID already known - allow
    if current_hwid in user_hwids:
        return True, None
    
    # Check if we can add new HWID
    if len(user_hwids) >= hwid_limit:
        return False, f"HWID limit reached. Maximum {hwid_limit} devices allowed."
    
    # New HWID, add it
    user_hwids.append(current_hwid)
    return True, None


def get_hwid_info(user_hwids: Optional[list[str]], hwid_limit: Optional[int]) -> dict:
    """
    Get formatted information about HWID usage.
    
    Args:
        user_hwids: Current list of stored HWIDs
        hwid_limit: Maximum number of unique HWIDs
        
    Returns:
        dict: Information about HWID usage including:
        - current_count: Number of unique devices currently registered
        - limit: Maximum allowed devices (or "unlimited")
        - available: Number of slots available (or "unlimited")
        - devices: List of registered device HWIDs (shortened for display)
    """
    hwids_list = user_hwids or []
    current_count = len(hwids_list)
    
    if hwid_limit is None or hwid_limit == 0:
        return {
            "current_count": current_count,
            "limit": "unlimited",
            "available": "unlimited",
            "devices": hwids_list[:8]  # Show first 8 characters for display
        }
    
    available = max(0, hwid_limit - current_count)
    return {
        "current_count": current_count,
        "limit": hwid_limit,
        "available": available,
        "devices": hwids_list[:8]  # Show first 8 characters for display
    }


def format_hwid_for_display(hwid: str, length: int = 16) -> str:
    """
    Format HWID for display purposes (shortened version).
    
    Args:
        hwid: Full HWID hash
        length: Number of characters to display
        
    Returns:
        str: Shortened HWID string with ellipsis
    """
    if len(hwid) <= length:
        return hwid
    return f"{hwid[:length]}..."
