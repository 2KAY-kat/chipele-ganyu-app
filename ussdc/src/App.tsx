import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/ussd';

interface ScreenState {
  text: string;
  isEnd: boolean;
}

function generateSessionId() {
  return 'sim-' + Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [sessionId, setSessionId] = useState(generateSessionId());
  const [phoneNumber] = useState('+265991234567');
  const [inputChain, setInputChain] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [hasDialed, setHasDialed] = useState(false);
  const [screen, setScreen] = useState<ScreenState>({
    text: 'Dial *123# to begin',
    isEnd: false,
  });
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ type: 'in' | 'out'; text: string }[]>([]);

  const sessionActive = hasDialed && !screen.isEnd;

  async function sendUSSD(text: string) {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ sessionId, phoneNumber, text }),
      });
      const raw = await res.text();
      const isEnd = raw.startsWith('END');
      const cleaned = raw.replace(/^CON |^END /, '');

      setScreen({ text: cleaned, isEnd });
      setLog((prev) => [
        ...prev,
        { type: 'in', text: text === '' ? '(dial *123#)' : text.split('*').pop() || '' },
        { type: 'out', text: cleaned },
      ]);
      if (isEnd) setHasDialed(false);
    } catch {
      setScreen({ text: 'Connection error.\nIs the backend running on :5001?', isEnd: true });
      setHasDialed(false);
    } finally {
      setLoading(false);
    }
  }

  function startSession() {
    const newId = generateSessionId();
    setSessionId(newId);
    setInputChain([]);
    setLog([]);
    setHasDialed(true);
    sendUSSD('');
  }

  function submitInput() {
    if (!currentInput.trim() || loading) return;
    const nextChain = [...inputChain, currentInput.trim()];
    setInputChain(nextChain);
    setCurrentInput('');
    sendUSSD(nextChain.join('*'));
  }

  function resetSession() {
    const newId = generateSessionId();
    setSessionId(newId);
    setInputChain([]);
    setCurrentInput('');
    setHasDialed(false);
    setScreen({ text: 'Dial *123# to begin', isEnd: false });
    setLog([]);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 gap-10 flex-wrap">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      </div>
      <div className="relative w-[300px] z-10">
        <div className="bg-gradient-to-b from-[#1a1d1a] to-[#0d0f0d] rounded-[3rem] p-3 shadow-2xl shadow-black/80 border border-[#2a2e2a]">
          {/* notch */}
          <div className="flex justify-center mb-2 pt-1">
            <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#1a1d1a] rounded-full" />
            </div>
          </div>
          <div className="bg-black rounded-[2rem] p-3">
            {/* status bar */}
            <div className="flex justify-between items-center px-2 py-2 text-[10px] text-[#8a938a] font-medium tracking-wide">
              <span>Chipeleganyu</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#7ED321] rounded-full animate-pulse shadow-[0_0_6px_#7ED321]" />
                Online
              </span>
            </div>
            <div className="bg-gradient-to-b from-[#0d1a0a] to-[#0a140a] rounded-2xl p-4 min-h-[320px] border border-[#1c2e18] shadow-inner shadow-black/60">
              <pre className="font-mono text-[13px] leading-relaxed text-[#7ED321] whitespace-pre-wrap break-words">
                {loading ? (
                  <span className="text-[#7ED321]/60 animate-pulse">Connecting...</span>
                ) : (
                  screen.text
                )}
              </pre>
            </div>

            <div className="mt-3 space-y-2 px-1 pb-1">
              {!sessionActive ? (
                <button
                  onClick={startSession}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-accent active:scale-[0.98] text-background font-bold py-3.5 rounded-2xl transition disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {screen.isEnd ? 'Dial *123# Again' : 'Dial *123#'}
                </button>
              ) : (
                <>
                  <input
                    autoFocus
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitInput()}
                    placeholder="Type your response..."
                    className="w-full bg-[#111411] text-white text-sm px-4 py-3 rounded-2xl outline-none border border-[#2a2e2a] focus:border-[#7ED321] transition placeholder:text-[#5a625a]"
                    disabled={loading}
                  />
                  <button
                    onClick={submitInput}
                    disabled={loading || !currentInput.trim()}
                    className="w-full bg-primary hover:bg-accent active:scale-[0.98] text-background font-bold py-3.5 rounded-2xl transition disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    Send
                  </button>
                </>
              )}
              <button
                onClick={resetSession}
                className="w-full bg-secondary/10 hover:bg-secondary/20 active:scale-[0.98] text-secondary text-sm py-2.5 rounded-2xl transition border border-secondary/30"
              >
                Reset Session
              </button>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <div className="w-24 h-1 bg-[#2a2e2a] rounded-full" />
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-primary font-mono">
          {sessionId} · {phoneNumber}
        </div>
      </div>
      
<div className="w-[380px] z-10">
        <div className="bg-background/90 backdrop-blur rounded-3xl border border-secondary/20 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-secondary/20 flex items-center justify-between bg-secondary/10">
            <span className="text-text font-semibold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_theme(colors.primary)]" />
              Session Log
            </span>
            <span className="text-secondary text-xs font-mono">{log.length} events</span>
          </div>
          <div className="p-4 max-h-[560px] overflow-y-auto space-y-3 text-xs font-mono">
            {log.length === 0 && (
              <div className="text-secondary italic px-1 py-8 text-center">
                No activity yet — dial to begin.
              </div>
            )}
            {log.map((entry, i) =>
              entry.type === 'in' ? (
                <div key={i} className="text-primary px-1 font-semibold">
                  <span className="text-secondary">→ </span>
                  {entry.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="text-text whitespace-pre-wrap bg-secondary/10 rounded-xl px-3.5 py-2.5 border border-secondary/20"
                >
                  {entry.text}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
