import { type NextRequest, NextResponse } from 'next/server';
import { dummyApiHelpers } from '@/app/api/(helpers)/dummy';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json(
      { error: 'Recipe ID is required' },
      { status: 400 }
    );
  }

  try {
    const recipe = await dummyApiHelpers.fetchRecipeById(id);

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error in recipe details API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe details' },
      { status: 500 }
    );
  }
}
