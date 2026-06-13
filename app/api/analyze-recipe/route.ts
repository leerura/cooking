import { NextResponse } from "next/server";
import { GoogleGenAI, MediaResolution } from "@google/genai";
import { normalizeIngredientName } from "@/lib/ingredients";
import { extractYouTubeVideoId } from "@/lib/youtube";
import type {
  IngredientRole,
  MissingImpact,
  Recipe,
  RecipeConfidence,
  RecipeData,
  RecipeIngredient,
  UserIngredient,
  YouTubeMetadata
} from "@/lib/types";

type AnalyzeRecipeInput = {
  url: string;
  metadata: YouTubeMetadata;
  userIngredients: UserIngredient[];
};

const SYSTEM_PROMPT = `You are a Korean cooking assistant for broke college students living alone.
You must analyze the provided YouTube cooking video directly.
Extract only what is visible, spoken, written on-screen, or clearly shown in the video.
Do not invent ingredients, amounts, tools, or steps.
If an ingredient, amount, or step is uncertain, omit it or mark confidence as "낮음".
Return strict JSON only.
Do not include markdown.
Do not wrap the JSON in code fences.
The goal is not to make a complete recipe from imagination.
The goal is to create an honest draft based on the video evidence.`;

function stripCodeFences(value: string): string {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(value: string): string | undefined {
  const stripped = stripCodeFences(value);
  if (stripped.startsWith("{") && stripped.endsWith("}")) return stripped;

  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return stripped.slice(start, end + 1);
}

function parseGeminiRecipeJson(text: string): RawRecipeAnalysis {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    throw new Error("empty_json");
  }

  const parsed = JSON.parse(jsonText) as RawRecipeAnalysis | { recipeData?: Partial<RecipeData>; confidence?: RecipeConfidence; needsReview?: boolean };
  if ("recipeData" in parsed && parsed.recipeData) {
    return {
      ...parsed.recipeData,
      confidence: parsed.confidence,
      needsReview: parsed.needsReview
    };
  }

  return parsed as RawRecipeAnalysis;
}

const INGREDIENT_ROLES: IngredientRole[] = ["base", "main", "sauce", "seasoning", "garnish", "topping", "finishing", "other"];
const MISSING_IMPACTS: MissingImpact[] = ["cannot_cook", "major_change", "minor_change", "garnish_only"];

function normalizeIngredientRole(value: unknown): IngredientRole | undefined {
  if (typeof value !== "string") return undefined;
  return INGREDIENT_ROLES.includes(value as IngredientRole) ? (value as IngredientRole) : "other";
}

function normalizeMissingImpact(value: unknown, required: boolean): MissingImpact {
  if (typeof value === "string" && MISSING_IMPACTS.includes(value as MissingImpact)) {
    return value as MissingImpact;
  }
  return required ? "cannot_cook" : "minor_change";
}

function normalizeNecessityScore(value: unknown): number | undefined {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return undefined;
  return Math.min(1, Math.max(0, score));
}

function normalizeRecipeIngredient(item: Partial<RecipeIngredient>, required: boolean): RecipeIngredient {
  const name = String(item.name || "").trim() || "확인 필요";
  const role = normalizeIngredientRole(item.role);
  const necessityScore = normalizeNecessityScore(item.necessityScore);
  return {
    id: item.id || crypto.randomUUID(),
    name,
    normalizedName: normalizeIngredientName(item.normalizedName || name),
    amount: item.amount,
    required,
    category: item.category || "기타",
    ...(role ? { role } : {}),
    missingImpact: normalizeMissingImpact(item.missingImpact, required),
    ...(necessityScore === undefined ? {} : { necessityScore })
  };
}

type RawRecipeAnalysis = Partial<RecipeData> & {
  confidence?: RecipeConfidence;
  needsReview?: boolean;
};

function getInitialRecipeStatus(confidence: RecipeConfidence, needsReview: boolean): Recipe["status"] {
  return needsReview || confidence === "낮음" ? "needs_review" : "draft";
}

