import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await request.text();
    return new Response(JSON.stringify({}), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    return new Response(JSON.stringify({}), { status: 200 });
  }
}
