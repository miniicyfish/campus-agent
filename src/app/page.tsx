"use client";

import { Camera, ChevronRight, Home as HomeIcon, Map, MessageCircle, Navigation, Route, Send, Sparkles } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
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

const mapPositions: Record<string, { x: number; y: number }> = {
  fudan_yanyuan: { x: 7.8, y: 13.2 },
  fudan_science_library: { x: 11.2, y: 47.4 },
  fudan_history_museum: { x: 18.1, y: 39.1 },
  fudan_old_gate: { x: 25.2, y: 88.2 },
  xianghui_hall: { x: 26.6, y: 55.8 },
  fudan_third_teaching_building: { x: 39.6, y: 43.2 },
  fudan_zibin_hall: { x: 47.3, y: 76.5 },
  fudan_xiyuan: { x: 49.5, y: 87.1 },
  fudan_main_gate: { x: 55.5, y: 88.4 },
  mao_statue: { x: 55.8, y: 70.6 },
  fourth_teaching_building: { x: 62.0, y: 66.5 },
  fudan_alumni_hall: { x: 62.8, y: 76.4 },
  fudan_guanghua_tower: { x: 77.5, y: 34.9 },
  guanghua_lawn: { x: 78.7, y: 51.8 },
  danyuan_canteen: { x: 90.3, y: 22.4 },
};

