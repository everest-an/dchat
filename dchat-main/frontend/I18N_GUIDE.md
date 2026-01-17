# Internationalization (i18n) Guide

Complete guide for using and managing multi-language support in dchat.pro.

**Author**: Manus AI  
**Date**: 2024-11-05  
**Version**: 1.0

---

## Overview

dchat.pro supports 8 major languages with automatic detection and RTL (Right-to-Left) support for Arabic.

**Supported Languages**:
- English (en)
- Chinese Simplified (zh-CN)
- Chinese Traditional (zh-TW)
- Spanish (es)
- Arabic (ar) - RTL support
- Russian (ru)
- Japanese (ja)
- Korean (ko)

---

## Setup

### Installation

```bash
npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

### Configuration

The i18n configuration is located in `src/i18n/config.js`.

```javascript
import i18n from './i18n/config';
```

### Initialize in App

```javascript
// src/main.jsx or src/App.jsx
import './i18n/config';
```

---

## Usage

### Basic Translation

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('auth.loginSuccess')}</p>
    </div>
  );
}
```

### Translation with Variables

```javascript
// Translation key: "notification.newMessage": "New message from {{name}}"

const { t } = useTranslation();
const message = t('notification.newMessage', { name: 'Alice' });
// Output: "New message from Alice"
```

### Pluralization

```javascript
// Translation keys:
// "time.minuteAgo": "{{count}} minute ago"
// "time.minuteAgo_plural": "{{count}} minutes ago"

const { t } = useTranslation();
const time1 = t('time.minuteAgo', { count: 1 });  // "1 minute ago"
const time5 = t('time.minuteAgo', { count: 5 });  // "5 minutes ago"
```

### Trans Component (for HTML)

```javascript
import { Trans } from 'react-i18next';

function MyComponent() {
  return (
    <Trans i18nKey="auth.signatureRequired">
      Signature required to <strong>authenticate</strong>
    </Trans>
  );
}
```

### Change Language

```javascript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <button onClick={() => changeLanguage('zh-CN')}>
      切换到中文
    </button>
  );
}
```

### Get Current Language

```javascript
const { i18n } = useTranslation();
const currentLanguage = i18n.language;  // e.g., "en", "zh-CN"
```

---

## Translation Files

Translation files are located in `src/i18n/locales/{language}/translation.json`.

### File Structure

```
src/i18n/
├── config.js
└── locales/
    ├── en/
    │   └── translation.json
    ├── zh-CN/
    │   └── translation.json
    ├── zh-TW/
    │   └── translation.json
    ├── es/
    │   └── translation.json
    ├── ar/
    │   └── translation.json
    ├── ru/
    │   └── translation.json
    ├── ja/
    │   └── translation.json
    └── ko/
        └── translation.json
```

### Translation Key Structure

Translations are organized by namespace:

```json
{
  "common": {
    "appName": "dchat.pro",
    "welcome": "Welcome",
    "loading": "Loading..."
  },
  "auth": {
    "login": "Login",
    "signup": "Sign Up"
  },
  "chat": {
    "messages": "Messages",
    "sendMessage": "Send Message"
  }
}
```

### Nested Keys

Use dot notation to access nested keys:

```javascript
t('common.appName')  // "dchat.pro"
t('auth.login')      // "Login"
t('chat.messages')   // "Messages"
```

---

## Adding New Translations

### 1. Add Key to English File

Edit `src/i18n/locales/en/translation.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my new feature"
  }
}
```

### 2. Add Translations to Other Languages

Copy the structure to other language files and translate:

**zh-CN/translation.json**:
```json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是我的新功能"
  }
}
```

### 3. Use in Component

```javascript
const { t } = useTranslation();
return <h1>{t('myFeature.title')}</h1>;
```

---

## Best Practices

### 1. Use Meaningful Keys

❌ Bad:
```json
{
  "text1": "Welcome",
  "text2": "Login"
}
```

✅ Good:
```json
{
  "common": {
    "welcome": "Welcome"
  },
  "auth": {
    "login": "Login"
  }
}
```

### 2. Group Related Keys

Group translations by feature or page:

```json
{
  "auth": { ... },
  "chat": { ... },
  "group": { ... },
  "payment": { ... }
}
```

### 3. Use Variables for Dynamic Content

❌ Bad:
```javascript
const message = `New message from ${name}`;
```

✅ Good:
```json
{
  "notification": {
    "newMessage": "New message from {{name}}"
  }
}
```