function coerceRecipe(raw: RawRecipeAnalysis, input: AnalyzeRecipeInput): Recipe {
  const now = new Date().toISOString();
  const requiredIngredients = (raw.requiredIngredients || []).map((item) => normalizeRecipeIngredient(item, true));
  const optionalIngredients = (raw.optionalIngredients || []).map((item) => normalizeRecipeIngredient(item, false));
  const videoId = extractYouTubeVideoId(input.url) || input.metadata.videoId || crypto.randomUUID();
  const confidence = raw.confidence || (input.metadata.description ? "보통" : "낮음");
  const needsReview = raw.needsReview ?? !input.metadata.description;
  return {
    id: crypto.randomUUID(),
    sourceUrl: input.url,
    youtubeVideoId: videoId,
    thumbnailUrl: input.metadata.thumbnailUrl,
    channelName: input.metadata.channelName,
    title: raw.title || input.metadata.title || "YouTube 레시피",
    summary: raw.summary || "영상 설명 정보가 부족해 레시피 초안으로 정리했어요.",
    requiredIngredients,
    optionalIngredients,
    substituteSuggestions: raw.substituteSuggestions || [],
    barrierFactors: raw.barrierFactors || [],
    cookingTools: raw.cookingTools || [],
    cookingTimeMinutes: raw.cookingTimeMinutes,
    difficulty: raw.difficulty || "보통",
    dishType: raw.dishType,
    steps: (raw.steps || [])
      .map((step, index) => ({
        order: Number(step.order || index + 1),
        text: String(step.text || "")
      }))
      .filter((step) => step.text.trim()),
    studentComment: raw.studentComment || "저장 전에 재료와 순서를 한 번 확인해보세요.",
    confidence,
    needsReview,
    status: getInitialRecipeStatus(confidence, needsReview),
    createdAt: now,
    updatedAt: now
  };
}

