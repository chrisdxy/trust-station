import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

const PLATFORM_DESC = '「正道驿站」是一个促进心性成长与商业互信的共建平台。核心理念：正心正念、非暴力沟通、行为留痕、择优合作。用户可在平台创建共同体、发布活动、管理项目、建立合作关系、记录认知留痕、申请纠纷协调。';

const SYSTEM_PROMPTS: Record<string, string> = {
  generate: `你是一个专业的写作助手，服务于${PLATFORM_DESC}请根据用户的要求生成简洁、专业、真诚的中文内容。直接返回生成结果，不要添加额外说明。`,
  summary: `你是一个专业的信息整理助手，服务于${PLATFORM_DESC}请用简洁的语言总结用户提供的内容，提取关键信息。直接返回摘要，不要添加额外说明。`,
  match: `你是一个智能推荐助手，服务于${PLATFORM_DESC}分析用户信息和可选列表，推荐最匹配的 3-5 项，并说明理由。返回格式：每行一个推荐项，格式为"推荐项 | 匹配度% | 匹配理由"。`,
  analyze: `你是一个专业的风险分析和评估助手，服务于${PLATFORM_DESC}请分析用户提供的内容，指出潜在风险和改进建议。返回格式：风险项 + 风险等级（高/中/低）+ 改进建议。`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, prompt, content, context } = body;

    if (!prompt && !content) {
      return NextResponse.json({ success: false, error: '缺少 prompts 或 content' }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[action as string] || SYSTEM_PROMPTS.generate;
    const userMessage = content
      ? `## 上下文\n${context || ''}\n\n## 待处理内容\n${content}\n\n## 指令\n${prompt || '请处理以上内容'}`
      : prompt;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: body.maxTokens || 2048,
        temperature: body.temperature || 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return NextResponse.json({ success: false, error: `AI 服务异常: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('AI API error:', error?.message);
    return NextResponse.json({ success: false, error: error?.message || 'AI 服务请求失败' }, { status: 500 });
  }
}
