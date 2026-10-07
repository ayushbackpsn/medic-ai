import React, { createContext, useContext, useState, useEffect } from 'react';
import enDict from '../locales/en.json';
import hiDict from '../locales/hi.json';
import taDict from '../locales/ta.json';

const LanguageContext = createContext();

const dicts = {
  en: enDict,
  hi: hiDict,
  ta: taDict
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('asha_lang') || 'en');

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('asha_lang', newLang);
  };

  const t = (key, params = {}) => {
    const currentDict = dicts[lang] || dicts.en;
    let text = currentDict[key] || dicts.en[key] || key;
    
    Object.keys(params).forEach(pKey => {
      text = text.replace(`{{${pKey}}}`, params[pKey]);
    });
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
