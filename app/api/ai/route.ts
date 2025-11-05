import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { model, messages } = await request.json();
    if (!model || !messages) {
      return NextResponse.json(
        { error: 'Missing model or messages' },
        { status: 400 }
      );
    }

    if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
      return await proxyDeepSeek(messages, model);
    } else if (model === 'gpt-4o-mini') {
      return await proxyOpenAI(messages);
    } else if (model === 'gemini-flash') {
      return await proxyGemini(messages);
    } else if (model === 'nebius-studio') {
      return await proxyNebius(messages);
    } else if (model === 'claude') {
      return await proxyClaude(messages);
    } else if (model === 'gemini-flash-lite') {
      return await proxyGeminiFlashLite(messages);
    } else if (model === 'gemini-2-5-flash-lite') {
      return await proxyGemini25FlashLite(messages);
    } else {
      return NextResponse.json(
        { error: 'Unknown model' },
        { status: 400 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Internal error' },
      { status: 500 }
    );
  }
}

async function proxyDeepSeek(messages: any[], model: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const deepseekModel = model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
  const requestBody: any = {
    model: deepseekModel,
    messages,
    stream: true,
  };
  if (deepseekModel === 'deepseek-chat') {
    requestBody.temperature = 0.7;
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  return streamProxy(res);
}

async function proxyOpenAI(messages: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
    }),
  });
  return streamProxy(res);
}

async function proxyGemini(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const geminiMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
  const res = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?alt=sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: { temperature: 1, topP: 1, maxOutputTokens: 1024 },
      safetySettings: [],
    }),
  });
  return streamProxy(res);
}

async function proxyNebius(messages: any[]) {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEBIUS_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const res = await fetch('https://api.studio.nebius.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3-0324',
      store: false,
      messages,
      max_tokens: 1024,
      temperature: 1,
      top_p: 1,
      n: 1,
      stream: true,
      presence_penalty: 0,
      frequency_penalty: 0,
    }),
  });
  return streamProxy(res);
}

async function proxyClaude(messages: any[]) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'CLAUDE_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const claudeMessages = messages.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-7-sonnet-20250219',
      messages: claudeMessages,
      max_tokens: 2048,
      stream: true,
    }),
  });
  return streamProxy(res);
}

async function proxyGeminiFlashLite(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const geminiMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
  const res = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?alt=sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 500 },
      safetySettings: [],
    }),
  });
  
  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: errText },
      { status: res.status }
    );
  }
  return streamProxy(res);
}

async function proxyGemini25FlashLite(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not set in environment' },
      { status: 500 }
    );
  }
  const geminiMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2-5-flash-lite:generateContent?alt=sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 500 },
      safetySettings: [],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: errText },
      { status: res.status }
    );
  }
  return streamProxy(res);
}

function streamProxy(res: Response) {
  // 直接转发流式响应
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  });
}
