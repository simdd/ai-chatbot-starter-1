import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 设置CORS头
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const models: Array<{ value: string; label: string; disabled: boolean }> = [];
    
    // 检查环境变量并添加对应的模型
    if (process.env.DEEPSEEK_API_KEY) {
      models.push(
        { value: "deepseek-chat", label: "DeepSeek-V3", disabled: false },
        { value: "deepseek-reasoner", label: "DeepSeek-R1", disabled: false }
      );
    }
    
    if (process.env.OPENAI_API_KEY) {
      models.push({ value: "gpt-4o-mini", label: "GPT-4o Mini (OpenAI)", disabled: false });
    }
    
    if (process.env.GEMINI_API_KEY) {
      models.push(
        { value: "gemini-flash", label: "Gemini 2.0 Flash (Google)", disabled: false },
        { value: "gemini-flash-lite", label: "Gemini 2.0 Flash-Lite (Google)", disabled: false }
      );
    }
    
    if (process.env.CLAUDE_API_KEY) {
      models.push({ value: "claude", label: "Claude 3 Sonnet (Anthropic)", disabled: false });
    }
    
    if (process.env.NEBIUS_API_KEY) {
      models.push({ value: "nebius-studio", label: "Nebius Studio", disabled: false });
    }
    
    // 如果没有配置任何API密钥，返回默认的DeepSeek模型
    if (models.length === 0) {
      models.push(
        { value: "deepseek-chat", label: "DeepSeek-V3", disabled: false },
        { value: "deepseek-reasoner", label: "DeepSeek-R1", disabled: false }
      );
    }
    
    return NextResponse.json({ models }, {
      status: 200,
      headers,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message || 'Internal error',
      models: [
        { value: "deepseek-chat", label: "DeepSeek-V3", disabled: false },
        { value: "deepseek-reasoner", label: "DeepSeek-R1", disabled: false }
      ]
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
