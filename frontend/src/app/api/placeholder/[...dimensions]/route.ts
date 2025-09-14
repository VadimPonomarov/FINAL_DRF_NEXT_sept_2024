/**
 * API route for generating placeholder images
 * GET /api/placeholder/[width]/[height]
 * GET /api/placeholder/[width]x[height]
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dimensions: string[] }> }
) {
  try {
    const dimensions = await params;
    let width = 800;
    let height = 400;

    // Parse dimensions from URL
    if (dimensions.dimensions && dimensions.dimensions.length >= 2) {
      // Format: /api/placeholder/800/400
      width = parseInt(dimensions.dimensions[0]) || 800;
      height = parseInt(dimensions.dimensions[1]) || 400;
    } else if (dimensions.dimensions && dimensions.dimensions.length === 1) {
      // Format: /api/placeholder/800x400
      const dimensionStr = dimensions.dimensions[0];
      const match = dimensionStr.match(/(\d+)x(\d+)/);
      if (match) {
        width = parseInt(match[1]) || 800;
        height = parseInt(match[2]) || 400;
      }
    }

    // Get optional parameters from query string
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || 'Car Image';
    const bgColor = searchParams.get('bg') || 'cccccc';
    const textColor = searchParams.get('color') || '666666';

    // Generate placeholder URL using via.placeholder.com
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;

    // Fetch the image from placeholder service
    const response = await fetch(placeholderUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch placeholder image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[Placeholder API] Error:', error);
    
    // Return a simple SVG placeholder as fallback
    const svg = `
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#cccccc"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" 
              fill="#666666" text-anchor="middle" dominant-baseline="middle">
          Car Image
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
}
