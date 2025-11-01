# Signup & Profile Improvements

## Overview

Automatic user profile creation during signup with a display name field.

## Changes Made

### 1. Enhanced Signup Form

**File**: `app/(auth)/login/page.tsx`

#### New Features:
- ✅ **Display Name Field** (only shown during signup)
  - Required field (2-50 characters)
  - Real-time validation
  - Automatically cleared when switching between login/signup

- ✅ **Automatic Profile Creation**
  - User profile created immediately after signup
  - Display name stored in `user_profiles` table
  - Graceful error handling (account still created if profile fails)

#### UI/UX Improvements:
- Display name appears first in the signup form
- Proper autocomplete attributes (`name`, `email`, `new-password`, `current-password`)
- Validation errors shown inline
- Form state cleared when toggling between login/signup

### 2. Validation Rules

**Display Name:**
- Minimum: 2 characters
- Maximum: 50 characters
- Required for signup
- Trimmed before storage

**Email:**
- Valid email format required
- Standard email regex validation

**Password:**
- Minimum: 6 characters
- Required for both login and signup

## User Flow

### Signup
1. User clicks "Don't have an account? Sign up"
2. Display Name field appears at the top
3. User fills in: Display Name, Email, Password
4. Form validates all fields
5. On submit:
   - Creates auth account
   - Creates user profile with display name
   - Shows success toast
   - Redirects to `/chat`

### Login
1. User enters Email and Password (no display name field)
2. Signs in normally
3. Redirects to `/chat`

## Database Schema

**Table**: `user_profiles`

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Error Handling

### Profile Creation Failure
- Error logged to console
- User account still created
- User can add profile later via Profile Dialog
- No disruption to signup flow

### Validation Errors
- Shown inline below each field
- Red border on invalid fields
- Cleared when user starts typing
- All errors cleared when switching modes

## Backward Compatibility

### Existing Users
Users who signed up before this change may not have profiles:

**Handled in the app:**
1. Chat messages show "You" if no display name
2. Profile dialog allows creating/editing profile
3. AI context includes user info only if available

**Migration (Optional):**
To create default profiles for existing users:
```sql
INSERT INTO user_profiles (user_id, display_name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;
```

## Future Enhancements

- [ ] Email verification before account activation
- [ ] Password strength indicator
- [ ] Social login (Google, GitHub, etc.)
- [ ] Profile picture upload during signup
- [ ] Username uniqueness check
- [ ] Password confirmation field
- [ ] Terms of service acceptance checkbox

## Testing

### Test Cases

1. **Signup with valid data:**
   - [ ] Display name, email, password all valid
   - [ ] Profile created successfully
   - [ ] Redirected to chat
   - [ ] Display name appears in chat messages

2. **Signup validation:**
   - [ ] Empty display name shows error
   - [ ] Display name < 2 chars shows error
   - [ ] Display name > 50 chars shows error
   - [ ] Invalid email shows error
   - [ ] Password < 6 chars shows error

3. **Mode switching:**
   - [ ] Display name field appears in signup mode
   - [ ] Display name field hidden in login mode
   - [ ] Errors cleared when switching
   - [ ] Display name value cleared when switching

4. **Login (existing user):**
   - [ ] No display name field shown
   - [ ] Can login normally
   - [ ] Redirected to chat

5. **Error scenarios:**
   - [ ] Duplicate email shows error
   - [ ] Network error shows error
   - [ ] Profile creation failure doesn't block signup

## Notes

- Display names are trimmed before storage (removes leading/trailing spaces)
- Profile creation is non-blocking (signup succeeds even if profile fails)
- Existing users without profiles can still use the app
- Profile dialog allows editing display name anytime

