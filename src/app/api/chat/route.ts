import { NextResponse } from "next/server";
import { findGuideScript, getAgents, getSpots, retrieveChunks } from "@/lib/content";
import { requestChatCompletion } from "@/lib/model";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    message: string;
    spotId?: string;
    routeId?: string;
    agentId?: string;
    visualContext?: string | null;
  };

  const chunks = retrieveChunks(payload.message, payload.spotId);
  const spot = getSpots().find((item) => item.spot_id === payload.spotId);
  const script = payload.spotId ? findGuideScript(payload.spotId, payload.routeId, payload.agentId) : undefined;
  const agent = getAgents().find((item) => item.agent_id === payload.agentId);
  const sourceText = chunks
    .map((chunk) => `${chunk.spot_name} - ${chunk.title}：${chunk.content}`)
    .join("\n\n")
    .slice(0, 900);
  const fallback = script?.content ?? spot?.summary ?? "我会结合当前路线和校园知识库回答，但这个问题需要更多上下文。";
  const agentName = agent?.name ?? "小A";

  if (process.env.OPENAI_API_KEY) {
    try {
      const answer = await requestChatCompletion({
        messages: [
          {
            role: "system",
            content:
              `你是复旦校园导览 App 的${agentName}，回答要自然、简洁、像现场导览。优先依据提供的校园知识片段和当前点位信息，不确定时说明资料不足，不要编造开放时间、门禁政策或具体个人经历。\n\n当前匹配导览员设定：\n${agent?.body ?? "使用通用校园导览员语气，亲切、清楚、克制。"}`,
          },
          {
            role: "user",
            content: `当前点位：${spot?.name ?? "未知点位"}\n当前点位简介：${spot?.summary ?? "暂无"}\n当前讲解：${fallback}\n\n上一张图片的视觉上下文：\n${payload.visualContext || "暂无。"}\n\n检索到的知识片段：\n${sourceText || "没有检索到更精确的知识片段。"}\n\n游客问题：${payload.message}\n\n请用中文回答，控制在 120-260 字；如果用户的问题是在追问上一张图片，请优先结合“视觉上下文”和当前点位回答；如果视觉上下文不足以判断，要说明需要再看一张更清楚的图片。`,
          },
        ],
        maxTokens: 520,
      });

      if (answer) {
        return NextResponse.json({
          answer,
          sources: chunks.map((chunk) => ({
            spot_id: chunk.spot_id,
            spot_name: chunk.spot_name,
            title: chunk.title,
          })),
          suggestions: script?.follow_up_suggestions ?? ["附近还有什么值得看？", "讲得轻松一点", "适合拍照的位置在哪里？"],
          model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_VISION_MODEL,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  const answer = sourceText
    ? `我先按当前${spot ? `点位“${spot.name}”` : "校园"}上下文回答：${sourceText}`
    : `我暂时没有检索到更精确的知识片段。基于当前讲解：${fallback}`;

  return NextResponse.json({
    answer,
    sources: chunks.map((chunk) => ({
      spot_id: chunk.spot_id,
      spot_name: chunk.spot_name,
      title: chunk.title,
    })),
    suggestions: script?.follow_up_suggestions ?? ["附近还有什么值得看？", "讲得轻松一点", "适合拍照的位置在哪里？"],
  });
}
