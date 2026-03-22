import { NextResponse } from 'next/server';
import { processTracePayload } from '@/lib/telemetry/processor';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (!text) return NextResponse.json({}, { status: 200 });
    
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      console.error('JSON Parse error in traces:', e);
      return NextResponse.json({}, { status: 200 });
    }

    // Wrap the background processing to ensure it doesn't crash the response
    processTracePayload(payload).catch(e => {
      console.error('Background trace processing error:', e);
    });
    
    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error('Fatal error in traces route:', error);
    return NextResponse.json({}, { status: 200 });
  }
}
