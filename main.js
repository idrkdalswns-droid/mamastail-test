const { useState, useRef, useEffect, useCallback } = React;

// --- Firebase Configuration ---
// TO DO: Replace with your own Firebase project configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase only if config is provided, else use a Mock system for testing
let db = null;
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
} catch (e) {
    console.warn("Firebase initialization failed. Using mock mode.", e);
}

// --- Constants ---
const PHASES = {
  1: { id: 1, name: "공감적 치유자", icon: "🫧", color: "#E6F5F1", accent: "#7FBFB0", textColor: "#3D6B5E", rule: "오직 공감과 반영만 수행합니다." },
  2: { id: 2, name: "소크라테스식 철학자", icon: "🔮", color: "#FEF7ED", accent: "#E07A5F", textColor: "#8B4513", rule: "비합리적 신념을 스스로 검증하게 유도합니다." },
  3: { id: 3, name: "은유의 마법사", icon: "✨", color: "#F3EBF8", accent: "#6D4C91", textColor: "#4A2D6B", rule: "고통을 동화 속 캐릭터로 대상화합니다." },
  4: { id: 4, name: "동화 편집장", icon: "📖", color: "#FFF8F0", accent: "#C4956A", textColor: "#6B4226", rule: "10장면의 완결된 작품으로 직조합니다." },
};

const SYSTEM_PROMPT = `[SYSTEM PROMPT - Same as provided before]`;

/* ─── Helpers ─── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const detectPhase = (text) => { const m = text.match(/\[PHASE:(\d)\]/); return m ? parseInt(m[1], 10) : null; };
const stripPhaseTag = (text) => text.replace(/\[PHASE:\d\]\s*/g, "").trim();

/* ─── Component: Feedback Wall ─── */
function FeedbackWall() {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            // Mock data for preview
            setComments([
                { id: 1, name: "지우엄마", content: "AI랑 대화하면서 정말 많이 울었네요. 제 아픔이 동화가 되는 과정이 신기했어요.", date: "2026-02-20" },
                { id: 2, name: "준우맘", content: "아이에게 들려줄 동화가 생겨서 너무 기쁩니다. 강력 추천해요!", date: "2026-02-21" }
            ]);
            setLoading(false);
            return;
        }

        const unsubscribe = db.collection("feedbacks")
            .orderBy("timestamp", "desc")
            .limit(20)
            .onSnapshot((snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setComments(fetched);
                setLoading(false);
            });
        
        return () => unsubscribe();
    }, []);

    if (loading) return <div style={{ textAlign: "center", padding: "40px" }}>불러오는 중...</div>;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {comments.map(c => (
                <div key={c.id} style={{
                    background: "#f9f6ff", padding: "24px", borderRadius: "20px",
                    border: "1px solid #eee", boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                }}>
                    <div style={{ fontWeight: "800", color: "#6D4C91", marginBottom: "8px" }}>{c.name} 님</div>
                    <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>{c.content}</p>
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "12px" }}>{c.date || "최근"}</div>
                </div>
            ))}
        </div>
    );
}

