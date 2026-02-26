import HomePageClient from "@/components/HomePageClient";
import { buildEmptyFeedData, getFeedsData } from "@/lib/feeds";

export const dynamic = "force-dynamic";

async function loadInitialFeeds() {
  try {
    return await getFeedsData();
  } catch (e) {
    console.error("Initial feed fetch failed:", e instanceof Error ? e.message : e);
    return buildEmptyFeedData();
  }
}

export default async function Page() {
  const initialFeeds = await loadInitialFeeds();
  return <HomePageClient initialFeeds={initialFeeds} />;
}
