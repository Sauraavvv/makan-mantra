import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const { slug } = await request.json();
  revalidatePath(`/buy/${slug}`);
  revalidatePath(`/rent/${slug}`);
  return NextResponse.json({ revalidated: true });
}
