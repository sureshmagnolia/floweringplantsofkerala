import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return new NextResponse('Missing id parameter', { status: 400 });
    }

    // Server-side fetch bypasses CORS and browser security policies!
    const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const response = await fetch(driveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Pretend to be a normal browser
      }
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch from Google Drive', { status: response.status });
    }

    // Get the raw image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Pipe the image back to the frontend
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate'
      },
    });
  } catch (error) {
    console.error('Error serving image proxy:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
