import axios from "axios";
import { Cast } from "@/src/types/Cast";
import { prettyLog } from "../app/lib/logs";

const API_URL = process.env.EXPO_PUBLIC_ANKY_API_URL;
const POIESIS_API_KEY = process.env.POIESIS_API_KEY;

interface FeedResponse {
  casts: Cast[];
  next?: {
    cursor: string;
  };
}

interface FeedOptions {
  viewer_fid?: number;
  cursor?: string;
  limit?: number;
  fid: number;
}

// Cache to store already fetched casts to avoid duplicates
let fetchedCastIds = new Set<string>();

export const getLandingFeed = async ({
  fid = 16098,
  viewer_fid,
  cursor,
  limit = 12,
}: FeedOptions): Promise<FeedResponse> => {
  try {
    const options = {
      method: "GET",
      url: `https://api.neynar.com/v2/farcaster/feed/following`,
      params: {
        fid: fid,
        viewer_fid: viewer_fid || undefined,
        cursor: cursor || undefined,
        with_recasts: true,
        limit: limit * 2, // Fetch extra to account for non-image posts
      },
      headers: {
        accept: "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY || "NEYNAR_API_DOCS",
      },
    };

    const response = await axios.request(options);

    if (response.status !== 200) {
      throw new Error("Failed to fetch feed");
    }

    // Filter casts to only include new, unique casts with image embeds
    const castsWithImages = response.data.casts
      .filter((cast: Cast) => {
        const hasImage =
          cast.embeds?.length > 0 &&
          cast.embeds[0].metadata?.content_type?.startsWith("image/");
        const isNew = !fetchedCastIds.has(cast.hash);

        if (isNew && hasImage) {
          fetchedCastIds.add(cast.hash);
          return true;
        }
        return false;
      })
      .slice(0, limit);

    prettyLog(castsWithImages, "FILTERED FEED - ONLY CASTS WITH IMAGES");

    // Clean up cache if it gets too large
    if (fetchedCastIds.size > 1000) {
      fetchedCastIds.clear();
    }

    return {
      casts: castsWithImages,
      next: response.data.next,
    };
  } catch (error) {
    console.error("Error fetching landing feed:", error);
    throw error;
  }
};

// TODO: Add this endpoint on the backend
export const getCast = async (
  hash: string,
  userToken: string
): Promise<Cast> => {
  try {
    let endpoint = `${API_URL}/farcaster/cast/${hash}`;
    const response = await axios.get(endpoint, {
      headers: {
        "api-key": process.env.POIESIS_API_KEY!,
        token: userToken,
        "User-Agent": `anky-mobile-app-${process.env.ENVIRONMENT}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching cast:", error);
    throw error;
  }
};
