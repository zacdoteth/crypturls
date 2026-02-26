import { NextResponse } from "next/server";
import { getOrSetCache, setCache } from "@/lib/cache";
import { fetchJsonWithTimeout } from "@/lib/http";

export interface FngData {
  value: number;
  label: string;
}

export async function GET() {
  const cacheKey = "fng";

  try {
    const data = await getOrSetCache(cacheKey, 30 * 60 * 1000, async () => {
      const json = await fetchJsonWithTimeout<{
        data?: Array<{ value: string; value_classification: string }>;
      }>("https://api.alternative.me/fng/?limit=1", {
        timeoutMs: 8000,
        headers: { "User-Agent": "CryptUrls/1.0" },
      });

      if (json?.data?.[0]) {
        return {
          value: parseInt(json.data[0].value, 10),
          label: json.data[0].value_classification,
        };
      }

      throw new Error("Invalid F&G response");
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("F&G fetch failed:", e);
    const fallback = { value: 50, label: "Neutral" };
    setCache(cacheKey, fallback, 5 * 60 * 1000);
    return NextResponse.json(fallback);
  }
}