/* ─── Component: Mamastale Engine ─── */
function MamastaleEngine() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseHistory, setPhaseHistory] = useState([1]);
  const [started, setStarted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [...messages, { role: "user", content: userMsg }]
        }),
      });

      const data = await res.json();
      const rawText = data.content?.[0]?.text || "오류가 발생했습니다.";
      const detectedPhase = detectPhase(rawText);
      const cleanText = stripPhaseTag(rawText);

      if (detectedPhase && detectedPhase !== currentPhase) {
        setCurrentPhase(detectedPhase);
        setPhaseHistory(prev => prev.includes(detectedPhase) ? prev : [...prev, detectedPhase]);
      }

      setMessages(prev => [...prev, { role: "assistant", content: cleanText, phase: detectedPhase || currentPhase }]);
      
      // If phase 4 and contains scene 10, mark as finished
      if ((detectedPhase === 4 || currentPhase === 4) && cleanText.includes("장면 10")) {
          setIsFinished(true);
      }

    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "연결 실패: " + err.message }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, currentPhase, apiKey]);

  const submitFeedback = async () => {
      if (!feedbackName || !feedbackContent) return;
      
      const newFeedback = {
          name: feedbackName,
          content: feedbackContent,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          date: new Date().toLocaleDateString()
      };

      if (db) {
          await db.collection("feedbacks").add(newFeedback);
      } else {
          console.log("Mock Submit:", newFeedback);
      }
      
      setFeedbackSent(true);
  };

  const phase = PHASES[currentPhase];

  if (showIntro) return (
    <div style={{ height: "600px", background: "linear-gradient(160deg, #FEF7ED, #F3EBF8)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div>
            <h1 style={{ color: "#4A2D6B", marginBottom: "20px" }}>마마스테일 베타</h1>
            <button onClick={() => setShowIntro(false)} className="btn" style={{ padding: "15px 40px" }}>시작하기</button>
        </div>
    </div>
  );

  return (
    <div style={{ height: "600px", background: phase.color, display: "flex", flexDirection: "column" }}>
      {showKeyModal && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "#fff", padding: "30px", borderRadius: "20px" }}>
                  <h4>Anthropic API Key 필요</h4>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ width: "100%", padding: "10px", margin: "20px 0" }} />
                  <button onClick={() => setShowKeyModal(false)} className="btn" style={{ width: "100%" }}>저장</button>
              </div>
          </div>
      )}

      {/* Header */}
      <div style={{ padding: "15px", background: "rgba(255,255,255,0.5)", textAlign: "center", borderBottom: "1px solid #ddd" }}>
        <strong>Phase {phase.id}: {phase.name}</strong>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "15px", textAlign: m.role === "user" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: "12px 18px", borderRadius: "15px", background: m.role === "user" ? phase.accent : "#fff", color: m.role === "user" ? "#fff" : "#333", maxWidth: "85%", whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        
        {isFinished && !feedbackSent && (
            <div style={{ background: "#fff", padding: "25px", borderRadius: "20px", marginTop: "20px", border: "2px solid #6D4C91", animation: "fadeUp 0.5s" }}>
                <h3 style={{ color: "#6D4C91", marginBottom: "15px" }}>✨ 동화가 완성되었습니다!</h3>
                <p style={{ fontSize: "14px", marginBottom: "20px" }}>체험은 어떠셨나요? 아래 게시판에 한마디 남겨주시거나, 오픈채팅방에서 직접 의견을 들려주세요.</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                    <a href="https://open.kakao.com/o/gSSkFmii" target="_blank" className="btn btn-kakao" style={{ 
                        width: "100%", padding: "14px", textAlign: "center", textDecoration: "none",
                        background: "#FEE500", color: "#381E1F", borderRadius: "12px", fontWeight: "bold",
                        boxShadow: "0 4px 12px rgba(254, 229, 0, 0.3)"
                    }}>
                        <i className="fa-solid fa-comment" style={{ marginRight: "8px" }}></i> 오픈채팅에서 의견 남기기
                    </a>
                </div>

                <div style={{ borderTop: "1px solid #eee", paddingTop: "20px" }}>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>방명록 남기기 (선택사항)</p>
                    <input value={feedbackName} onChange={e => setFeedbackName(e.target.value)} placeholder="닉네임" style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #ddd" }} />
                    <textarea value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} placeholder="느낀 점을 남겨주세요." style={{ width: "100%", padding: "10px", height: "60px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ddd" }} />
                    <button onClick={submitFeedback} className="btn" style={{ width: "100%", padding: "12px" }}>방명록 등록하기</button>
                </div>
            </div>
        )}

        {feedbackSent && (
            <div style={{ textAlign: "center", padding: "20px", color: "#6D4C91" }}>
                <h4>🙏 소중한 의견 감사합니다!</h4>
                <p>아래 '함께 나누는 마음' 게시판에서 확인하실 수 있습니다.</p>
            </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {!isFinished && (
          <div style={{ padding: "15px", background: "#fff", borderTop: "1px solid #eee", display: "flex", gap: "10px" }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="메시지를 입력하세요..." rows="1" style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", outline: "none" }} />
            <button onClick={sendMessage} disabled={loading} className="btn" style={{ padding: "0 20px" }}>{loading ? "..." : "전송"}</button>
          </div>
      )}
    </div>
  );
}

// --- Render ---
const engineRoot = ReactDOM.createRoot(document.getElementById('engine-root'));
engineRoot.render(<MamastaleEngine />);

const commentsRoot = ReactDOM.createRoot(document.getElementById('comments-root'));
commentsRoot.render(<FeedbackWall />);
