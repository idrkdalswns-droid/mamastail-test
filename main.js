const { useState, useRef, useEffect, useCallback } = React;

// --- MVP 시나리오 데이터 ---
const SCENARIO = {
    1: [
        "어머니, 오늘 하루도 정말 애쓰셨어요. 아이를 돌보다 보면 정작 나 자신의 마음은 돌볼 틈이 없죠. 오늘 어머니의 마음 날씨는 어떤가요? 아주 작은 감정도 괜찮으니 편안하게 들려주세요.",
        "그랬군요... 듣기만 해도 어머니의 정성이 느껴져서 마음이 뭉클해져요. 사실 엄마라는 자리가 세상에서 가장 빛나지만, 때로는 가장 고독하기도 하죠. 요즘 가장 마음이 쓰이는 기억이나 순간이 있으신가요?",
        "말씀해 주셔서 감사해요. 그 귀한 이야기들이 이제 아이를 위한 멋진 선물이 될 거예요. 이제 이 아픔을 예쁜 보석으로 바꿔보는 두 번째 여정을 시작해볼까요?"
    ],
    2: [
        "어머니의 이야기 속에서 저는 아주 특별한 '용기'를 발견했어요. 아이가 나중에 커서 어머니의 이 마음을 알게 된다면 얼마나 든든할까요? 만약 이 이야기를 동화로 만든다면, 어머니를 닮은 주인공은 어떤 모습일까요? (예: 작고 단단한 씨앗, 길을 잃지 않는 별 등)",
        "정말 아름다운 모습이네요! 그 주인공이 역경을 이겨내고 아이에게 전해주고 싶은 단 하나의 메시지는 무엇인가요?"
    ],
    3: [
        "세상에... 정말 눈부신 메시지에요. 이제 제가 마법의 붓을 들어 어머니의 삶을 동화 속 세계관으로 옮겨볼게요. 신비로운 숲, 반짝이는 바다, 혹은 구름 위 마을 중 어디가 좋을까요?",
        "좋습니다. 어머니의 진심과 제가 고른 은유들이 만나 이제 세상에 없던 동화가 만들어지고 있어요. 잠시만 기다려 주세요..."
    ]
};

// --- Constants ---
const PHASES = {
  1: { id: 1, name: "첫 번째 여정: 마음 마주하기", icon: "🫧", color: "#E6F5F1", accent: "#7FBFB0", textColor: "#3D6B5E" },
  2: { id: 2, name: "두 번째 여정: 보석 찾기", icon: "🔮", color: "#FEF7ED", accent: "#E07A5F", textColor: "#8B4513" },
  3: { id: 3, name: "세 번째 여정: 마법의 붓", icon: "✨", color: "#F3EBF8", accent: "#6D4C91", textColor: "#4A2D6B" },
  4: { id: 4, name: "마지막 여정: 선물 같은 동화", icon: "📖", color: "#FFF8F0", accent: "#C4956A", textColor: "#6B4226" },
};

