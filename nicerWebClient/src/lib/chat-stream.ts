/** Read a single { reply } payload from our SSE chat endpoints. */
export async function readChatStreamReply(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let reply = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as { reply?: string; error?: string };
        if (payload.error) throw new Error(payload.error);
        if (payload.reply) reply = payload.reply;
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") throw parseErr;
      }
    }
  }

  return reply;
}
