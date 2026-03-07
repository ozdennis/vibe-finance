// src/app/share/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * PWA Share Target Handler
 * Receives shared images from other apps and redirects to dashboard with receipt data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const text = formData.get("text") as string;
    const file = formData.get("receipt") as File | null;

    // Store share data in cookie for dashboard to pick up
    const shareData = {
      title,
      text,
      hasImage: !!file,
      timestamp: Date.now(),
    };

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("share_data", JSON.stringify(shareData), {
      maxAge: 60 * 5, // 5 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Share target error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
