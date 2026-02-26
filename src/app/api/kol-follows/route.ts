import { NextResponse } from "next/server";
import { getOrSetCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export interface NotableKol {
  name: string;
  handle: string;
  avatar: string;
}

export interface TrendingAccount {
  handle: string;
  name: string;
  avatar: string;
  followers: number; // raw number, formatted on client
  accountAge: string; // "7D", "36D", "492D", "10h"
  newKolFollows: number; // total KOL follows in timeframe
  notableKols: NotableKol[];
}

// Notable KOLs that might show up in the "Notable KOLs" column
const NOTABLE_KOLS: NotableKol[] = [
  { name: "Cobie", handle: "cobie", avatar: "" },
  { name: "Hsaka", handle: "HsakaTrades", avatar: "" },
  { name: "Ansem", handle: "blknoiz06", avatar: "" },
  { name: "Andrew Kang", handle: "Rewkang", avatar: "" },
  { name: "Arthur Hayes", handle: "CryptoHayes", avatar: "" },
  { name: "Pentoshi", handle: "Pentosh1", avatar: "" },
  { name: "Raoul Pal", handle: "RaoulGMI", avatar: "" },
  { name: "Trader SZ", handle: "trader_sz", avatar: "" },
  { name: "Zhu Su", handle: "zhusu", avatar: "" },
  { name: "GCR", handle: "GCRClassic", avatar: "" },
  { name: "CL", handle: "CL207", avatar: "" },
  { name: "Flood", handle: "ThinkingUSD", avatar: "" },
  { name: "Loomdart", handle: "loomdart", avatar: "" },
  { name: "Degen Spartan", handle: "DegenSpartan", avatar: "" },
  { name: "Tetranode", handle: "Tetranode", avatar: "" },
];

// TODO: Replace with real data from TwitterScore / Sorsa / leak.me partnership
// This generates realistic mock data matching leak.me's aggregated model
function generateMockData(): TrendingAccount[] {
  const accounts: Array<{
    name: string;
    handle: string;
    followers: number;
    age: string;
  }> = [
    { name: "The Benchmark", handle: "BenchmarkCrypto", followers: 697, age: "7D" },
    { name: "nookplot", handle: "nookplot", followers: 462, age: "36D" },
    { name: "SIBYL", handle: "sibylai_", followers: 247, age: "10h" },
    { name: "HyperClaw", handle: "HyperClawX", followers: 437, age: "9D" },
    { name: "Aurelie", handle: "aurelie_eth", followers: 283, age: "492D" },
    { name: "ARCHER", handle: "ArcherDAO", followers: 942, age: "125D" },
    { name: "Vance Lever", handle: "VanceLever", followers: 971, age: "4D" },
    { name: "Alfred", handle: "alfred_crypto", followers: 828, age: "1D" },
    { name: "DecentralizedXu", handle: "DecentralXu", followers: 462, age: "492D" },
    { name: "max", handle: "maxcrypto_", followers: 689, age: "492D" },
    { name: "Ori!", handle: "Ori_crypto", followers: 415, age: "492D" },
    { name: "SK", handle: "SK_defi", followers: 1000, age: "431D" },
    { name: "techdollar", handle: "techdollar", followers: 555, age: "2D" },
    { name: "Marty", handle: "MartyParty_", followers: 453, age: "26D" },
    { name: "Markets, Inc.", handle: "MarketsInc", followers: 848, age: "182D" },
    { name: "QuiverAI", handle: "QuiverAI_", followers: 934, age: "15h" },
    { name: "velora protocol", handle: "veloraprotocol", followers: 312, age: "58D" },
    { name: "shape.eth", handle: "shape_eth", followers: 189, age: "340D" },
    { name: "buidl", handle: "buidl_xyz", followers: 670, age: "120D" },
    { name: "web3signer", handle: "web3signer", followers: 520, age: "210D" },
  ];

  // Assign realistic KOL follow counts (descending-ish)
  const kolCounts = [34, 24, 12, 7, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 3, 3, 3, 3, 2, 2];

  return accounts.map((acct, i) => {
    // Pick random notable KOLs for this account
    const notableCount = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 5) + 1;
    const shuffled = [...NOTABLE_KOLS].sort(() => Math.random() - 0.5);
    const notables = shuffled.slice(0, Math.min(notableCount, kolCounts[i] || 1));

    return {
      handle: acct.handle,
      name: acct.name,
      avatar: "", // placeholder — real data would have profile pic URLs
      followers: acct.followers,
      accountAge: acct.age,
      newKolFollows: kolCounts[i] || 1,
      notableKols: notables,
    };
  });
}

export async function GET() {
  const data = await getOrSetCache("kol-follows", 5 * 60 * 1000, async () => {
    // TODO: Replace with real API call:
    // Option A: TwitterScore ($49-99/mo) — friendship history endpoint
    // Option B: Sorsa ($200/mo) — following list + diff
    // Option C: leak.me partnership — revenue share deal
    return generateMockData();
  });

  return NextResponse.json(data);
}
