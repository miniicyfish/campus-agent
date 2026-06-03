"use client";

import { Camera, ChevronRight, Home as HomeIcon, Map, MessageCircle, Navigation, Route, Send, Sparkles } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, CampusRoute, GuideScript, Profile, RouteMatch, Spot } from "@/lib/types";

type Bootstrap = {
  spots: Spot[];
  routes: CampusRoute[];
  agents: Omit<Agent, "body">[];
};

type ChatMessage = {
  role: "agent" | "user";
  text: string;
};

const mapPositions: Record<string, { x: number; y: number; icon: string }> = {
  fudan_main_gate: { x: 48, y: 91, icon: "gate_main.png" },
  mao_statue: { x: 47, y: 78, icon: "sculpture_mao.png" },
  fudan_old_gate: { x: 10, y: 74, icon: "gate_old.png" },
  xianghui_hall: { x: 33, y: 61, icon: "hall_xianghui.png" },
  fudan_zibin_hall: { x: 30, y: 51, icon: "hall_zibin.png" },
  fudan_guanghua_tower: { x: 66, y: 46, icon: "teachingbuilding_guanghua.png" },
  fudan_science_library: { x: 43, y: 42, icon: "liberary_science.png" },
  fudan_third_teaching_building: { x: 54, y: 54, icon: "teachingbuilding_3.png" },
  fourth_teaching_building: { x: 78, y: 65, icon: "teachingbuilding_4.png" },
  fudan_history_museum: { x: 20, y: 28, icon: "hall_history.png" },
  guanghua_lawn: { x: 60, y: 56, icon: "grass_guang.png" },
  danyuan_canteen: { x: 82, y: 30, icon: "danyuan_canteen.png" },
  fudan_xiyuan: { x: 36, y: 85, icon: "paper1.png" },
  fudan_yanyuan: { x: 8, y: 13, icon: "note1.png" },
};

const profileOptions = {
  identities: ["高中生", "访客", "校友", "家长", "在校生"],
  interests: ["校史", "建筑", "校园生活", "打卡", "自然景观", "人文"],
  durations: [30, 60],
  styles: ["轻松", "严谨", "亲切", "自然"],
};

