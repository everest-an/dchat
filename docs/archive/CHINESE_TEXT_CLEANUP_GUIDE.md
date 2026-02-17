# Chinese Text Cleanup Guide

## Overview

This guide helps you systematically remove Chinese text from the dchat frontend codebase and ensure 100% English language consistency.

## Current Status

✅ **Completed**:
- Default language set to English in LanguageContext
- 808 Chinese comments translated to English
- AuthService implemented with English comments
- Translation infrastructure in place (en.js, zh.js)

⚠️ **Remaining**:
- ~47 files contain hardcoded Chinese UI text
- These bypass the translation system and show Chinese even in English mode

## Quick Reference

### Files with Most Chinese UI Text

Priority order (most user-visible first):

1. **components/Portfolio.jsx** - Portfolio management UI
2. **components/OpportunityMatching.jsx** - Matching interface
3. **components/PaymentManager.jsx** - Payment UI
4. **components/Profile.jsx** - User profile
5. **components/ChatRoom.jsx** - Chat interface
6. **components/GroupChat.jsx** - Group chat
7. **components/dialogs/UpdateAvailabilityDialog.jsx** - Availability settings
8. **contexts/Web3Context.jsx** - Wallet error messages

## Step-by-Step Cleanup Process

### Step 1: Find Chinese Text

```bash
cd /home/ubuntu/dchat/frontend/src
grep -rn "[\u4e00-\u9fa5]" components/Portfolio.jsx
```

### Step 2: Extract to Translation Files

For each Chinese string found:

1. **Add to `locales/en.js`**:
```javascript
export default {
  // ... existing translations
  
  // Portfolio
  'portfolio.title': 'My Portfolio',
  'portfolio.add_project': 'Add Project',
  'portfolio.no_projects': 'No projects yet',
  
  // ... more translations
}
```

2. **Add to `locales/zh.js`**:
```javascript
export default {
  // ... existing translations
  
  // Portfolio  
  'portfolio.title': '我的作品集',
  'portfolio.add_project': '添加项目',
  'portfolio.no_projects': '还没有项目',
  
  // ... more translations
}
```

### Step 3: Update Component

Replace hardcoded text with `t()` function:

**Before**:
```jsx
<h1>我的作品集</h1>
<button>添加项目</button>
<p>还没有项目</p>
```

**After**:
```jsx
import { useLanguage } from '../contexts/LanguageContext'

function Portfolio() {
  const { t } = useLanguage()
  
  return (
    <>
      <h1>{t('portfolio.title')}</h1>
      <button>{t('portfolio.add_project')}</button>
      <p>{t('portfolio.no_projects')}</p>
    </>
  )
}
```

### Step 4: Test

1. **Test English mode**:
   - Clear localStorage
   - Reload app
   - Verify all text is English

2. **Test Chinese mode**:
   - Switch language to Chinese
   - Verify all text is Chinese

## Translation Key Naming Convention

Use semantic, hierarchical keys:

### Categories

- `actions.*` - Button actions (send, delete, edit, save, cancel)
- `labels.*` - Form labels and field names
- `messages.*` - Success/error/info messages
- `status.*` - Status indicators (online, offline, busy)
- `titles.*` - Page/dialog/section titles
- `placeholders.*` - Input placeholders
- `tooltips.*` - Tooltip text
- `errors.*` - Error messages
- `validation.*` - Form validation messages

### Examples

```javascript
// Good ✅
'actions.send_message': 'Send Message'
'labels.username': 'Username'
'messages.login_success': 'Login successful'
'status.online': 'Online'
'titles.user_profile': 'User Profile'
'placeholders.enter_email': 'Enter your email'
'errors.network_error': 'Network error occurred'

// Bad ❌
'text1': 'Send Message'  // Not semantic
'sendMessage': 'Send Message'  // Use snake_case, not camelCase
'send': 'Send Message'  // Too generic, needs category
```

## Automated Tools

### 1. Find All Chinese Text

```bash
cd /home/ubuntu/dchat/frontend/src
find . -name "*.jsx" -o -name "*.js" | xargs grep -l "[\u4e00-\u9fa5]" | grep -v node_modules | grep -v locales
```

### 2. Extract Chinese from Specific File

```bash
grep -o "[\u4e00-\u9fa5]\+" components/Portfolio.jsx | sort -u
```

### 3. Check Translation Coverage

```bash
# Find strings in quotes that contain Chinese
grep -rn "['\"].*[\u4e00-\u9fa5].*['\"]" components/ --include="*.jsx"
```

