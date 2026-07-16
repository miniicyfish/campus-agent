"use client";

import {
  Camera,
  ChevronRight,
  CloudRain,
  Crosshair,
  Home as HomeIcon,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  Send,
  Snowflake,
  Sparkles,
  Sun,
  ThermometerSun,
} from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, CampusRoute, GuideScript, Profile, RouteMatch, Spot, WeatherKind, WeatherState } from "@/lib/types";

type Bootstrap = {
  spots: Spot[];
  routes: CampusRoute[];
  agents: Omit<Agent, "body">[];
};

type ChatMessage = {
  role: "agent" | "user";
  text: string;
};

type UserLocation = {
  lat: number;
  lng: number;
  source: "real" | "mock";
};

type TourPhase = "route_preview" | "navigating" | "arrived" | "detour_prompt" | "completed";

const defaultWeatherState: WeatherState = {
  kind: "clear",
  label: "晴朗",
  description: "适合按原路线步行游览。",
  isExtreme: false,
  updatedAt: "",
  source: "mock",
};

const mapPositions: Record<string, { x: number; y: number }> = {
  foreign_languages_building: { x: 14.6, y: 28.7 },
  fudan_university_station: { x: 10.5, y: 42.3 },
  fudan_history_museum: { x: 14.2, y: 54.1 },
  fudan_alumni_hall: { x: 21.9, y: 73.2 },
  xianghui_hall: { x: 18.1, y: 39.2 },
  yifu_science_building: { x: 31.2, y: 38.1 },
  fudan_zibin_hall: { x: 26.4, y: 51.8 },
  fourth_teaching_building: { x: 38.8, y: 40.8 },
  motto_wall: { x: 43.4, y: 61.6 },
  fudan_guanghua_tower: { x: 77.1, y: 34.2 },
  yuanchuang_center: { x: 77.0, y: 17.5 },
  henglong_physics_building: { x: 54.8, y: 41.1 },
  liren_biological_building: { x: 59.5, y: 54.9 },
  courier_station_main: { x: 88.4, y: 65.3 },
  family_mart: { x: 60.6, y: 73.5 },
  benbu_student_supermarket: { x: 75.3, y: 77.1 },
  yeyaozhen_building: { x: 73.1, y: 82.8 },
  danyuan_canteen: { x: 91.0, y: 21.8 },
  guanghua_lawn: { x: 77.3, y: 52.7 },
  fudan_third_teaching_building: { x: 62.4, y: 64.4 },
  mao_statue: { x: 55.2, y: 70.3 },
  fudan_science_library: { x: 47.2, y: 75.0 },
  fudan_yanyuan: { x: 35.5, y: 83.3 },
  fudan_old_gate: { x: 25.9, y: 84.5 },
  fudan_main_gate: { x: 54.6, y: 87.9 },
  fudan_xiyuan: { x: 63.8, y: 84.4 },
  campus_bank: { x: 60.8, y: 85.3 },
  wangdao_garden: { x: 47.0, y: 87.4 },
};

const mapHitAreas: Record<string, { width: number; height: number }> = {
  benbu_student_supermarket: { width: 150, height: 44 },
  campus_bank: { width: 90, height: 52 },
  courier_station_main: { width: 78, height: 70 },
  danyuan_canteen: { width: 118, height: 86 },
  foreign_languages_building: { width: 116, height: 104 },
  fudan_alumni_hall: { width: 130, height: 72 },
  fudan_guanghua_tower: { width: 172, height: 122 },
  fudan_history_museum: { width: 132, height: 76 },
  fudan_science_library: { width: 132, height: 86 },
  fudan_university_station: { width: 134, height: 48 },
  guanghua_lawn: { width: 130, height: 92 },
  xianghui_hall: { width: 136, height: 70 },
  yeyaozhen_building: { width: 112, height: 66 },
  yuanchuang_center: { width: 162, height: 62 },
};