export default function Home() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [step, setStep] = useState<"home" | "profile" | "agent" | "mode" | "map">("home");
  const [tourMode, setTourMode] = useState<"guided" | "free">("guided");
  const [profile, setProfile] = useState<Profile>({
    firstVisit: true,
    age: "",
    identity: "高中生",
    interests: ["校园生活", "打卡"],
    durationMinutes: 30,
    style: "轻松",
    intro: "",
  });
  const [match, setMatch] = useState<RouteMatch | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeGuide, setActiveGuide] = useState<GuideScript | null>(null);
  const [guideSheet, setGuideSheet] = useState<"peek" | "open" | "full">("peek");
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [visualContext, setVisualContext] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "agent", text: "你可以问我当前点位、下一站、拍照对象或者讲解风格。" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetDragRef = useRef<{ y: number; moved: boolean } | null>(null);
  const mapDragRef = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((response) => response.json())
      .then(setBootstrap);
  }, []);

  useEffect(() => {
    if (!bootstrap || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    if (!["map", "peek", "free"].includes(demo ?? "") || match) return;

    if (demo === "free") {
      setStep("map");
      setTourMode("free");
      setGuideSheet("peek");
      return;
    }

    fetch("/api/match-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
      .then((response) => response.json())
      .then((result: RouteMatch) => {
        setMatch(result);
        setStep("map");
        setTourMode("guided");
        setGuideSheet(demo === "peek" ? "peek" : "open");
      });
  }, [bootstrap, match, profile]);

  const agent = useMemo(() => bootstrap?.agents.find((item) => item.agent_id === "student_guide") ?? bootstrap?.agents[0], [bootstrap]);
  const route = match?.route;
  const guidedSpots = useMemo(
    () =>
      route?.stops
        .map((stop) => bootstrap?.spots.find((spot) => spot.spot_id === stop.spot_id))
        .filter((spot): spot is Spot => Boolean(spot)) ?? [],
    [bootstrap?.spots, route?.stops],
  );
  const freeSpots = useMemo(() => bootstrap?.spots.filter((spot) => mapPositions[spot.spot_id]) ?? [], [bootstrap?.spots]);
  const visibleSpots = tourMode === "free" ? freeSpots : guidedSpots;
  const activeStop = tourMode === "guided" ? route?.stops[activeIndex] : undefined;
  const activeSpot = visibleSpots[activeIndex] ?? visibleSpots[0];

  useEffect(() => {
    if (!activeSpot) return;
    const routeId = tourMode === "guided" ? route?.route_id ?? "" : "";
    fetch(`/api/guide?spotId=${activeSpot.spot_id}&routeId=${routeId}&agentId=${agent?.agent_id ?? ""}`)
      .then((response) => response.json())
      .then((payload) => setActiveGuide(payload.script));
  }, [activeSpot, agent?.agent_id, route?.route_id, tourMode]);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    matchProfile();
  }

  async function matchProfile() {
    if (profilePending) return;
    setProfilePending(true);
    try {
      const response = await fetch("/api/match-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = (await response.json()) as RouteMatch;
      setMatch(result);
      setStep("agent");
    } finally {
      setProfilePending(false);
    }
  }

  async function sendMessage(text = chatInput) {
    const trimmed = text.trim();
    if (!trimmed || !activeSpot || chatPending) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setChatInput("");
    setChatPending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        message: trimmed,
        spotId: activeSpot.spot_id,
        routeId: tourMode === "guided" ? route?.route_id : undefined,
        agentId: agent?.agent_id,
        visualContext,
      }),
    });
      const payload = await response.json();
      setMessages((current) => [...current, { role: "agent", text: payload.answer ?? "小A刚刚没有拿到完整回答，可以再问我一次。" }]);
    } catch {
      setMessages((current) => [...current, { role: "agent", text: "小A连接模型时出了点问题，可以稍后再试。" }]);
    } finally {
      setChatPending(false);
    }
  }

  async function submitPhoto(file?: File) {
    if (!activeSpot || !file) return;
    const formData = new FormData();
    formData.set("photo", file);
    formData.set("spotId", activeSpot.spot_id);
    formData.set("routeId", tourMode === "guided" ? route?.route_id ?? "" : "");
    setDrawerOpen(true);
    setMessages((current) => [...current, { role: "user", text: "我拍了一张照片，帮我看看。" }]);
    setChatPending(true);
    try {
      const response = await fetch("/api/photo", { method: "POST", body: formData });
      const payload = await response.json();
      const answer = payload.answer ?? "小A没有识别出这张图，可以换一张更清楚的照片。";
      setVisualContext(`最近一次图片理解结果：${answer}`);
      setMessages((current) => [...current, { role: "agent", text: answer }]);
    } catch {
      setMessages((current) => [...current, { role: "agent", text: "图片理解接口暂时没有返回，可以稍后再试。" }]);
    } finally {
      setChatPending(false);
    }
  }

  function toggleInterest(interest: string) {
    setProfile((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  function collapseGuideSheet() {
    if (guideSheet !== "peek") setGuideSheet("peek");
  }

  function beginSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    sheetDragRef.current = { y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = sheetDragRef.current;
    if (!drag) return;
    const delta = event.clientY - drag.y;
    if (Math.abs(delta) < 28) return;
    drag.moved = true;
    if (delta < 0) {
      setGuideSheet((current) => (current === "peek" ? "open" : "full"));
    } else {
      setGuideSheet((current) => (current === "full" ? "open" : "peek"));
    }
    drag.y = event.clientY;
  }

  function endSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = sheetDragRef.current;
    sheetDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag?.moved) {
      setGuideSheet((current) => (current === "peek" ? "open" : "peek"));
    }
  }

  function beginMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".map-marker")) return;
    mapDragRef.current = { x: event.clientX, y: event.clientY, startX: mapPan.x, startY: mapPan.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = mapDragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    setMapPan({
      x: Math.max(-90, Math.min(90, drag.startX + dx)),
      y: Math.max(-140, Math.min(90, drag.startY + dy)),
    });
  }

  function endMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mapDragRef.current) return;
    const moved = mapDragRef.current.moved;
    mapDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved) collapseGuideSheet();
  }

  function enterGuidedMode() {
    setTourMode("guided");
    setActiveIndex(0);
    setMapPan({ x: 0, y: 0 });
    setGuideSheet("peek");
    setVisualContext(null);
    setStep("map");
  }

  function enterFreeMode() {
    setTourMode("free");
    setActiveIndex(0);
    setMapPan({ x: 0, y: 0 });
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("map");
  }

  function startGuideSetup() {
    setTourMode("guided");
    setActiveIndex(0);
    setMapPan({ x: 0, y: 0 });
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("profile");
  }

  function returnHome() {
    setActiveIndex(0);
    setMapPan({ x: 0, y: 0 });
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("home");
  }

  if (!bootstrap) {
    return (
      <main className="app-shell">
        <section className="phone-frame loading-screen">正在整理校园内容包...</section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section
        className={`phone-frame ${
          step === "home" ? "home-screen" : step === "profile" ? "profile-screen" : step === "agent" || step === "mode" ? "agent-screen" : "map-screen"
        }`}
      >
        {step === "home" && (
          <div className="home-entry">
            <div className="home-hero">
              <p>FUDAN CAMPUS AGENT</p>
              <h1>今天想怎么逛复旦？</h1>
            </div>
            <div className="home-actions">
              <button type="button" className="home-card primary" onClick={enterFreeMode}>
                <strong>自由参观</strong>
                <span>不用填写资料，直接进入校园地图。点开任意坐标，就能查看这里的介绍和追问。</span>
              </button>
              <button type="button" className="home-card" onClick={startGuideSetup}>
                <strong>让小A带路</strong>
                <span>回答几个问题，系统会匹配路线、导览员和讲解风格，适合第一次来或想省心游览。</span>
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <form className="paper-form" onSubmit={submitProfile}>
            <div className="profile-heading">
              <p>导览模式</p>
              <h1>先让小A了解你一下</h1>
            </div>
            <div className="torn-paper">
              <label className="check-row">
                <span>你是第一次来复旦大学吗？</span>
                <button type="button" className={profile.firstVisit ? "selected" : ""} onClick={() => setProfile({ ...profile, firstVisit: true })}>
                  是的
                </button>
                <button type="button" className={!profile.firstVisit ? "selected" : ""} onClick={() => setProfile({ ...profile, firstVisit: false })}>
                  不是
                </button>
              </label>
              <label>
                <span>你的年龄</span>
                <input value={profile.age} onChange={(event) => setProfile({ ...profile, age: event.target.value })} placeholder="例如 18 / 32" />
              </label>
              <div>
                <span>来复旦校园，你的主要目的是</span>
                <div className="chip-grid">
                  {profileOptions.identities.map((identity) => (
                    <button
                      key={identity}
                      type="button"
                      className={profile.identity === identity ? "selected" : ""}
                      onClick={() => setProfile({ ...profile, identity })}
                    >
                      {identity}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span>这次想重点看什么</span>
                <div className="chip-grid">
                  {profileOptions.interests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      className={profile.interests.includes(interest) ? "selected" : ""}
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
              <div className="two-col">
                <label>
                  <span>时间</span>
                  <select value={profile.durationMinutes} onChange={(event) => setProfile({ ...profile, durationMinutes: Number(event.target.value) })}>
                    {profileOptions.durations.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} 分钟
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>风格</span>
                  <select value={profile.style} onChange={(event) => setProfile({ ...profile, style: event.target.value })}>
                    {profileOptions.styles.map((style) => (
                      <option key={style}>{style}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>介绍一下你自己吧</span>
                <textarea value={profile.intro} onChange={(event) => setProfile({ ...profile, intro: event.target.value })} />
              </label>
            </div>
            <p className="profile-note">我们将根据你的输入匹配路线和讲解方式</p>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={returnHome}>
                返回首页
              </button>
              <button className="primary-button" type="button" disabled={profilePending} onClick={matchProfile}>
                {profilePending ? "匹配中" : "继续"} <ChevronRight size={22} />
              </button>
            </div>
          </form>
        )}

        {step === "agent" && route && (
          <div className="agent-confirm">
            <div className="tower-hero" />
            <p>经激烈讨论</p>
            <h1>本次带你一起逛校园的是：</h1>
            <img className="avatar-large" src="/assets/character-little-a.png" alt="" />
            <h2>{agent?.name ?? "校史馆小A"}</h2>
            <p className="muted">{match?.reason}</p>
            <div className="route-card">
              <strong>{route.name}</strong>
              <span>{route.description}</span>
              <em>{route.duration_minutes} 分钟 · {route.stops.length} 站</em>
            </div>
            <button className="primary-button oversized" type="button" onClick={() => setStep("mode")}>
              开始游览
            </button>
          </div>
        )}

        {step === "mode" && route && (
          <div className="mode-select">
            <div className="mode-hero" />
            <p>路线已经准备好</p>
            <h1>{route.name}</h1>
            <div className="mode-options">
              <button type="button" onClick={enterGuidedMode}>
                <strong>开始导览</strong>
                <span>按推荐路线走，到站后拉起讲解和追问。</span>
              </button>
              <button type="button" onClick={enterFreeMode}>
                <strong>改为自由参观</strong>
                <span>跳过路线，只看地图，点哪个坐标就打开哪个点位介绍。</span>
              </button>
            </div>
            <button className="secondary-button" type="button" onClick={() => setStep("agent")}>
              返回
            </button>
          </div>
        )}

        {step === "map" && activeSpot && (
          <>
            <div className="top-hud">
              <button type="button" className="hud-action" onClick={returnHome} aria-label={tourMode === "free" ? "返回首页" : "结束导览并返回首页"}>
                <HomeIcon size={17} />
                <span>{tourMode === "free" ? "首页" : "结束"}</span>
              </button>
              <button
                type="button"
                className="hud-action mode-switch"
                onClick={tourMode === "free" ? startGuideSetup : enterFreeMode}
                aria-label={tourMode === "free" ? "进入导览模式" : "切换到自由探索"}
              >
                {tourMode === "free" ? <Route size={17} /> : <Map size={17} />}
                <span>{tourMode === "free" ? "开启导览" : "自由探索"}</span>
              </button>
              <button type="button" className="arrival-pill" onClick={() => setGuideSheet("open")}>
                {tourMode === "free" ? activeSpot.name : guideSheet !== "peek" ? `${activeIndex + 1}/${visibleSpots.length} 站` : "快到了！"}
              </button>
              <img src="/assets/character-little-a.png" alt="" />
            </div>

            <div
              className="map-canvas"
              onPointerDown={beginMapDrag}
              onPointerMove={moveMapDrag}
              onPointerUp={endMapDrag}
              style={{ transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0)` }}
            >
              {visibleSpots.map((spot, index) => {
                const position = mapPositions[spot.spot_id] ?? { x: 50, y: 50, icon: "note1.png" };
                return (
                  <button
                    key={spot.spot_id}
                    type="button"
                    className={`map-marker ${index === activeIndex ? "active" : ""}`}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    onClick={() => {
                      setActiveIndex(index);
                      setGuideSheet("open");
                      setVisualContext(null);
                    }}
                    aria-label={spot.name}
                  >
                    <img src={`/assets/image_walk/透明图标/${position.icon}`} alt="" />
                    <span>{index + 1}</span>
                  </button>
                );
              })}
              {tourMode === "guided" && <div className="route-path" />}
            </div>

            <section className={`guide-panel ${guideSheet}`}>
              <button
                type="button"
                className="sheet-grip"
                onPointerDown={beginSheetDrag}
                onPointerMove={moveSheetDrag}
                onPointerUp={endSheetDrag}
                aria-label={guideSheet !== "peek" ? "收起讲解半层" : "拉起讲解半层"}
              />

              {guideSheet === "peek" ? (
                <div className="peek-content">
                  <img src="/assets/character-little-a.png" alt="" />
                  <button type="button" className="peek-prompt" onClick={() => setDrawerOpen(true)}>
                    你在{activeSpot.name}附近，有什么想了解的吗？
                  </button>
                </div>
              ) : (
                <>
                  <div className="panel-heading">
                    <img src="/assets/character-little-a.png" alt="" />
                    <div>
                      <p>{tourMode === "free" ? "自由游览" : `${activeIndex + 1} / ${visibleSpots.length} 站`}</p>
                      <h2>{activeSpot.name}</h2>
                      <span>{activeSpot.summary}</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${tourMode === "free" ? 100 : ((activeIndex + 1) / visibleSpots.length) * 100}%` }} />
                  </div>
                  <article>
                    <h3>{activeGuide?.title ?? activeSpot.name}</h3>
                    <p>{activeGuide?.content ?? activeSpot.summary}</p>
                  </article>
                  <div className="panel-actions">
                    <button type="button" onClick={() => setDrawerOpen(true)}>
                      <MessageCircle size={18} /> 追问
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                      <Camera size={18} /> 拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tourMode === "guided") {
                          setActiveIndex((index) => Math.min(index + 1, visibleSpots.length - 1));
                          setGuideSheet("open");
                        } else {
                          startGuideSetup();
                        }
                      }}
                    >
                      {tourMode === "guided" ? <Navigation size={18} /> : <Route size={18} />} {tourMode === "guided" ? "下一站" : "开启导览"}
                    </button>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => submitPhoto(event.target.files?.[0])}
              />
            </section>

            <section className={`chat-drawer ${drawerOpen ? "open" : ""}`}>
              <button className="drawer-backdrop" type="button" onClick={() => setDrawerOpen(false)} aria-label="关闭聊天" />
              <div className="drawer-body">
                <div className="drag-handle" />
                <header>
                  <Sparkles size={18} />
                  <strong>你在{activeSpot.name}附近，有什么想了解的吗？</strong>
                </header>
                <div className="messages">
                  {messages.map((message, index) => (
                    <p key={`${message.role}-${index}`} className={message.role}>
                      {message.text}
                    </p>
                  ))}
                  {chatPending && (
                    <p className="agent typing" aria-label="小A正在输入">
                      <span />
                      <span />
                      <span />
                    </p>
                  )}
                </div>
                <div className="quick-prompts">
                  {(activeGuide?.follow_up_suggestions ?? ["这里有什么历史？", "附近还有什么值得看？"]).slice(0, 2).map((suggestion) => (
                    <button key={suggestion} type="button" disabled={chatPending} onClick={() => sendMessage(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
                <form
                  className="chat-input"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage();
                  }}
                >
                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="拍照">
                    <Camera size={20} />
                  </button>
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="问问小A..." />
                  <button type="submit" aria-label="发送" disabled={chatPending}>
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
