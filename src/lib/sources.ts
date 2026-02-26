// Source configuration for all RSS feeds and community endpoints

export interface SourceConfig {
  key: string;
  name: string;
  color: string;
  domain: string;
  feedUrl: string;
  type: "rss" | "reddit" | "chan" | "scrape" | "defillama";
}

export const NEWS_SOURCES: SourceConfig[] = [
  {
    key: "coindesk",
    name: "COINDESK",
    color: "#0052FF",
    domain: "coindesk.com",
    feedUrl: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    type: "rss",
  },
  {
    key: "theblock",
    name: "THE BLOCK",
    color: "#A8B3CF",
    domain: "theblock.co",
    feedUrl: "https://www.theblock.co/rss.xml",
    type: "rss",
  },
  {
    key: "decrypt",
    name: "DECRYPT",
    color: "#00D4AA",
    domain: "decrypt.co",
    feedUrl: "https://decrypt.co/feed",
    type: "rss",
  },
  {
    key: "cointelegraph",
    name: "COINTELEGRAPH",
    color: "#FFC107",
    domain: "cointelegraph.com",
    feedUrl: "https://cointelegraph.com/rss",
    type: "rss",
  },
  {
    key: "cryptoslate",
    name: "CRYPTOSLATE",
    color: "#8B5CF6",
    domain: "cryptoslate.com",
    feedUrl: "https://cryptoslate.com/feed/",
    type: "rss",
  },
  {
    key: "messari",
    name: "MESSARI",
    color: "#4DA6FF",
    domain: "messari.io",
    feedUrl: "https://messari.io/rss",
    type: "rss",
  },
  {
    key: "blockworks",
    name: "BLOCKWORKS",
    color: "#E8453C",
    domain: "blockworks.co",
    feedUrl: "https://blockworks.co/feed",
    type: "rss",
  },
  {
    key: "dlnews",
    name: "DL NEWS",
    color: "#FF4081",
    domain: "dlnews.com",
    feedUrl: "https://www.dlnews.com/arc/outboundfeeds/rss/",
    type: "rss",
  },
  {
    key: "bitcoinmag",
    name: "BITCOIN MAGAZINE",
    color: "#FF6B35",
    domain: "bitcoinmagazine.com",
    feedUrl: "https://bitcoinmagazine.com/feed",
    type: "rss",
  },
];

export const COMMUNITY_SOURCES: SourceConfig[] = [
  {
    key: "rcrypto",
    name: "R/CRYPTOCURRENCY",
    color: "#FF4500",
    domain: "reddit.com",
    feedUrl: "https://www.reddit.com/r/CryptoCurrency/hot.json?limit=8",
    type: "reddit",
  },
  {
    key: "rbitcoin",
    name: "R/BITCOIN",
    color: "#F7931A",
    domain: "reddit.com",
    feedUrl: "https://www.reddit.com/r/Bitcoin/hot.json?limit=8",
    type: "reddit",
  },
  {
    key: "rmoonshots",
    name: "R/CRYPTOMOONSHOTS",
    color: "#9B59B6",
    domain: "reddit.com",
    feedUrl: "https://www.reddit.com/r/CryptoMoonShots/hot.json?limit=8",
    type: "reddit",
  },
  {
    key: "rethfinance",
    name: "R/ETHFINANCE",
    color: "#627EEA",
    domain: "reddit.com",
    feedUrl: "https://www.reddit.com/r/ethfinance/hot.json?limit=8",
    type: "reddit",
  },
  {
    key: "rsolana",
    name: "R/SOLANA",
    color: "#14F195",
    domain: "reddit.com",
    feedUrl: "https://www.reddit.com/r/solana/hot.json?limit=8",
    type: "reddit",
  },
  {
    key: "biz",
    name: "/BIZ/",
    color: "#789922",
    domain: "boards.4chan.org",
    feedUrl: "https://a.4cdn.org/biz/catalog.json",
    type: "chan",
  },
];

// Source grid layout config — which sources go in which row
export const GRID_LAYOUT = {
  grid1: ["coindesk", "theblock", "cointelegraph"],
  grid2: ["decrypt", "cryptoslate", "messari"],
  grid3: ["blockworks", "dlnews", "bitcoinmag"],
  community1: ["rcrypto", "rbitcoin", "biz"],
  community2: ["rethfinance", "rmoonshots", "rsolana"],
};

// CoinGecko coin IDs for the price ticker
export const PRICE_COINS = [
  { id: "bitcoin", sym: "BTC" },
  { id: "ethereum", sym: "ETH" },
  { id: "solana", sym: "SOL" },
  { id: "binancecoin", sym: "BNB" },
  { id: "ripple", sym: "XRP" },
  { id: "cardano", sym: "ADA" },
  { id: "avalanche-2", sym: "AVAX" },
  { id: "dogecoin", sym: "DOGE" },
  { id: "polkadot", sym: "DOT" },
  { id: "chainlink", sym: "LINK" },
  { id: "uniswap", sym: "UNI" },
  { id: "polygon-ecosystem-token", sym: "POL" },
];
