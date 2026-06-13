import { NextResponse } from "next/server";
import { fetchYouTubeMetadata } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body.url || "");

    if (!url.trim()) {
      return NextResponse.json({ error: "YouTube URL을 입력해주세요." }, { status: 400 });
    }

    const metadata = await fetchYouTubeMetadata(url);
    return NextResponse.json(metadata);
  } catch {
    return NextResponse.json(
      {
        title: "YouTube 레시피",
        isLimited: true,
        warning: "YouTube 정보를 가져오지 못했어요. URL 정보만으로 분석을 이어갈게요."
      },
      { status: 200 }
    );
  }
}
