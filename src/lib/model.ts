type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image_url";
          image_url: { url: string };
        }
    >;

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: ChatContent;
};

export function getChatCompletionsUrl(value?: string) {
  const baseUrl = (value?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  return baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
}

export async function requestChatCompletion(options: {
  messages: ChatCompletionMessage[];
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(getChatCompletionsUrl(options.baseUrl || process.env.OPENAI_CHAT_BASE_URL || process.env.OPENAI_BASE_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: options.messages,
      max_tokens: options.maxTokens ?? 520,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed ${response.status}: ${errorText.slice(0, 600)}`);
  }

  const payload = await response.json();
  return String(payload?.choices?.[0]?.message?.content ?? "").trim();
}
