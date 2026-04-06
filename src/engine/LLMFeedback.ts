/**
 * LLMFeedback — 调用 LLM API 生成一句反馈
 *
 * 成功路径：温暖的个性化鼓励
 * 失败路径：尖锐、真实、不虚伪安慰的话
 */

interface FeedbackResult {
  text: string
  error?: string
}

// 内置的 fallback 文案（当 LLM API 不可用时使用）
const FALLBACK_SUCCESS = [
  '你离把这件事做成又近了一步。',
  '先完成，再完美。你做到了。',
  '零号草稿达成。接下来只有打磨，没有从零开始。',
  '完美主义今天输了。你赢了。',
  '这就是行动力：不完美，但存在。',
  '大多数人还停留在想象。你已经跨过了那条线。',
]

const FALLBACK_FAILURE = [
  '想得很完美，但做不出来，终究什么也不是。',
  '你的点子很好。但点子不值钱，做出来才值钱。',
  '30分钟过去了。你选择了舒适区，而不是行动。',
  '下次你又想"先休息一下再开始"的时候，记住今天。',
  '拖延不会因为你认识到自己在拖延就停止。它只会因为你开始做而停止。',
  '不要再等"准备好了"。没有人是准备好了才开始的。',
]

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateFeedback(
  taskName: string,
  completed: boolean,
  apiKey: string,
  baseUrl: string = 'https://api.openai.com/v1'
): Promise<FeedbackResult> {
  // 如果没配置 API Key，使用内置文案
  if (!apiKey) {
    return {
      text: completed
        ? pickRandom(FALLBACK_SUCCESS)
        : pickRandom(FALLBACK_FAILURE),
    }
  }

  const systemPrompt = completed
    ? `你是一个极具感染力的行动力教练。用户刚刚在给定时间内完成了一项创造性任务。请用一句话（不超过30字）给予真诚、有力、个性化的鼓励。不要说"加油"这种空洞的话，而是基于他做出的具体任务来肯定他的行动力。语气松弛有温度，像一个有经验的极客伙伴。`
    : `你是一个尖锐真实的行动力教练。用户设了一个限时任务目标但没有完成。你需要用一句话（不超过40字）给出尖锐、真实、触及灵魂的反馈。不是"没关系"或"别灰心"这种虚伪安慰。而是类似"想的很完美，但做不出来，终究什么也不是"这种直击要害的话。但不要人身攻击，攻击的是拖延行为本身。`

  const userPrompt = completed
    ? `我刚刚完成了任务：「${taskName}」，请给我鼓励。`
    : `我计划完成任务「${taskName}」，但时间到了我没有完成。请给我真实的反馈。`

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 100,
        temperature: 0.9,
      }),
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`)
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    return { text: text || pickRandom(completed ? FALLBACK_SUCCESS : FALLBACK_FAILURE) }
  } catch (err) {
    // API 失败时优雅降级到内置文案
    return {
      text: completed
        ? pickRandom(FALLBACK_SUCCESS)
        : pickRandom(FALLBACK_FAILURE),
      error: String(err),
    }
  }
}