export async function POST(request: Request) {
  if (!process.env.GCP_PROJECT_ID) {
    return NextResponse.json(
      { error: "GCP_PROJECT_ID가 설정되어 있지 않아요. .env.local을 확인해주세요." },
      { status: 500 }
    );
  }

  try {
    const input = (await request.json()) as AnalyzeRecipeInput;

    if (!input.url || !input.metadata?.title) {
      return NextResponse.json({ error: "분석할 URL과 영상 제목이 필요해요." }, { status: 400 });
    }

    const userPrompt = `Analyze the attached YouTube cooking video directly and produce a structured recipe draft.
Use metadata only as supplementary context.
Do not infer a standard recipe just because the title sounds familiar.
If the video does not clearly show or mention an ingredient, do not include it as required.
If an amount is not clearly visible or spoken, omit the amount field.
If the cooking order is unclear, include only the steps that are clearly shown.
If key information is missing, set confidence to "낮음" and needsReview to true.
In studentComment, explain what may need manual checking.

Return JSON matching this shape:
{
  "recipeData": {
    "title": "string",
    "summary": "string",
    "requiredIngredients": [{"name":"string","amount":"optional string","required":true,"category":"탄수화물|단백질|채소|양념|유제품|가공식품|기타","role":"base|main|sauce|seasoning|garnish|topping|finishing|other","missingImpact":"cannot_cook|major_change|minor_change|garnish_only","necessityScore":0.0}],
    "optionalIngredients": [{"name":"string","amount":"optional string","required":false,"category":"탄수화물|단백질|채소|양념|유제품|가공식품|기타","role":"base|main|sauce|seasoning|garnish|topping|finishing|other","missingImpact":"cannot_cook|major_change|minor_change|garnish_only","necessityScore":0.0}],
    "substituteSuggestions": [{"original":"string","substitutes":["string"],"reason":"string"}],
    "barrierFactors": ["string"],
    "cookingTools": ["string"],
    "cookingTimeMinutes": number,
    "difficulty": "쉬움|보통|어려움",
    "dishType": "string",
    "steps": [{"order":1,"text":"string"}],
    "studentComment": "string"
  },
  "confidence": "높음|보통|낮음",
  "needsReview": boolean
}

Rules:
- Return only valid JSON. Do not include markdown.
- Do not wrap the JSON in code fences.
- Prefer Korean output.
- Analyze the attached YouTube video, not just the metadata.
- Use metadata only as supplementary context.
- Separate only requiredIngredients, optionalIngredients, substituteSuggestions, and barrierFactors.
- Include seasonings as required if they are necessary.
- Do not create a separate 상비 양념 section.
- Do not assume that every student already owns seasonings.
- Keep requiredIngredients and optionalIngredients, but always add role, missingImpact, and necessityScore to each ingredient when the video gives enough context.
- The app uses missingImpact before the legacy required boolean to decide availability. required remains for compatibility.
- role criteria:
  - base: rice, noodles, bread, tortillas, or another food base.
  - main: meat, egg, tofu, kimchi, or another identity-defining core ingredient.
  - sauce: soy sauce, gochujang, doenjang, mayonnaise, or core sauce ingredients.
  - seasoning: salt, sugar, pepper, chili flakes, or flavor-adjusting seasonings.
  - garnish: sesame seeds, parsley, decorative herbs, gomyeong, or decorative ingredients that are not needed to cook.
  - topping: gim flakes, cheese, katsuobushi, or ingredients placed on top. If it defines the dish identity, use main instead.
  - finishing: finishing sesame oil, finishing pepper, or aromatic ingredients added at the end.
  - other: ambiguous cases.
- missingImpact criteria:
  - cannot_cook: The dish cannot be made without it.
  - major_change: The dish can be made, but its identity or flavor changes greatly.
  - minor_change: Taste, aroma, or texture changes a little, but a college student can still cook it.
  - garnish_only: Decorative, garnish, topping, or finishing use only; the dish is available without it.
- necessityScore must be a number from 0 to 1. Use higher scores for identity-defining ingredients and lower scores for garnish or finishing ingredients.
- Sesame seeds, toasted sesame, black sesame, parsley, decorative herbs, gomyeong, toppings, finishing sesame oil, and finishing pepper should be garnish, topping, or finishing with garnish_only or minor_change unless they are core to the dish.
- If sesame, perilla powder, gim flakes, or a similar ingredient appears in the dish name or defines the dish identity, such as 깨국수, 들깨수제비, 김가루주먹밥, or 김밥-style dishes, classify it as main with cannot_cook or major_change.
- Do not invent ingredients, amounts, tools, or steps.
- Add barrierFactors if expensive, unusual, time-consuming, dish-heavy, or tool-heavy.
- Add realistic Korean college student substitutes.
- Practical substitutes examples: 생크림 -> 우유 + 치즈, 대파 -> 양파 or 파, 참치캔 -> 스팸 or 닭가슴살캔, 밥 -> 햇반 or 즉석밥.
- Barrier examples: 오븐, 생크림, 파마산치즈, 월계수잎, 와인, 많은 허브, 긴 조리시간, 설거지 많음.
- confidence "높음": The video clearly shows or says most required ingredients and main steps.
- confidence "보통": The video shows enough to make a reasonable draft, but some amounts or minor steps are unclear.
- confidence "낮음": The video is too fast, lacks speech/text, hides ingredients, or requires guessing.
- If video evidence is insufficient, keep the draft sparse and mark confidence as "낮음".
- If you need to explain evidence quality, include it inside studentComment. Do not add unsupported top-level fields.

URL: ${input.url}
Title: ${input.metadata.title}
Channel: ${input.metadata.channelName || "unknown"}
Thumbnail URL: ${input.metadata.thumbnailUrl || "unknown"}
Description: ${input.metadata.description || "No description available."}
User current ingredients: ${JSON.stringify(input.userIngredients || [])}`;

    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION ?? "global"
    });

    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: input.url,
                mimeType: "video/mp4"
              }
            },
            {
              text: userPrompt
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0,
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      return NextResponse.json(
        { error: "AI 분석에 실패했어요.", details: "Gemini 응답이 비어 있어요." },
        { status: 502 }
      );
    }

    const parsed = parseGeminiRecipeJson(responseText);
    return NextResponse.json(coerceRecipe(parsed, input));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isVideoAccessError = /file|video|youtube|uri|url|fetch|download|media|permission|not found|invalid argument|unsupported/i.test(message);
    const isAuthError =
      /credential|credentials|auth|authentication|permission|unauthenticated|ADC|application-default/i.test(message);
    if (isAuthError) {
      return NextResponse.json(
        {
          error:
            "Google Cloud 인증 정보가 설정되어 있지 않아요. 로컬에서는 gcloud auth application-default login 또는 서비스 계정 설정이 필요해요.",
          details: message
        },
        { status: 500 }
      );
    }

    if (isVideoAccessError) {
      return NextResponse.json(
        {
          error: "영상을 직접 분석하지 못했어요. 공개 영상인지 확인하거나 다시 시도해주세요.",
          details: message
        },
        { status: 502 }
      );
    }

    if (message === "empty_json" || error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "AI 분석에 실패했어요.",
          details: "Gemini 응답을 JSON으로 해석하지 못했어요."
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "AI 분석에 실패했어요.",
        details: message || "unknown"
      },
      { status: 500 }
    );
  }
}
