export type Profile = {
  firstVisit: boolean;
  age: string;
  identity: string;
  interests: string[];
  durationMinutes: number;
  style: string;
  intro: string;
};

export type Spot = {
  spot_id: string;
  name: string;
  aliases?: string[];
  campus?: string;
  type?: string;
  lat?: number;
  lng?: number;
  default_trigger_radius_meters?: number;
  map_icon?: string;
  summary?: string;
  available?: boolean;
  source_status?: string;
};

export type RouteStop = {
  spot_id: string;
  order: number;
  estimated_stay_minutes?: number;
  trigger_radius_meters?: number;
  guide_script_id?: string;
  reason?: string;
};

export type CampusRoute = {
  route_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  distance_meters?: number;
  tags?: string[];
  suitable_for?: string[];
  interests?: string[];
  style?: string;
  start_spot_id?: string;
  stops: RouteStop[];
  ending_message?: string;
};

export type GuideScript = {
  guide_script_id: string;
  spot_id: string;
  route_id?: string;
  agent_id?: string;
  audience?: string;
  style?: string;
  language?: string;
  duration_seconds?: number;
  title: string;
  content: string;
  follow_up_suggestions?: string[];
};

export type Agent = {
  agent_id: string;
  name: string;
  tone?: string;
  default_language?: string;
  body: string;
};

export type RouteMatch = {
  route: CampusRoute;
  agent_id: string;
  style: string | undefined;
  reason: string;
  score: number;
};

export type KnowledgeChunk = {
  spot_id: string;
  spot_name: string;
  title: string;
  content: string;
};