const mapExtraHitAreas: Array<{ spotId: string; x: number; y: number; width: number; height: number; label: string }> = [
  { spotId: "fudan_university_station", x: 10.4, y: 80.9, width: 134, height: 48, label: "复旦大学地铁站 2 号口" },
];

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

function distanceMeters(left: { lat?: number; lng?: number }, right: { lat?: number; lng?: number }) {
  if (left.lat == null || left.lng == null || right.lat == null || right.lng == null) return Number.POSITIVE_INFINITY;

  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(right.lat - left.lat);
  const deltaLng = toRad(right.lng - left.lng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(left.lat)) * Math.cos(toRad(right.lat)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSpotRadius(spot?: Spot, routeRadius?: number) {
  return routeRadius ?? spot?.default_trigger_radius_meters ?? 60;
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
  const [tourPhase, setTourPhase] = useState<TourPhase>("route_preview");
  const [routeFinished, setRouteFinished] = useState(false);
  const [weatherState, setWeatherState] = useState<WeatherState>(defaultWeatherState);
  const [weatherOverride, setWeatherOverride] = useState<WeatherKind | "random">("random");
  const [locationMode, setLocationMode] = useState<"off" | "real" | "mock">("off");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [nearbyDetourSpot, setNearbyDetourSpot] = useState<Spot | null>(null);
  const [chatSpot, setChatSpot] = useState<Spot | null>(null);
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
  const mapDragRef = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const mapPointersRef = useRef(new globalThis.Map<number, { x: number; y: number }>());
  const mapPinchRef = useRef<{ distance: number; startScale: number } | null>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const lastInsideStopRef = useRef<string | null>(null);
  const manuallyOpenedGuideRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((response) => response.json())
      .then(setBootstrap);
  }, []);

  useEffect(() => {
    if (!bootstrap || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    if (demo === "control") {
      setShowDemoPanel(true);
      setDemoMode(true);
      setLocationMode("mock");
    }
    if (!["map", "peek", "free", "control"].includes(demo ?? "") || match) return;

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
        setGuideSheet(demo === "peek" || demo === "control" ? "peek" : "open");
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
  const markerSpots = tourMode === "free" ? freeSpots : guidedSpots;
  const activeStop = tourMode === "guided" ? route?.stops[activeIndex] : undefined;
  const activeSpot = visibleSpots[activeIndex] ?? visibleSpots[0];
  const currentChatSpot = chatSpot ?? activeSpot;
  const nearestLocationPosition = useMemo(() => {
    if (!userLocation || !bootstrap) return undefined;

    const nearestSpot = bootstrap.spots
      .filter((spot) => spot.lat != null && spot.lng != null && mapPositions[spot.spot_id])
      .map((spot) => ({ spot, distance: distanceMeters(userLocation, spot) }))
      .sort((a, b) => a.distance - b.distance)[0]?.spot;

    return nearestSpot ? mapPositions[nearestSpot.spot_id] : undefined;
  }, [bootstrap, userLocation]);
  const activeScriptId =
    tourMode === "guided" ? (weatherState.isExtreme ? activeStop?.extreme_guide_script_id ?? activeStop?.guide_script_id : activeStop?.guide_script_id) : undefined;
  const isFinalGuidedStop = tourMode === "guided" && activeIndex >= visibleSpots.length - 1;

  useEffect(() => {
    if (!activeSpot) return;
    const routeId = tourMode === "guided" ? route?.route_id ?? "" : "";
    const params = new URLSearchParams({
      spotId: activeSpot.spot_id,
      routeId,
      agentId: agent?.agent_id ?? "",
    });
    if (activeScriptId) params.set("scriptId", activeScriptId);

    fetch(`/api/guide?${params.toString()}`)
      .then((response) => response.json())
      .then((payload) => setActiveGuide(payload.script));
  }, [activeScriptId, activeSpot, agent?.agent_id, route?.route_id, tourMode]);

  useEffect(() => {
    setChatSpot(null);
  }, [activeSpot?.spot_id]);

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

  useEffect(() => {
    if (step !== "map" || locationMode !== "real" || typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationError(null);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "real",
        });
      },
      () => {
        setLocationError("还没能确认你的位置。你也可以直接点击地图上的地点听讲解。");
        setLocationMode("off");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 8000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationMode, step]);

  useEffect(() => {
    if (step !== "map" || locationMode !== "mock" || !activeSpot?.lat || !activeSpot?.lng || userLocation) return;
    setUserLocation({ lat: activeSpot.lat, lng: activeSpot.lng, source: "mock" });
  }, [activeSpot, locationMode, step, userLocation]);

  useEffect(() => {
    if (step !== "map" || tourMode !== "guided" || routeFinished || !userLocation || !activeSpot || !bootstrap) return;

    const routeSpotIds = new Set(guidedSpots.map((spot) => spot.spot_id));
    const activeDistance = distanceMeters(userLocation, activeSpot);
    const activeRadius = getSpotRadius(activeSpot, activeStop?.trigger_radius_meters);
    const insideActiveStop = activeDistance <= activeRadius;

    if (insideActiveStop) {
      setNearbyDetourSpot(null);
      setTourPhase("arrived");
      if (lastInsideStopRef.current !== activeSpot.spot_id) {
        lastInsideStopRef.current = activeSpot.spot_id;
        refreshWeatherForSpot(activeSpot.spot_id);
      }
      setGuideSheet("open");
      return;
    }

    if (lastInsideStopRef.current === activeSpot.spot_id) {
      lastInsideStopRef.current = null;
    }

    if (manuallyOpenedGuideRef.current === activeSpot.spot_id) {
      setNearbyDetourSpot(null);
      setTourPhase("arrived");
      return;
    }

    setGuideSheet("peek");

    const nearestDetour = bootstrap.spots
      .filter((spot) => !routeSpotIds.has(spot.spot_id) && mapPositions[spot.spot_id] && spot.lat != null && spot.lng != null)
      .map((spot) => ({
        spot,
        distance: distanceMeters(userLocation, spot),
        radius: getSpotRadius(spot),
      }))
      .filter((item) => item.distance <= Math.max(item.radius, 55))
      .sort((a, b) => a.distance - b.distance)[0]?.spot;

    setNearbyDetourSpot(nearestDetour ?? null);
    setTourPhase(nearestDetour ? "detour_prompt" : "navigating");
  }, [activeSpot, activeStop?.trigger_radius_meters, bootstrap, guidedSpots, routeFinished, step, tourMode, userLocation, weatherOverride]);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    matchProfile();
  }

  async function refreshWeatherForSpot(spotId: string) {
    const params = new URLSearchParams({ spotId });
    if (weatherOverride !== "random") params.set("kind", weatherOverride);

    const response = await fetch(`/api/weather?${params.toString()}`);
    const nextWeather = (await response.json()) as WeatherState;
    setWeatherState((current) => (current.kind === nextWeather.kind ? current : nextWeather));
    return nextWeather;
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
      setTourMode("guided");
      setActiveIndex(0);
      setRouteFinished(false);
      setTourPhase("route_preview");
      setMapPan({ x: 0, y: 0 });
      setMapScale(1);
      setGuideSheet("peek");
      setDrawerOpen(false);
      setVisualContext(null);
      setChatSpot(null);
      setNearbyDetourSpot(null);
      lastInsideStopRef.current = null;
      manuallyOpenedGuideRef.current = null;
      setStep("agent");
    } finally {
      setProfilePending(false);
    }
  }

  async function sendMessage(text = chatInput) {
    const trimmed = text.trim();
    if (!trimmed || !currentChatSpot || chatPending) return;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setChatInput("");
    setChatPending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        message: trimmed,
        spotId: currentChatSpot.spot_id,
        routeId: tourMode === "guided" ? route?.route_id : undefined,
        agentId: agent?.agent_id,
        scriptId: chatSpot ? undefined : activeScriptId,
        visualContext,
        weather: weatherState,
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
    if (!currentChatSpot || !file) return;
    const formData = new FormData();
    formData.set("photo", file);
    formData.set("spotId", currentChatSpot.spot_id);
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

    if (!drag?.moved && guideSheet !== "peek") {
      manuallyOpenedGuideRef.current = null;
      setGuideSheet("peek");
    }
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
    setTourPhase("navigating");
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setVisualContext(null);
    setChatSpot(null);
    setNearbyDetourSpot(null);
    setLocationError(null);
    setUserLocation(null);
    setLocationMode(demoMode ? "mock" : "real");
    lastInsideStopRef.current = null;
    manuallyOpenedGuideRef.current = null;
    setStep("map");
  }

  function enterFreeMode() {
    setTourMode("free");
    setActiveIndex(0);
    setRouteFinished(false);
    setTourPhase("navigating");
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setChatSpot(null);
    setNearbyDetourSpot(null);
    setLocationMode("off");
    setLocationError(null);
    setUserLocation(null);
    setDemoMode(false);
    setShowDemoPanel(false);
    lastInsideStopRef.current = null;
    manuallyOpenedGuideRef.current = null;
    setStep("map");
  }

  async function enterDemoMode() {
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
      setDemoMode(true);
      setShowDemoPanel(true);
      setTourMode("guided");
      setActiveIndex(0);
      setRouteFinished(false);
      setTourPhase("navigating");
      setMapPan({ x: 0, y: 0 });
      setMapScale(1);
      setGuideSheet("peek");
      setDrawerOpen(false);
      setVisualContext(null);
      setChatSpot(null);
      setNearbyDetourSpot(null);
      setLocationMode("mock");
      setLocationError(null);
      setUserLocation(null);
      lastInsideStopRef.current = null;
      manuallyOpenedGuideRef.current = null;
      setStep("map");
    } finally {
      setProfilePending(false);
    }
  }

  function selectMapSpot(spot: Spot) {
    const guidedIndex = guidedSpots.findIndex((item) => item.spot_id === spot.spot_id);

    if (tourMode === "guided" && guidedIndex >= 0) {
      manuallyOpenedGuideRef.current = spot.spot_id;
      setActiveIndex(guidedIndex);
      setTourPhase("arrived");
    } else {
      manuallyOpenedGuideRef.current = null;
      const freeIndex = freeSpots.findIndex((item) => item.spot_id === spot.spot_id);
      setTourMode("free");
      setActiveIndex(Math.max(0, freeIndex));
      setTourPhase("navigating");
    }

    setRouteFinished(false);
    setGuideSheet("open");
    setVisualContext(null);
    setChatSpot(null);
    setNearbyDetourSpot(null);
    if (locationMode === "mock" && spot.lat != null && spot.lng != null) {
      setUserLocation({ lat: spot.lat, lng: spot.lng, source: "mock" });
    }
    if (tourMode === "guided" && guidedIndex >= 0) {
      refreshWeatherForSpot(spot.spot_id);
      lastInsideStopRef.current = spot.spot_id;
    }
  }

  function startGuideSetup() {
    setTourMode("guided");
    setActiveIndex(0);
    setRouteFinished(false);
    setTourPhase("route_preview");
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setChatSpot(null);
    setNearbyDetourSpot(null);
    setDemoMode(false);
    setShowDemoPanel(false);
    setLocationMode("off");
    setLocationError(null);
    setUserLocation(null);
    lastInsideStopRef.current = null;
    manuallyOpenedGuideRef.current = null;
    setStep("profile");
  }

  function openModeSelection() {
    if (match) {
      setDrawerOpen(false);
      setRouteFinished(false);
      setGuideSheet("peek");
      manuallyOpenedGuideRef.current = null;
      setStep("mode");
      return;
    }

    startGuideSetup();
  }

  function returnHome() {
    setActiveIndex(0);
    setRouteFinished(false);
    setTourPhase("route_preview");
    setMapPan({ x: 0, y: 0 });
    setMapScale(1);
    setGuideSheet("peek");
    setDrawerOpen(false);
    setVisualContext(null);
    setChatSpot(null);
    setNearbyDetourSpot(null);
    setDemoMode(false);
    setShowDemoPanel(false);
    setLocationMode("off");
    setLocationError(null);
    setUserLocation(null);
    lastInsideStopRef.current = null;
    manuallyOpenedGuideRef.current = null;
    setStep("home");
  }

  function goToNextStop() {
    if (tourMode !== "guided") {
      openModeSelection();
      return;
    }

    if (isFinalGuidedStop) {
      setRouteFinished(true);
      setTourPhase("completed");
      setGuideSheet("open");
      manuallyOpenedGuideRef.current = null;
      return;
    }

    setRouteFinished(false);
    setActiveIndex((index) => index + 1);
    setTourPhase("navigating");
    setGuideSheet("peek");
    setNearbyDetourSpot(null);
    setChatSpot(null);
    lastInsideStopRef.current = null;
    manuallyOpenedGuideRef.current = null;
  }

  function openRouteChat() {
    setChatSpot(null);
    setDrawerOpen(true);
  }

  async function openNearbySpotChat(spot: Spot) {
    setChatSpot(spot);
    setDrawerOpen(true);
    setChatPending(true);
    try {
      const response = await fetch(`/api/guide?spotId=${spot.spot_id}`);
      const payload = await response.json();
      const nextStopName = activeSpot?.name ?? "推荐路线";
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: `${payload.script?.content ?? spot.summary ?? `附近是${spot.name}。`} 闲逛结束后，我们可以回到导览路线，继续前往“${nextStopName}”。`,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "agent", text: `附近是${spot.name}。我暂时没有拿到完整讲解，闲逛结束后我们可以回到当前导览路线。` },
      ]);
    } finally {
      setChatPending(false);
    }
  }

  function moveMockLocationToSpot(spotId: string) {
    const spot = bootstrap?.spots.find((item) => item.spot_id === spotId);
    if (!spot?.lat || !spot.lng) return;
    setLocationMode("mock");
    setUserLocation({ lat: spot.lat, lng: spot.lng, source: "mock" });
  }

  if (!bootstrap) {
    return (
      <main className="app-shell">
        <section className="phone-frame loading-screen">正在整理校园内容包...</section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${demoMode && step === "map" ? "demo-shell" : ""}`}>
      <section
        className={`phone-frame weather-${weatherState.kind} ${
          step === "home" ? "home-screen" : step === "profile" ? "profile-screen" : step === "agent" || step === "mode" ? "agent-screen" : "map-screen"
        }`}
      >
        {step === "home" && (
          <div className="home-entry">
            <div className="home-hero">
              <p>FUDAN CAMPUS AGENT</p>
              <h1>选择你的校园导览方式</h1>
            </div>
            <div className="home-actions">
              <button type="button" className="home-card primary" onClick={startGuideSetup}>
                <strong>推荐路线导览</strong>
                <span>告诉我你是谁、想看什么，我会安排一条适合你的校园路线。</span>
              </button>
              <button type="button" className="home-card" onClick={enterFreeMode}>
                <strong>自由探索</strong>
                <span>想逛哪就点哪。看到感兴趣的建筑，也可以随时追问或拍照。</span>
              </button>
              <button type="button" className="home-card demo" disabled={profilePending} onClick={enterDemoMode}>
                <strong>路演演示模式</strong>
                <span>打开模拟 GPS 和模拟天气控制面板，用于录屏、答辩和现场演示。</span>
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <form className="paper-form" onSubmit={submitProfile}>
            <div className="profile-heading">
              <p>导览模式</p>
              <h1>先让导览团队了解一下你</h1>
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
                <span>来复旦校园，你的身份是</span>
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
            <p>路线已匹配</p>
            <h1>{route.name}</h1>
            <img className="avatar-large" src={agentAvatar} alt="" />
            <h2>{agent?.name ?? "校园导览员"}</h2>
            <p className="agent-tone">{agent?.tone ?? match?.style ?? "校园导览"} · {route.duration_minutes} 分钟 · {route.stops.length} 站</p>
            <p className="muted">{match?.reason}</p>
            <div className="route-card">
              <strong>今天这样逛</strong>
              <span>{route.description}</span>
              <em>出发时会请你允许使用当前位置。走到每一站附近，我会自然开始讲解；天气不好时，也会优先提醒你避雨、补水或转入室内。</em>
            </div>
            <div className="route-preview-list">
              {guidedSpots.slice(0, 5).map((spot, index) => (
                <span key={spot.spot_id}>{index + 1}. {spot.name}</span>
              ))}
              {guidedSpots.length > 5 && <span>… 共 {guidedSpots.length} 站</span>}
            </div>
            <div className="route-preview-actions">
              <button className="primary-button oversized" type="button" onClick={enterGuidedMode}>
                {demoMode ? "开始演示导览" : "开始导览"}
              </button>
              <button className="secondary-button" type="button" onClick={enterFreeMode}>
                先手动看地图
              </button>
            </div>
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
                aria-label={tourMode === "free" ? (match ? "回到已匹配导览" : "返回模式选择") : "切换到自由导览"}
              >
                {tourMode === "free" ? <Route size={17} /> : <Map size={17} />}
                <span>{tourMode === "free" ? (match ? "回到导览" : "选模式") : "切自由"}</span>
              </button>
              <button type="button" className="arrival-pill" disabled={tourMode === "guided"} onClick={tourMode === "free" ? () => setGuideSheet("open") : undefined}>
                {tourMode === "free" ? activeSpot.name : `${activeIndex + 1}/${visibleSpots.length} 站`}
              </button>
              <img src={agentAvatar} alt="" />
            </div>
            <div className="weather-pill">
              {weatherState.kind === "rain" ? (
                <CloudRain size={16} />
              ) : weatherState.kind === "hot" ? (
                <ThermometerSun size={16} />
              ) : weatherState.kind === "snow" ? (
                <Snowflake size={16} />
              ) : (
                <Sun size={16} />
              )}
              <span>{weatherState.label}</span>
              <em>{demoMode ? "演示模式" : weatherState.isExtreme ? "注意天气" : "适合游览"}</em>
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
                {markerSpots.map((spot, index) => {
                  const position = mapPositions[spot.spot_id] ?? { x: 50, y: 50 };
                  const hitArea = mapHitAreas[spot.spot_id];
                  const isActive = activeSpot?.spot_id === spot.spot_id;
                  const markerStyle: CSSProperties = {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    ...(tourMode === "free" && hitArea ? { width: hitArea.width, height: hitArea.height } : {}),
                  };
                  return (
                    <button
                      key={spot.spot_id}
                      type="button"
                      className={`map-marker ${isActive ? "active" : ""} ${tourMode === "free" ? "free-hit-area" : ""}`}
                      style={markerStyle}
                      onClick={() => selectMapSpot(spot)}
                      aria-label={spot.name}
                    >
                      {tourMode === "guided" && <span>{index + 1}</span>}
                    </button>
                  );
                })}
                {tourMode === "free" &&
                  mapExtraHitAreas.map((area) => {
                    const spot = freeSpots.find((item) => item.spot_id === area.spotId);
                    if (!spot) return null;

                    return (
                      <button
                        key={`${area.spotId}-${area.label}`}
                        type="button"
                        className="map-marker free-hit-area"
                        style={{
                          left: `${area.x}%`,
                          top: `${area.y}%`,
                          width: area.width,
                          height: area.height,
                        }}
                        onClick={() => selectMapSpot(spot)}
                        aria-label={area.label}
                      />
                    );
                  })}
                {nearestLocationPosition && (
                  <span
                    className="user-location-dot"
                    style={{
                      left: `${nearestLocationPosition.x}%`,
                      top: `${nearestLocationPosition.y}%`,
                    }}
                    aria-label="当前位置"
                  />
                )}
              </div>
            </div>

            <section className={`guide-panel ${guideSheet}`}>
              <div className="sheet-grip" aria-hidden="true" />

              {guideSheet === "peek" ? (
                <div className="peek-content">
                  <img src={agentAvatar} alt="" />
                  <button type="button" className="peek-prompt" onClick={() => (nearbyDetourSpot ? openNearbySpotChat(nearbyDetourSpot) : openRouteChat())}>
                    {nearbyDetourSpot
                      ? `附近就是${nearbyDetourSpot.name}，想顺路看看吗？`
                      : tourMode === "guided"
                        ? `你正在${activeSpot.name}附近，想听听这里的故事吗？`
                        : `你在${activeSpot.name}附近，有什么想了解的吗？`}
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
                        <button type="button" onClick={openRouteChat}>
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
              <button
                className="drawer-backdrop"
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setChatSpot(null);
                }}
                aria-label="关闭聊天"
              />
              <div className="drawer-body">
                <div className="drag-handle" />
                <header>
                  <Sparkles size={18} />
                  <strong>你在{currentChatSpot?.name ?? activeSpot.name}附近，有什么想了解的吗？</strong>
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
                  {(chatSpot ? ["这里有什么值得看？", "怎么回到路线？"] : activeGuide?.follow_up_suggestions ?? ["这里有什么历史？", "附近还有什么值得看？"]).slice(0, 2).map((suggestion) => (
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
      {showDemoPanel && demoMode && step === "map" && activeSpot && (
        <section className="demo-panel">
          <header>
            <Crosshair size={15} />
            <strong>演示控制台</strong>
            <button type="button" onClick={() => setShowDemoPanel(false)}>
              收起
            </button>
          </header>
          <p>手机画面保持为用户视角；这里用于路演时控制位置和天气。</p>
          <label>
            <span>定位来源</span>
            <select value={locationMode} onChange={(event) => setLocationMode(event.target.value as "off" | "real" | "mock")}>
              <option value="off">关闭定位</option>
              <option value="mock">模拟定位</option>
              <option value="real">真实 GPS</option>
            </select>
          </label>
          <label>
            <span>移动到点位</span>
            <select value="" onChange={(event) => moveMockLocationToSpot(event.target.value)}>
              <option value="">选择点位</option>
              {bootstrap.spots
                .filter((spot) => spot.lat != null && spot.lng != null && mapPositions[spot.spot_id])
                .map((spot) => (
                  <option key={spot.spot_id} value={spot.spot_id}>
                    {spot.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="coordinate-row">
            <label>
              <span>纬度</span>
              <input
                value={userLocation?.lat ?? ""}
                onChange={(event) => setUserLocation({ lat: Number(event.target.value), lng: userLocation?.lng ?? activeSpot.lng ?? 0, source: "mock" })}
              />
            </label>
            <label>
              <span>经度</span>
              <input
                value={userLocation?.lng ?? ""}
                onChange={(event) => setUserLocation({ lat: userLocation?.lat ?? activeSpot.lat ?? 0, lng: Number(event.target.value), source: "mock" })}
              />
            </label>
          </div>
          <label>
            <span>天气</span>
            <select value={weatherOverride} onChange={(event) => setWeatherOverride(event.target.value as WeatherKind | "random")}>
              <option value="random">自然变化</option>
              <option value="clear">晴朗</option>
              <option value="rain">雨天</option>
              <option value="hot">高温</option>
              <option value="snow">降雪</option>
            </select>
          </label>
          <button type="button" className="demo-action" onClick={() => refreshWeatherForSpot(activeSpot.spot_id)}>
            <MapPin size={15} /> 刷新当前点位天气
          </button>
        </section>
      )}
    </main>
  );
}