## Common Patterns

### Pattern 1: Button Text

**Before**:
```jsx
<Button>保存</Button>
<Button>取消</Button>
```

**After**:
```jsx
<Button>{t('actions.save')}</Button>
<Button>{t('actions.cancel')}</Button>
```

### Pattern 2: Form Labels

**Before**:
```jsx
<Label>用户名</Label>
<Input placeholder="请输入用户名" />
```

**After**:
```jsx
<Label>{t('labels.username')}</Label>
<Input placeholder={t('placeholders.enter_username')} />
```

### Pattern 3: Error Messages

**Before**:
```jsx
setError('请先连接钱包')
throw new Error('连接失败')
```

**After**:
```jsx
setError(t('errors.connect_wallet_first'))
throw new Error(t('errors.connection_failed'))
```

### Pattern 4: Status Text

**Before**:
```jsx
const status = user.online ? '在线' : '离线'
```

**After**:
```jsx
const status = user.online ? t('status.online') : t('status.offline')
```

### Pattern 5: Dialog Titles

**Before**:
```jsx
<DialogTitle>更新可用性状态</DialogTitle>
```

**After**:
```jsx
<DialogTitle>{t('titles.update_availability')}</DialogTitle>
```

## Testing Checklist

After cleaning each file:

- [ ] No Chinese characters visible in English mode
- [ ] All UI text uses `t()` function
- [ ] Translation keys exist in both en.js and zh.js
- [ ] Language switching works correctly
- [ ] No console errors
- [ ] Component renders correctly

## Progress Tracking

Create a checklist of files to clean:

```markdown
## Components
- [ ] Portfolio.jsx
- [ ] OpportunityMatching.jsx
- [ ] PaymentManager.jsx
- [ ] Profile.jsx
- [ ] ChatRoom.jsx
- [ ] GroupChat.jsx
- [ ] ChatList.jsx
- [ ] MainApp.jsx
- [ ] LoginScreen.jsx
- [ ] Moments.jsx

## Dialogs
- [ ] UpdateAvailabilityDialog.jsx
- [ ] CreatePortfolioDialog.jsx
- [ ] CreateMatchDialog.jsx
- [ ] PaymentDialog.jsx
- [ ] EditProfileDialog.jsx

## Contexts
- [ ] Web3Context.jsx
- [ ] LanguageContext.jsx

## Services
- [ ] ContractService.js
- [ ] SubscriptionService.js
```

## Tips

1. **Work file by file** - Don't try to do everything at once
2. **Test frequently** - Test after each file to catch issues early
3. **Use consistent keys** - Follow the naming convention
4. **Group related translations** - Keep related keys together
5. **Document as you go** - Add comments for complex translations
6. **Keep Chinese translations** - Always update both en.js and zh.js

## Common Mistakes to Avoid

❌ **Don't** hardcode text:
```jsx
<button>Send</button>
```

✅ **Do** use translation:
```jsx
<button>{t('actions.send')}</button>
```

❌ **Don't** use inline translations:
```jsx
{language === 'en' ? 'Send' : '发送'}
```

✅ **Do** use the translation system:
```jsx
{t('actions.send')}
```

❌ **Don't** forget to import:
```jsx
// Missing import
function MyComponent() {
  return <div>{t('hello')}</div>  // Error!
}
```

✅ **Do** import useLanguage:
```jsx
import { useLanguage } from '../contexts/LanguageContext'

function MyComponent() {
  const { t } = useLanguage()
  return <div>{t('hello')}</div>  // Works!
}
```

## Resources

- **Translation files**: `src/locales/en.js`, `src/locales/zh.js`
- **Language context**: `src/contexts/LanguageContext.jsx`
- **Example usage**: Check `BottomNavigation.jsx` for good examples
- **Audit report**: `/home/ubuntu/CHINESE_TEXT_AUDIT.md`

## Getting Help

If you encounter issues:

1. Check if translation key exists in both en.js and zh.js
2. Verify `useLanguage` is imported correctly
3. Check browser console for errors
4. Test language switching
5. Review this guide for examples

## Completion Criteria

The cleanup is complete when:

- ✅ No Chinese text appears in English mode
- ✅ All UI text uses `t()` function
- ✅ Language switching works perfectly
- ✅ All 47 files are processed
- ✅ Tests pass
- ✅ No console errors

---

**Last Updated**: 2025-10-31  
**Status**: In Progress  
**Priority**: High (Sprint 1)
