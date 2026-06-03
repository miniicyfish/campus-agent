import fs from "node:fs";
import path from "node:path";
import type {
  Agent,
  CampusRoute,
  GuideScript,
  KnowledgeChunk,
  Profile,
  RouteMatch,
  Spot,
} from "./types";

const root = process.cwd();

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8")) as T;
}

function readJsonDir<T>(dirPath: string): T[] {
  const absolute = path.join(root, dirPath);
  if (!fs.existsSync(absolute)) return [];

  return fs
    .readdirSync(absolute)
    .filter((file) => file.endsWith(".json") && !file.includes("example"))
    .flatMap((file) => {
      const parsed = readJsonFile<T | T[]>(path.join(dirPath, file));
      return Array.isArray(parsed) ? parsed : [parsed];
    });
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { attrs: {}, body: markdown };

  const attrs: Record<string, string> = {};
  match[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) attrs[key.trim()] = rest.join(":").trim();
  });

  return { attrs, body: match[2] };
}

function parseAgent(filePath: string): Agent {
  const markdown = fs.readFileSync(filePath, "utf8");
  const { attrs, body } = parseFrontmatter(markdown);
  return {
    agent_id: attrs.agent_id ?? path.basename(filePath, ".md"),
    name: attrs.name ?? path.basename(filePath, ".md"),
    tone: attrs.tone,
    default_language: attrs.default_language,
    body,
  };
}

export function getSpots(): Spot[] {
  return readJsonDir<Spot>("data/spots").sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function getRoutes(): CampusRoute[] {
  return readJsonFile<CampusRoute[]>("data/routes.json");
}

export function getAgents(): Agent[] {
  const agentDir = path.join(root, "knowledge/agents");
  if (!fs.existsSync(agentDir)) return [];

  return fs
    .readdirSync(agentDir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => parseAgent(path.join(agentDir, file)));
}

export function getGuideScripts(): GuideScript[] {
  return readJsonDir<GuideScript>("knowledge/guide_scripts");
}

export function getPhotoTargets() {
  return readJsonDir<Record<string, unknown>>("data/photo_targets");
}

export function getKnowledgeChunks(): KnowledgeChunk[] {
  const spots = new Map(getSpots().map((spot) => [spot.spot_id, spot.name]));
  const dir = path.join(root, "knowledge/spots");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .flatMap((file) => {
      const markdown = fs.readFileSync(path.join(dir, file), "utf8");
      const { attrs, body } = parseFrontmatter(markdown);
      const spotId = attrs.spot_id ?? path.basename(file, ".md");
      const sections = body.split(/\n(?=## )/g);

      return sections
        .map((section) => {
          const title = section.match(/^##\s+(.+)$/m)?.[1]?.trim() ?? spots.get(spotId) ?? spotId;
          const content = section.replace(/^##\s+.+$/m, "").trim();
          return {
            spot_id: spotId,
            spot_name: spots.get(spotId) ?? attrs.name ?? spotId,
            title,
            content,
          };
        })
        .filter((chunk) => chunk.content.length > 30);
    });
}

function overlaps(left: string[] = [], right: string[] = []) {
  const set = new Set(left);
  return right.filter((item) => set.has(item));
}

export function matchRoute(profile: Profile): RouteMatch {
  const rules = readJsonFile<
    Array<{
      priority?: number;
      conditions?: {
        identities?: string[];
        interests_any?: string[];
        duration_minutes_max?: number;
        styles_any?: string[];
      };
      route_id: string;
      reason?: string;
    }>
  >("data/route_matching_rules.json");
  const routes = getRoutes();
  const routeMap = new Map(routes.map((route) => [route.route_id, route]));

  const scored = rules
    .map((rule) => {
      const conditions = rule.conditions ?? {};
      let score = rule.priority ?? 0;
      const reasons: string[] = [];

      if (conditions.identities?.includes(profile.identity)) {
        score += 40;
        reasons.push(`身份匹配“${profile.identity}”`);
      }

      const matchedInterests = overlaps(profile.interests, conditions.interests_any);
      if (matchedInterests.length) {
        score += matchedInterests.length * 18;
        reasons.push(`兴趣匹配 ${matchedInterests.join("、")}`);
      }

      if (conditions.styles_any?.includes(profile.style)) {
        score += 18;
        reasons.push(`讲解风格匹配“${profile.style}”`);
      }

      if (conditions.duration_minutes_max && profile.durationMinutes <= conditions.duration_minutes_max) {
        score += 14 - Math.abs(conditions.duration_minutes_max - profile.durationMinutes) / 10;
        reasons.push(`时长适合 ${profile.durationMinutes} 分钟`);
      }

      return {
        route: routeMap.get(rule.route_id),
        reason: rule.reason ?? (reasons.join("，") || "根据你的画像选择最接近的预设路线。"),
        score,
      };
    })
    .filter((item): item is RouteMatch => Boolean(item.route))
    .sort((a, b) => b.score - a.score);

  return (
    scored[0] ?? {
      route: routes[0],
      reason: "没有找到完全匹配的规则，先推荐覆盖核心点位的默认路线。",
      score: 0,
    }
  );
}

export function findGuideScript(spotId: string, routeId?: string, agentId?: string) {
  const scripts = getGuideScripts().filter((script) => script.spot_id === spotId);
  return (
    scripts.find((script) => script.route_id === routeId && (!agentId || script.agent_id === agentId)) ??
    scripts.find((script) => script.route_id === routeId) ??
    scripts[0]
  );
}

export function retrieveChunks(query: string, spotId?: string) {
  const terms = query
    .toLowerCase()
    .split(/[\s,，。！？?]+/)
    .filter((term) => term.length > 1);

  return getKnowledgeChunks()
    .filter((chunk) => !spotId || chunk.spot_id === spotId)
    .map((chunk) => {
      const haystack = `${chunk.spot_name} ${chunk.title} ${chunk.content}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .sort((a, b) => b.score - a.score || b.content.length - a.content.length)
    .slice(0, 4);
}
