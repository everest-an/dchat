import { createContext, useContext, useState, useEffect } from 'react'
import en from '../locales/en'
import zh from '../locales/zh'

const LanguageContext = createContext()

const translations = {
  en,
  zh
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // 从 localStorage 获取保存的语言设置，默认为英语
    return localStorage.getItem('language') || 'en'
  })

  useEffect(() => {
    // 保存语言设置到 localStorage
    localStorage.setItem('language', language)
  }, [language])

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    return value || key
  }

  const switchLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