const mapBounds = {
  aspectRatio: 1704 / 923,
  maxPanX: 620,
  minPanY: -420,
  maxPanY: 90,
  minScale: 1,
  maxScale: 2.4,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const agentAssets: Record<string, string> = {
  student_guide: "/assets/agents/student-guide.png",
  history_association: "/assets/agents/history-scholar.png",
  littleredbook_curator: "/assets/agents/aesthetic-curator.png",
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
  const [routeFinished, setRouteFinished] = useState(false);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [mapScale, setMapScale] = useState(1);
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
  const mapPointersRef = useRef(new globalThis.Map<number, { x: number; y: number }>());
  const mapPinchRef = useRef<{ distance: number; startScale: number } | null>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);

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

  const route = match?.route;
  const recommendedAgentId = match?.agent_id ?? "student_guide";
  const agent = useMemo(
    () => bootstrap?.agents.find((item) => item.agent_id === recommendedAgentId) ?? bootstrap?.agents.find((item) => item.agent_id === "student_guide") ?? bootstrap?.agents[0],
    [bootstrap?.agents, recommendedAgentId],
  );
  const agentAvatar = agentAssets[agent?.agent_id ?? "student_guide"] ?? "/assets/character-little-a.png";
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
  const isFinalGuidedStop = tourMode === "guided" && activeIndex >= visibleSpots.length - 1;

  useEffect(() => {
    if (!activeSpot) return;
    const routeId = tourMode === "guided" ? route?.route_id ?? "" : "";
    fetch(`/api/guide?spotId=${activeSpot.spot_id}&routeId=${routeId}&agentId=${agent?.agent_id ?? ""}`)
      .then((response) => response.json())
      .then((payload) => setActiveGuide(payload.script));
  }, [activeSpot, agent?.agent_id, route?.route_id, tourMode]);

  useEffect(() => {
    if (step !== "map" || !activeSpot) return;
    const position = mapPositions[activeSpot.spot_id];
    const frame = mapFrameRef.current;
    if (!position || !frame) return;

    const stageWidth = frame.clientHeight * mapBounds.aspectRatio;
    const targetX = (stageWidth * position.x) / 100;
    const targetY = (frame.clientHeight * position.y) / 100;
    const desiredY =
      guideSheet === "peek" ? frame.clientHeight * 0.52 : guideSheet === "full" ? frame.clientHeight * 0.26 : frame.clientHeight * 0.34;

    setMapPan({
      x: Math.max(-mapBounds.maxPanX, Math.min(mapBounds.maxPanX, stageWidth / 2 - targetX)),
      y: Math.max(mapBounds.minPanY, Math.min(mapBounds.maxPanY, desiredY - targetY)),
    });
  }, [activeSpot, guideSheet, step]);

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
      enterGuidedMode();
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

  function getPinchDistance() {
    const points = Array.from(mapPointersRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function clampMapPan(nextPan: { x: number; y: number }, scale = mapScale) {
    return {
      x: clamp(nextPan.x, -mapBounds.maxPanX * scale, mapBounds.maxPanX * scale),
      y: clamp(nextPan.y, mapBounds.minPanY * scale, mapBounds.maxPanY * scale),
    };
  }

  function beginMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".map-marker")) return;
    mapPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    mapDragRef.current = { x: event.clientX, y: event.clientY, startX: mapPan.x, startY: mapPan.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (mapPointersRef.current.size >= 2) {
      mapPinchRef.current = { distance: getPinchDistance(), startScale: mapScale };
      mapDragRef.current = null;
    }
  }

  function moveMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (mapPointersRef.current.has(event.pointerId)) {
      mapPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (mapPointersRef.current.size >= 2 && mapPinchRef.current) {
      const distance = getPinchDistance();
      if (distance > 0 && mapPinchRef.current.distance > 0) {
        setMapScale(clamp(mapPinchRef.current.startScale * (distance / mapPinchRef.current.distance), mapBounds.minScale, mapBounds.maxScale));
      }
      return;
    }

    const drag = mapDragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    setMapPan(clampMapPan({ x: drag.startX + dx, y: drag.startY + dy }));
  }

  function endMapDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = mapDragRef.current;
    mapPointersRef.current.delete(event.pointerId);
    if (mapPointersRef.current.size < 2) mapPinchRef.current = null;
    mapDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (!drag) return;
    const moved = drag.moved;
    if (!moved) collapseGuideSheet();
  }

  function zoomMapWithWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextScale = clamp(mapScale + (event.deltaY > 0 ? -0.12 : 0.12), mapBounds.minScale, mapBounds.maxScale);
    setMapScale(nextScale);
    setMapPan((current) => clampMapPan(current, nextScale));
  }

  function enterGuidedMode() {
    setTourMode("guided");
    setActiveIndex(0);
    setRouteFinished(false);
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setVisualContext(null);
    setStep("map");
  }

  function enterFreeMode() {
    setTourMode("free");
    setActiveIndex(0);
    setRouteFinished(false);
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("map");
  }

  function startGuideSetup() {
    setTourMode("guided");
    setActiveIndex(0);
    setRouteFinished(false);
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("profile");
  }

  function openModeSelection() {
    if (match) {
      setDrawerOpen(false);
      setRouteFinished(false);
      setGuideSheet("peek");
      setStep("mode");
      return;
    }

    startGuideSetup();
  }

  function returnHome() {
    setActiveIndex(0);
    setRouteFinished(false);
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setStep("home");
  }

  function goToNextStop() {
    if (tourMode !== "guided") {
      openModeSelection();
      return;
    }

    if (isFinalGuidedStop) {
      setRouteFinished(true);
      setGuideSheet("open");
      return;
    }

    setRouteFinished(false);
    setActiveIndex((index) => index + 1);
    setGuideSheet("open");
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
                <strong>导览模式</strong>
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
            <img className="avatar-large" src={agentAvatar} alt="" />
            <h2>{agent?.name ?? "校史馆小A"}</h2>
            <p className="agent-tone">{agent?.tone ?? match?.style ?? "校园导览"}</p>
            <p className="muted">{match?.reason}</p>
            <div className="route-card">
              <strong>{route.name}</strong>
              <span>{route.description}</span>
              <em>{route.duration_minutes} 分钟 · {route.stops.length} 站 · {match?.style ?? route.style ?? "自适应"}风格</em>
            </div>
            <button className="primary-button oversized" type="button" onClick={enterGuidedMode}>
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
                <strong>推荐路线导览</strong>
                <span>按系统匹配的路线走，到站后拉起讲解和追问，适合想省心游览。</span>
              </button>
              <button type="button" onClick={enterFreeMode}>
                <strong>自由导览</strong>
                <span>不按推荐路线走，直接看地图点选坐标；点位介绍用基础脚本，追问仍由{agent?.name ?? "匹配导览员"}按{match?.style ?? "匹配"}风格回答。</span>
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
                onClick={tourMode === "free" ? openModeSelection : enterFreeMode}
                aria-label={tourMode === "free" ? "返回模式选择" : "切换到自由导览"}
              >
                {tourMode === "free" ? <Route size={17} /> : <Map size={17} />}
                <span>{tourMode === "free" ? "选模式" : "切自由"}</span>
              </button>
              <button type="button" className="arrival-pill" onClick={() => setGuideSheet("open")}>
                {tourMode === "free" ? activeSpot.name : `${activeIndex + 1}/${visibleSpots.length} 站`}
              </button>
              <img src={agentAvatar} alt="" />
            </div>

            <div
              ref={mapFrameRef}
              className="map-canvas"
              onPointerDown={beginMapDrag}
              onPointerMove={moveMapDrag}
              onPointerUp={endMapDrag}
              onPointerCancel={endMapDrag}
              onWheel={zoomMapWithWheel}
            >
              <div className="map-stage" style={{ transform: `translate3d(calc(-50% + ${mapPan.x}px), ${mapPan.y}px, 0) scale(${mapScale})` }}>
                <img className="campus-map-image" src="/assets/map-new.png" alt="复旦大学校园地图" draggable={false} />
                {visibleSpots.map((spot, index) => {
                  const position = mapPositions[spot.spot_id] ?? { x: 50, y: 50 };
                  return (
                    <button
                      key={spot.spot_id}
                      type="button"
                      className={`map-marker ${index === activeIndex ? "active" : ""}`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      onClick={() => {
                        setActiveIndex(index);
                        setRouteFinished(false);
                        setGuideSheet("open");
                        setVisualContext(null);
                      }}
                      aria-label={spot.name}
                    >
                      <span>{index + 1}</span>
                    </button>
                  );
                })}
              </div>
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
                  <img src={agentAvatar} alt="" />
                  <button type="button" className="peek-prompt" onClick={() => setDrawerOpen(true)}>
                    {tourMode === "guided" ? `你正在${activeSpot.name}附近，想听听这里的故事吗？` : `你在${activeSpot.name}附近，有什么想了解的吗？`}
                  </button>
                </div>
              ) : (
                <>
                  <div className="panel-heading">
                    <img src={agentAvatar} alt="" />
                    <div>
                      <p>{routeFinished ? "路线完成" : tourMode === "free" ? "自由游览" : `${activeIndex + 1} / ${visibleSpots.length} 站`}</p>
                      <h2>{routeFinished ? "导览完成" : activeSpot.name}</h2>
                      <span>{routeFinished ? route?.name : activeSpot.summary}</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${tourMode === "free" ? 100 : ((activeIndex + 1) / visibleSpots.length) * 100}%` }} />
                  </div>
                  {routeFinished ? (
                    <>
                      <article className="completion-card">
                        <h3>{route?.ending_message ? "今天的路线到这里" : "路线已经走完"}</h3>
                        <p>{route?.ending_message ?? "本次导览已经完成，你可以继续自由参观，或回到首页重新选择路线。"}</p>
                      </article>
                      <div className="panel-actions completion-actions">
                        <button type="button" onClick={returnHome}>
                          <HomeIcon size={18} /> 返回首页
                        </button>
                        <button type="button" onClick={enterFreeMode}>
                          <Map size={18} /> 自由参观
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
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
                        <button type="button" onClick={goToNextStop}>
                          {tourMode === "guided" ? <Navigation size={18} /> : <Route size={18} />}{" "}
                          {tourMode === "guided" ? (isFinalGuidedStop ? "完成导览" : "下一站") : "开启导览"}
                        </button>
                      </div>
                    </>
                  )}
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