/* ─── Helpers ─── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── Component: Mamastale Engine (MVP) ─── */
function MamastaleEngine() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [turn, setTurn] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [showNotice, setShowNotice] = useState(false); // 양해 팝업 상태
  const [pendingMsg, setPendingMsg] = useState("");

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 스크롤 제어: 메시지 추가 시 하단으로만 부드럽게 (전체 화면 흔들림 방지)
  useEffect(() => { 
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleStart = () => {
    setShowIntro(false);
    setLoading(true);
    setTimeout(() => {
        setMessages([{ role: "assistant", content: SCENARIO[1][0], phase: 1 }]);
        setLoading(false);
    }, 1000);
  };

  const processMessage = async (msg) => {
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    await sleep(1200); 

    let nextContent = "";
    let nextPhase = currentPhase;
    let nextTurn = turn + 1;

    if (currentPhase === 1) {
        if (turn === 0) nextContent = SCENARIO[1][1];
        else if (turn === 1) { nextContent = SCENARIO[1][2]; nextPhase = 2; nextTurn = 0; }
    } else if (currentPhase === 2) {
        if (turn === 0) nextContent = SCENARIO[2][0];
        else if (turn === 1) { nextContent = SCENARIO[2][1]; nextPhase = 3; nextTurn = 0; }
    } else if (currentPhase === 3) {
        if (turn === 0) nextContent = SCENARIO[3][0];
        else if (turn === 1) { 
            nextContent = "어머니, 드디어 우리 아이를 위한 10장면의 동화가 완성되었습니다!\n\n[장면 1] 옛날 아주 먼 곳에, 어머니를 닮은 따뜻한 별이 살고 있었어요...\n(중략)\n[장면 10] 그렇게 별은 아이의 밤하늘을 영원히 지켜주는 가장 밝은 빛이 되었답니다.\n\n이 동화가 어머니와 아이에게 작은 위로가 되길 바랍니다.";
            nextPhase = 4;
            setIsFinished(true);
        }
    }

    setMessages(prev => [...prev, { role: "assistant", content: nextContent, phase: nextPhase }]);
    setCurrentPhase(nextPhase);
    setTurn(nextTurn);
    setLoading(false);
  };

  const sendMessage = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");

    // 첫 메시지 전송 시 팝업 띄우기
    if (turn === 0 && currentPhase === 1 && messages.length === 1) {
        setPendingMsg(msg);
        setShowNotice(true);
    } else {
        processMessage(msg);
    }
  };

  const phase = PHASES[currentPhase];

  if (showIntro) return (
    <div style={{ minHeight: "500px", height: "100%", background: "linear-gradient(160deg, #FEF7ED, #F3EBF8)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%" }}>
            <h1 style={{ color: "#4A2D6B", marginBottom: "15px", fontFamily: "'Nanum Myeongjo', serif", fontSize: "clamp(42px, 10vw, 56px)", fontWeight: "900" }}>Mamastale</h1>
            <p style={{ color: "#6D4C91", marginBottom: "40px", fontSize: "15px", letterSpacing: "3px", fontWeight: "600" }}>MVP FREE TEST</p>
            <button onClick={handleStart} className="btn" style={{ padding: "20px 40px", width: "100%", maxWidth: "320px", background: "linear-gradient(135deg, #6D4C91, #8B6AAF)", color: "#fff", border: "none", fontSize: "17px" }}>우리 아이만을 위한 동화 만들기</button>
        </div>
    </div>
  );

  return (
    <div style={{ height: "650px", background: phase.color, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      
      {/* 양해 팝업 */}
      {showNotice && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
              <div style={{ background: "#fff", padding: "30px", borderRadius: "28px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", maxWidth: "340px", animation: "fadeUp 0.4s" }}>
                  <div style={{ fontSize: "40px", marginBottom: "15px" }}>🎁</div>
                  <h4 style={{ color: "#4A2D6B", marginBottom: "12px", fontWeight: "800" }}>무료 체험판 안내</h4>
                  <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.6", marginBottom: "25px" }}>
                      어머니, 본 버전은 <strong style={{color: "#6D4C91"}}>무료 체험판</strong>입니다. <br/><br/>
                      답변이 조금 짧거나 여정이 빠르게 진행될 수 있는 점 양해 부탁드려요. 곧 정식 버전에서 더 깊은 이야기를 나누실 수 있습니다!
                  </p>
                  <button onClick={() => { setShowNotice(false); processMessage(pendingMsg); }} className="btn" style={{ width: "100%", padding: "14px", background: "#6D4C91", color: "#fff" }}>확인했어요</button>
              </div>
          </div>
      )}

      <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.03)", zIndex: 10 }}>
        <strong style={{ fontSize: "14px", color: phase.textColor, letterSpacing: "1px", fontWeight: "800" }}>{phase.name}</strong>
      </div>

      {/* Messages: Ref 컨테이너 추가 및 스크롤 고정 */}
      <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "20px", WebkitOverflowScrolling: "touch" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "18px", textAlign: m.role === "user" ? "right" : "left" }}>
            <div className="chat-bubble" style={{ 
                display: "inline-block", padding: "14px 20px", borderRadius: m.role === "user" ? "24px 24px 4px 24px" : "24px 24px 24px 4px", 
                background: m.role === "user" ? "linear-gradient(135deg, #6D4C91, #8B6AAF)" : "rgba(255,255,255,0.95)", 
                color: m.role === "user" ? "#fff" : "#444", fontSize: "15px", lineHeight: "1.7", textAlign: "left"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ padding: "10px 20px", color: phase.textColor, opacity: 0.7, fontSize: "13px", fontStyle: "italic" }}>엄마의 진심을 동화로 엮는 중이에요...</div>}
        
        {isFinished && (
            <div style={{ background: "#fff", padding: "25px", borderRadius: "20px", marginTop: "20px", border: "2px solid #6D4C91", textAlign: "center" }}>
                <h3 style={{ color: "#6D4C91", marginBottom: "15px" }}>✨ 동화가 완성되었습니다!</h3>
                <p style={{ fontSize: "14px", marginBottom: "20px" }}>이 따뜻한 여정을 오픈채팅에서 함께 나눠주세요.</p>
                <a href="https://open.kakao.com/o/gSSkFmii" target="_blank" className="btn btn-kakao" style={{ width: "100%", padding: "14px", marginBottom: "10px" }}>오픈채팅에서 소감 나누기</a>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isFinished && (
          <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.8)", borderTop: "1px solid #eee", display: "flex", gap: "12px", zIndex: 10 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); sendMessage();}}} placeholder="이야기를 들려주세요..." rows="1" style={{ flex: 1, padding: "14px 18px", borderRadius: "16px", border: "1px solid #ddd", outline: "none", fontSize: "16px" }} />
            <button onClick={sendMessage} disabled={loading} className="btn" style={{ width: "50px", height: "50px", padding: 0, background: phase.accent, color: "#fff" }}>↑</button>
          </div>
      )}
    </div>
  );
}

