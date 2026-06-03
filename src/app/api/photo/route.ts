import { NextResponse } from "next/server";
import { findGuideScript, getPhotoTargets, getSpots } from "@/lib/content";
import { getChatCompletionsUrl } from "@/lib/model";

function getMimeType(file: File) {
  return file.type || "image/png";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const photo = formData.get("photo");
  const spotId = String(formData.get("spotId") ?? "");
  const routeId = String(formData.get("routeId") ?? "");
  const spots = getSpots();
  const targets = getPhotoTargets();
  const spot = spots.find((item) => item.spot_id === spotId) ?? spots[0];
  const script = findGuideScript(spot.spot_id, routeId);
  const target = targets.find((item) => {
    const candidate = item as { spot_id?: string };
    return candidate.spot_id === spot.spot_id;
  });
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

  if (apiKey && photo instanceof File && photo.size > 0) {
    const bytes = Buffer.from(await photo.arrayBuffer());
    const imageUrl = `data:${getMimeType(photo)};base64,${bytes.toString("base64")}`;
    const response = await fetch(getChatCompletionsUrl(process.env.OPENAI_VISION_BASE_URL || process.env.OPENAI_BASE_URL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `你是复旦校园导览 App 的图像理解模块。请先描述图片中实际可见内容，再判断它是否可能对应当前点位，不要编造看不见的细节。\n\n当前点位：${spot.name}\n点位简介：${spot.summary}\n请用中文回答：1. 图片里看到了什么；2. 是否像当前点位；3. 游客下一步可以问什么。`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 420,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Vision model request failed",
          status: response.status,
          detail: errorText.slice(0, 800),
        },
        { status: 502 },
      );
    }

    const payload = await response.json();
    const answer = payload?.choices?.[0]?.message?.content;

    return NextResponse.json({
      matchedSpot: spot,
      confidence: spotId ? 0.72 : 0.48,
      title: `图像理解：${spot.name}`,
      answer: answer || "模型返回了空结果。",
      target,
      suggestions: script?.follow_up_suggestions ?? ["这张图像里最明显的建筑是什么？", "它和当前点位有什么关系？"],
      model,
    });
  }

  return NextResponse.json({
    matchedSpot: spot,
    confidence: spotId ? 0.82 : 0.54,
    title: `可能是${spot.name}`,
    answer: `我先结合当前位置判断，这张照片大概率和“${spot.name}”相关。${script?.content ?? spot.summary ?? ""}`,
    target,
    suggestions: script?.follow_up_suggestions ?? ["这个地方有什么历史？", "附近下一站是哪？"],
  });
}
