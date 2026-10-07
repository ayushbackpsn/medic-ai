import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, MicOff, Volume2, X, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function VoiceBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I am the ASHA Voice Health Assistant. You can speak or type symptoms, vitals, or medical questions in English, Hindi, or Tamil.'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

  const { lang, t } = useLanguage();
  const isSpeechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const isTtsSupported = 'speechSynthesis' in window;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const speakText = (text) => {
    if (!isTtsSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    utterance.lang = langMap[lang] || 'en-IN';
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStartListening = () => {
    if (!isSpeechSupported) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
    recognition.lang = langMap[lang] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleSendMessage(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleSendMessage = (textToSend = inputQuery) => {
    const query = textToSend.trim();
    if (!query) return;

    // Add user message
    const newMsgs = [...messages, { sender: 'user', text: query }];
    setMessages(newMsgs);
    setInputQuery('');

    // Generate Bot Response
    setTimeout(() => {
      const reply = processHealthQuery(query, lang);
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
      speakText(reply);
    }, 400);
  };

  const processHealthQuery = (query, currentLang) => {
    const q = query.toLowerCase();

    if (q.includes('fever') || q.includes('bukhar') || q.includes('காய்ச்சல்')) {
      return "If patient has fever: Check temperature and SpO2 immediately. If temperature > 38.5°C or accompanied by stiff neck, chest pain, or breathlessness, create a HIGH risk referral.";
    }
    if (q.includes('chest pain') || q.includes('chhati me dard') || q.includes('நெஞ்சு வலி')) {
      return "CRITICAL ALERT: Chest pain requires immediate emergency evaluation! Record BP and heart rate, keep patient seated comfortably, and prepare immediate referral to PHC emergency unit.";
    }
    if (q.includes('bp') || q.includes('blood pressure') || q.includes('बीपी')) {
      return "Normal Blood Pressure is around 120/80 mmHg. Systolic BP > 140 mmHg is High BP. Systolic BP > 180 mmHg or Diastolic > 110 mmHg indicates Hypertensive Emergency.";
    }
    if (q.includes('oxygen') || q.includes('spo2')) {
      return "Normal SpO2 is 95% to 100%. SpO2 below 94% indicates hypoxemia (low oxygen). SpO2 below 90% is a CRITICAL emergency needing oxygen therapy.";
    }
    if (q.includes('referral') || q.includes('phc')) {
      return "For HIGH and CRITICAL risk cases, create a referral to Rampur PHC. The PHC staff will review patient details, vitals, and update status to Accepted/In Treatment.";
    }
    if (q.includes('hello') || q.includes('namaste') || q.includes('hi')) {
      return "Namaste! How can I assist you with patient vitals, symptom checks, or rural health triage today?";
    }

    return "Thank you for the update. Please ensure patient vitals (BP, SpO2, Heart Rate, Temp) and symptoms are recorded in the 6-step registration form for exact AI triage assessment.";
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white focus:outline-none transition-all duration-300 transform hover:scale-105"
        title="ASHA Voice Bot"
      >
        <Bot className="w-7 h-7 animate-pulse" />
        <span className="hidden md:inline font-bold text-sm">ASHA Voice Assistant</span>
      </button>

      {/* Bot Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:right-6 z-50 w-[92vw] md:w-[420px] h-[520px] bg-white rounded-2xl shadow-2xl border border-sky-100 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-sky-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  ASHA Voice Assistant
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                </h3>
                <p className="text-xs text-sky-100">Speech-to-Text & Triage Helper</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3.5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white rounded-br-none font-medium'
                      : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Status Indicator */}
          {isSpeaking && (
            <div className="bg-sky-50 px-4 py-1.5 text-xs text-sky-700 font-semibold flex items-center gap-2 border-t border-sky-100">
              <Volume2 className="w-4 h-4 animate-bounce text-sky-600" />
              <span>Speaking response...</span>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartListening}
              className={`p-3 rounded-xl border transition ${
                isListening
                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                  : 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100'
              }`}
              title={isListening ? "Listening..." : "Click to Speak"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? t('speak_now') : "Type or speak symptoms/questions..."}
              className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
