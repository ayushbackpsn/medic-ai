import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function VoiceInputButton({ onResult, label = "Voice" }) {
  const [listening, setListening] = useState(false);
  const { lang, t } = useLanguage();

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const handleToggleListen = () => {
    if (!isSupported) {
      alert(t('voice_input_not_supported'));
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    recognition.lang = langMap[lang] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.start();
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200 cursor-not-allowed"
        title={t('voice_input_not_supported')}
      >
        <MicOff className="w-3.5 h-3.5" />
        <span>Voice (Unsupported)</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggleListen}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border transition duration-200 ${
        listening
          ? 'bg-red-600 text-white border-red-700 animate-pulse'
          : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
      }`}
    >
      <Mic className={`w-3.5 h-3.5 ${listening ? 'animate-bounce' : ''}`} />
      <span>{listening ? t('speak_now') : label}</span>
    </button>
  );
}
