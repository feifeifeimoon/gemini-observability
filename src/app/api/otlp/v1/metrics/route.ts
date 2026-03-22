import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 简单消费掉 body，防止流未关闭
    await request.text();
    return new Response(JSON.stringify({}), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    // 即使解析失败也返回 200，保持安静
    return new Response(JSON.stringify({}), { status: 200 });
  }
}