// --- Render ---
const engineRoot = ReactDOM.createRoot(document.getElementById('engine-root'));
engineRoot.render(<MamastaleEngine />);

function FeedbackWall() {
    const [comments] = useState([
        { id: 1, name: "향동 지우엄마 (5세)", content: "AI랑 대화하면서 정말 많이 울었네요. 제 아픔이 동화가 되는 과정이 신기했고 마음이 한결 가벼워졌어요.", date: "2026-02-20" },
        { id: 2, name: "강남 준우맘 (초1)", content: "아이에게 들려줄 동화가 생겨서 너무 기쁩니다. 제가 겪은 일들이 아이에겐 용기가 될 수 있다는 게 감동적이에요.", date: "2026-02-21" },
        { id: 3, name: "판교 서아엄마 (4세)", content: "막연했던 슬픔이 예쁜 은유로 바뀌는 걸 보며 치유받는 느낌이었어요. 캐릭터가 너무 사랑스러워요!", date: "2026-02-22" },
        { id: 4, name: "일산 민서맘 (6세)", content: "처음엔 반신반의했는데 대화할수록 제 진심을 알아주는 것 같아 놀랐습니다.", date: "2026-02-22" },
        { id: 5, name: "부천 하은엄마 (5세)", content: "워킹맘으로 힘들었던 시간들이 아이를 위한 소중한 동화의 밑거름이 되었네요.", date: "2026-02-23" }
    ]);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {comments.map(c => (
                <div key={c.id} style={{ background: "#fdfbff", padding: "28px", borderRadius: "28px", border: "1px solid rgba(109,76,145,0.05)" }}>
                    <div style={{ fontWeight: "800", color: "#6D4C91", marginBottom: "10px" }}>{c.name} 님</div>
                    <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.7" }}>{c.content}</p>
                    <div style={{ fontSize: "12px", color: "#bbb", marginTop: "15px" }}>{c.date}</div>
                </div>
            ))}
        </div>
    );
}

const commentsRoot = ReactDOM.createRoot(document.getElementById('comments-root'));
commentsRoot.render(<FeedbackWall />);