```javascript
t('notification.newMessage', { name: 'Alice' });
```

### 4. Handle Pluralization

```json
{
  "time": {
    "minuteAgo": "{{count}} minute ago",
    "minuteAgo_plural": "{{count}} minutes ago"
  }
}
```

### 5. Keep Translations Consistent

Use the same terminology across the app:
- "Send" vs "Submit"
- "Delete" vs "Remove"
- "Cancel" vs "Close"

### 6. Provide Context

Add comments for translators:

```json
{
  "chat": {
    "typing": "typing...",  // Shown when user is typing a message
    "delivered": "Delivered"  // Message delivery status
  }
}
```

---

## RTL (Right-to-Left) Support

Arabic is configured with RTL support.

### Automatic Direction Change

The HTML `dir` attribute is automatically updated when the language changes:

```javascript
// In i18n/config.js
i18n.on('languageChanged', (lng) => {
  const dir = languages[lng]?.dir || 'ltr';
  document.documentElement.setAttribute('dir', dir);
});
```

### CSS for RTL

Use logical properties for RTL compatibility:

❌ Bad:
```css
.element {
  margin-left: 10px;
  padding-right: 20px;
}
```

✅ Good:
```css
.element {
  margin-inline-start: 10px;
  padding-inline-end: 20px;
}
```

Or use Tailwind CSS RTL utilities:
```jsx
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Content
</div>
```

---

## Language Detection

Languages are detected in the following order:

1. **localStorage**: `i18nextLng` key
2. **Browser Language**: `navigator.language`
3. **Fallback**: English (en)

### Manual Language Detection

```javascript
const getDefaultLanguage = () => {
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage) return savedLanguage;

  const browserLanguage = navigator.language;
  return browserLanguage || 'en';
};
```

---

## Testing Translations

### 1. Visual Testing

Switch between languages and verify:
- All text is translated
- No broken layouts
- RTL works correctly
- Variables are replaced

### 2. Missing Translation Detection

Enable debug mode in development:

```javascript
// i18n/config.js
i18n.init({
  debug: import.meta.env.DEV,
  // ...
});
```

Missing translations will be logged to the console.

### 3. Automated Testing

```javascript
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';

test('renders translated text', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MyComponent />
    </I18nextProvider>
  );
  
  expect(screen.getByText('Welcome')).toBeInTheDocument();
});
```

---

## Translation Management

### Workflow

1. **Developer** adds new keys to `en/translation.json`
2. **Translator** translates keys to other languages
3. **Reviewer** reviews and approves translations
4. **Deploy** updated translation files

### Tools

**Translation Management Platforms**:
- [Crowdin](https://crowdin.com/)
- [Lokalise](https://lokalise.com/)
- [Phrase](https://phrase.com/)

These platforms provide:
- Translation memory
- Collaboration tools
- Quality checks
- API integration

### Export/Import

Export translations for translators:

```bash
# Export all translations to a single file
node scripts/export-translations.js
```

Import translated files:

```bash
# Import translations from translators
node scripts/import-translations.js
```

---

## Performance Optimization

### 1. Code Splitting

Load translations on demand:

```javascript
i18n.use(Backend).init({
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
});
```

### 2. Lazy Loading

Load translations for specific namespaces:

```javascript
const { t } = useTranslation(['common', 'chat']);
```

### 3. Caching

Translations are cached in localStorage by default.

---

## Troubleshooting

### Translation Not Showing

1. Check if the key exists in the translation file
2. Verify the namespace is correct
3. Check for typos in the key
4. Enable debug mode to see errors

### RTL Not Working

1. Verify `dir` attribute is set on `<html>`
2. Check CSS for hardcoded left/right properties
3. Use logical properties or RTL-aware utilities

### Language Not Persisting

1. Check localStorage for `i18nextLng` key
2. Verify `caches: ['localStorage']` in config
3. Check for errors in browser console

---

## Future Enhancements

### Planned Features

- [ ] Automatic translation using AI
- [ ] Translation suggestions
- [ ] In-context editing
- [ ] Translation analytics
- [ ] A/B testing for translations

### Additional Languages

To add more languages:

1. Create a new folder in `src/i18n/locales/{language-code}/`
2. Add `translation.json` with all keys
3. Update `languages` object in `src/i18n/config.js`
4. Add to `LanguageSwitcher` component

---

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [RTL Styling Guide](https://rtlstyling.com/)

---

**Last Updated**: 2024-11-05  
**Maintained By**: Manus AI
