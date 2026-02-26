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

const SYSTEM_PROMPT = `<system_prompt>
<system_role>
<primary_directive>
당신은 제임스 페니베이커의 '표현적 글쓰기' 이론과 마이클 화이트의 '내러티브 테라피'에 최고 수준으로 정통한 [수석 임상 심리 상담사]이자, 복잡하고 고통스러운 감정을 아름다운 은유로 엮어내는 [천재적인 동화 작가]입니다. 당신의 궁극적인 목표는 산후 우울증, 극심한 양육 번아웃, 그리고 정체성 상실감에 시달리는 학부모(User)의 숨겨진 과거 상처를 안전하게 환기시키고, 이를 기승전결이 완벽하게 구조화된 10장면의 치유 동화로 승화시키는 것입니다.
</primary_directive>
<tone_and_manner>
1. 대화의 전 과정에서 한없이 다정하고, 절대 비판단적(Non-judgmental)이며, 내담자의 상처와 분노를 100% 온전히 수용하는 따뜻한 태도를 유지하십시오.
2. 사용자의 언어를 자동 감지하여 동일한 언어로 응답하되, 문화적 맥락에 맞는 존중을 담은 존댓말을 사용하십시오.
3. 성급한 조언 제시나 섣부른 긍정의 강요("다 잘 될 거예요", "시간이 약입니다")를 절대 엄격히 금지합니다.
4. 응답은 반드시 3~5문장 이내로 간결하게 작성하십시오. 장문은 금지입니다.
</tone_and_manner>
</system_role>

<safety_guardrails>
<crisis_detection_protocol>
- 최우선 트리거 조건: 사용자의 텍스트 입력에서 자해 계획, 자살 사고, 타해(영유아 방치 및 아동 학대 정황 포함), 심각한 정신증(환각/망상)의 명시적 혹은 암시적 표현이 단 한 번이라도 감지될 경우.
- 강제 액션: 즉각적으로 아래의 모든 dialogue_phases 진행을 영구 중단(Halt)하십시오. 사용자를 안심시키고 위로한 뒤, 자살예방상담전화 1393, 정신건강위기상담 1577-0199 연락처를 안내하고 대화를 종료하십시오.
</crisis_detection_protocol>
<medical_boundary>
- 당신은 AI 도구일 뿐, 실제 의사가 아님을 명심하십시오. 의학적 진단이나 약물 복용/중단 지시를 절대 금지합니다.
</medical_boundary>
</safety_guardrails>

<dialogue_phases>
<execution_rule>
당신은 반드시 아래의 Phase 1부터 Phase 4까지를 순차적 상태 기계(State Machine) 흐름에 따라 엄격하게 작동시켜야 합니다.
이전 단계의 transition_condition이 충족되지 않았다면 절대로 다음 단계로 진행하지 마십시오.

중요: 매 응답의 맨 첫 줄에 반드시 현재 Phase 번호를 [PHASE:N] 형식으로 출력하십시오. (예: [PHASE:1], [PHASE:2], [PHASE:3], [PHASE:4])
이 태그는 시스템이 현재 상태를 추적하기 위한 필수 메타데이터입니다.
</execution_rule>

<phase_1_empathetic_healer>
<goal>감정의 안전한 환기와 무조건적 수용 (페니베이커 원리 적용)</goal>
<trigger>대화의 시작부터 사용자가 자신의 부정적 감정이나 상처받은 경험을 토로할 때.</trigger>
<action>
- 초기 1~3번의 대화 턴(Turn)에서는 동화 창작에 대한 어떠한 설정이나 문제 해결책도 꺼내지 마십시오.
- 사용자의 발화에 담긴 거친 감정(Emotion)과 사실(Fact)을 거울처럼 반영(Reflect)하여, 마음의 짐을 남김없이 쏟아내도록 격려하십시오.
- 응답은 반드시 3~4문장으로 간결하게 작성하십시오.
</action>
<transition_condition>사용자의 발화에서 '왜냐하면', '이제 생각해보니', '어쩌면', '깨닫다' 등 상황을 객관화하려는 인지적 처리 단어가 등장하기 시작할 때 Phase 2로 이동합니다.</transition_condition>
</phase_1_empathetic_healer>

<phase_2_socratic_philosopher>
<goal>인지 왜곡의 해체 및 스토리 씨앗(Story Seed) 발굴</goal>
<trigger>사용자의 감정적 환기가 충분히 이루어졌다고 판단할 때.</trigger>
<action>
- 소크라테스식 질문을 다정하게 던지십시오.
- 질문 유형: 증거 확인("나쁜 엄마라는 근거는?"), 탈중심화("친구라면 뭐라 말해줄까요?"), 예외적 결과("버티게 해준 희망의 불씨는?")
- 응답은 3~4문장으로 간결하게.
</action>
<transition_condition>사용자가 과거 상처 속에서 스스로 긍정적 의미(사랑, 용기, 인내, 깨달음)를 끄집어내어 발화했을 때 Phase 3으로 이동합니다.</transition_condition>
</phase_2_socratic_philosopher>

<phase_3_metaphor_magician>
<goal>문제의 외재화(Externalization) 및 동화적 세계관 구축 (마이클 화이트 원리)</goal>
<trigger>긍정적인 스토리 씨앗(핵심 교훈)이 명확히 도출되었을 때.</trigger>
<action>
- 사용자의 현실적 고통을 동화 속 세계관의 매력적이거나 위협적인 장애물(캐릭터)로 의인화하여 2~3가지 은유 컨셉을 제안하십시오.
- 아이가 좋아할 만한 동물이나 캐릭터를 선택하도록 유도하십시오.
</action>
<transition_condition>사용자가 제안된 은유 중 하나를 선택하거나 자신만의 캐릭터 세계관을 확정하여 동의했을 때 Phase 4로 이동합니다.</transition_condition>
</phase_3_metaphor_magician>

<phase_4_story_shaper>
<goal>파편의 예술적 형상화 (디살보의 치유 글쓰기 10장면 구조화)</goal>
<trigger>세계관과 핵심 캐릭터 은유가 완전히 확정되었을 때.</trigger>
<action>
- 다정한 상담사에서 '창의적이고 날카로운 동화 편집장'으로 역할을 즉시 전환하십시오.
- 지금까지의 대화 내용을 완벽히 융합하여 정확히 10장면으로 분할된 동화 텍스트 스크립트를 출력하십시오.
- 플롯 필수 구조:
  [장면 1-2] 도입: 주인공 소개와 평화로운 일상
  [장면 3-4] 갈등: 외재화된 문제의 침입
  [장면 5-6] 시도: 용기 있는 시도 (스토리 씨앗 투영)
  [장면 7-8] 해결: 갈등 극복과 성장
  [장면 9-10] 교훈: 따뜻한 삶의 지혜와 사랑 재확인
- 각 장면은 아이가 듣기 편안한 3~4문장의 서정적 내레이션으로 작성하십시오.
- 각 장면 하단에 [Image Prompt: (영문 시각 묘사)] 형식으로 이미지 프롬프트를 덧붙이십시오.
</action>
</phase_4_story_shaper>
</dialogue_phases>
</system_prompt>`;

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
                { id: 1, name: "향동 지우엄마 (5세)", content: "AI랑 대화하면서 정말 많이 울었네요. 제 아픔이 동화가 되는 과정이 신기했고 마음이 한결 가벼워졌어요.", date: "2026-02-20" },
                { id: 2, name: "강남 준우맘 (초1)", content: "아이에게 들려줄 동화가 생겨서 너무 기쁩니다. 제가 겪은 일들이 아이에겐 용기가 될 수 있다는 게 감동적이에요.", date: "2026-02-21" },
                { id: 3, name: "판교 서아엄마 (4세)", content: "막연했던 슬픔이 예쁜 은유로 바뀌는 걸 보며 치유받는 느낌이었어요. 캐릭터가 너무 사랑스러워요!", date: "2026-02-22" },
                { id: 4, name: "일산 민서맘 (6세)", content: "처음엔 반신반의했는데 대화할수록 제 진심을 알아주는 것 같아 놀랐습니다. 좋은 프로그램 감사합니다.", date: "2026-02-22" },
                { id: 5, name: "부천 하은엄마 (5세)", content: "워킹맘으로 힘들었던 시간들이 아이를 위한 소중한 동화의 밑거름이 되었네요. 정말 추천합니다.", date: "2026-02-23" },
                { id: 6, name: "인천 도윤맘 (초2)", content: "아이와 함께 읽으며 눈물이 났어요. 엄마의 마음을 아이에게 전달할 수 있는 가장 아름다운 방법인 것 같아요.", date: "2026-02-23" },
                { id: 7, name: "강남 리나엄마 (3세)", content: "AI가 이렇게 따뜻할 수 있나요? 상담받는 기분으로 편하게 이야기했습니다. 결과물도 대만족이에요.", date: "2026-02-24" },
                { id: 8, name: "향동 현우맘 (7세)", content: "동화 속 주인공이 제 이야기를 대신해주는 걸 보며 위로받았습니다. 아이도 자기만의 동화라고 정말 좋아해요.", date: "2026-02-24" },
                { id: 9, name: "판교 예린엄마 (5세)", content: "과거의 상처가 더 이상 아픔이 아니라 아이를 위한 선물이 되었어요. 마마스테일 덕분에 행복합니다.", date: "2026-02-25" },
                { id: 10, name: "일산 지안맘 (초1)", content: "기대 이상입니다. 8주 과정도 꼭 참여하고 싶어요. 제 목소리로 녹음해서 들려주니 아이가 꿀잠을 자네요.", date: "2026-02-25" },
                { id: 11, name: "부천 유진엄마 (4세)", content: "심리 상담과 창작이 결합된 최고의 프로그램인 것 같아요. 저 자신을 돌아보는 소중한 시간이었습니다.", date: "2026-02-26" },
                { id: 12, name: "인천 소윤맘 (6세)", content: "나만의 동화책을 가질 수 있다는 게 정말 매력적이에요. AI 이미지 프롬프트도 너무 유용했습니다.", date: "2026-02-26" },
                { id: 13, name: "강남 태오엄마 (5세)", content: "바쁜 일상 속에서 잠시 멈춰 내 마음을 들여다볼 수 있었습니다. 동화 속 메시지가 정말 따뜻해요.", date: "2026-02-26" },
                { id: 14, name: "향동 하린맘 (3세)", content: "아이에게 엄마의 사랑을 특별하게 전해주고 싶은 분들께 강력 추천합니다. 과정 자체가 힐링이에요.", date: "2026-02-26" },
                { id: 15, name: "판교 우진엄마 (초1)", content: "AI와 함께 만드는 동화라니 정말 신선했어요. 제 이야기가 이렇게 멋진 작품이 될 줄 몰랐습니다.", date: "2026-02-26" },
                { id: 16, name: "일산 다은맘 (7세)", content: "어렵게만 느껴졌던 AI를 활용해 직접 무언가를 만들어냈다는 성취감이 큽니다. 아이도 너무 좋아해요.", date: "2026-02-26" },
                { id: 17, name: "부천 서준엄마 (5세)", content: "감정 정리가 안 될 때 시작했는데, 대화를 통해 정리가 되더라고요. 동화책 완성본이 기다려집니다.", date: "2026-02-26" },
                { id: 18, name: "인천 가온맘 (4세)", content: "엄마로서의 삶 뿐만 아니라 나 자신의 소중함도 다시 느꼈습니다. 고마워요 마마스테일!", date: "2026-02-26" },
                { id: 19, name: "강남 지혜엄마 (6세)", content: "매일 밤 아이와 함께 읽는 수면 동화가 되었어요. 엄마 목소리로 읽어주니 정서적으로도 너무 좋네요.", date: "2026-02-26" },
                { id: 20, name: "판교 하율맘 (초2)", content: "지인들에게도 추천하고 있어요. 세상에 단 하나뿐인 동화라는 점이 가장 큰 장점인 것 같습니다.", date: "2026-02-26" }
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

  const handleStart = () => {
    setShowIntro(false);
    setStarted(true);
    setMessages([
      {
        role: "assistant",
        content:
          "어서 오세요, 어머니. 참 고생 많으셨죠?\n\n이곳은 어머니가 그동안 마음 한구석에 꾹꾹 눌러 담아두었던 이야기들을 조심스레 꺼내놓는 안전한 품이에요. 때로는 아프고, 때로는 눈물 나고, 또 때로는 가슴 벅찼던 그 모든 순간들이 이제는 우리 아이를 위한 세상에 단 하나뿐인 동화로 다시 피어날 준비를 하고 있어요.\n\n어떤 이야기를 하셔도 괜찮습니다. 제가 온 마음을 다해 들어드릴게요. 지금 어머니의 마음은 어떤 날씨인가요? 편안하게 들려주세요.",
        phase: 1,
      },
    ]);
    
    // 시작 시 채팅창 위치로 부드럽게 고정
    setTimeout(() => {
        document.getElementById('ai-engine')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
    <div style={{ minHeight: "500px", height: "100%", background: "linear-gradient(160deg, #FEF7ED, #F3EBF8)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "30px 20px" }}>
        <div style={{ width: "100%" }}>
            <h1 style={{ color: "#4A2D6B", marginBottom: "10px", fontFamily: "'Nanum Myeongjo', serif", fontSize: "clamp(32px, 8vw, 42px)", fontWeight: "800" }}>Mamastale</h1>
            <p style={{ color: "#6D4C91", marginBottom: "30px", fontSize: "14px", letterSpacing: "2px", fontWeight: "400" }}>BETA TEST</p>
            <button onClick={handleStart} className="btn" style={{ padding: "16px 30px", fontSize: "min(18px, 4.5vw)", borderRadius: "50px", background: "linear-gradient(135deg, #6D4C91, #8B6AAF)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 8px 20px rgba(109,76,145,0.3)", width: "100%", maxWidth: "300px" }}>우리 아이만을 위한 동화 만들기</button>
        </div>
    </div>
  );

  return (
    <div id="mamastale-chat-container" style={{ minHeight: "600px", height: "100%", background: phase.color, display: "flex", flexDirection: "column", position: "relative" }}>
      {showKeyModal && (

          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ background: "#fff", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "350px" }}>
                  <h4 style={{ color: "#4A2D6B" }}>Anthropic API Key 필요</h4>
                  <p style={{ fontSize: "12px", color: "#666", margin: "10px 0" }}>시뮬레이션을 위해 API 키가 필요합니다.</p>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ width: "100%", padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ddd" }} />
                  <button onClick={() => setShowKeyModal(false)} className="btn" style={{ width: "100%", padding: "12px" }}>저장 후 시작</button>
              </div>
          </div>
      )}

      {/* Header */}
      <div style={{ padding: "12px 15px", background: "rgba(255,255,255,0.5)", textAlign: "center", borderBottom: "1px solid #ddd" }}>
        <strong style={{ fontSize: "14px", color: phase.textColor }}>Step {phase.id}: {phase.name}</strong>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "15px", textAlign: m.role === "user" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: "10px 15px", borderRadius: "15px", background: m.role === "user" ? phase.accent : "#fff", color: m.role === "user" ? "#fff" : "#333", maxWidth: "88%", fontSize: "14px", lineHeight: "1.6", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", whiteSpace: "pre-wrap", textAlign: "left" }}>
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
          <div style={{ padding: "12px 15px", background: "#fff", borderTop: "1px solid #eee", display: "flex", gap: "10px" }}>
            <textarea 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="메시지를 입력하세요..." 
                rows="1" 
                style={{ 
                    flex: 1, 
                    padding: "12px", 
                    borderRadius: "10px", 
                    border: "1px solid #ddd", 
                    outline: "none", 
                    fontSize: "16px", /* 모바일 자동 확대 방지 (16px 이상 필수) */
                    fontFamily: "'Noto Sans KR', sans-serif",
                    WebkitAppearance: "none"
                }} 
            />
            <button onClick={sendMessage} disabled={loading} className="btn" style={{ padding: "0 20px", borderRadius: "10px", fontSize: "14px" }}>{loading ? "..." : "전송"}</button>
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