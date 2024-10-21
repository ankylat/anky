import { SheetDefinition, registerSheet } from "react-native-actions-sheet";

import ShareCastModal from "./ShareCastModal";
import CastViewerModal from "./CastViewerModal";
registerSheet("share-cast-modal", ShareCastModal);
registerSheet("cast-viewer-modal", CastViewerModal);

declare module "react-native-actions-sheet" {
  interface Sheets {
    "share-cast-modal": SheetDefinition<{
      payload: {
        castHash: string;
        whoIsSharing: number;
      };
    }>;
    "cast-viewer-modal": SheetDefinition<{
      payload: {
        hash: string;
        thread_hash: string;
        parent_hash: string | null;
        author: {
          fid: number;
          username: string;
          display_name: string;
          pfp_url: string;
          follower_count: number;
          following_count: number;
        };
        text: string;
        timestamp: string;
        reactions: {
          likes_count: number;
          recasts_count: number;
        };
        replies: {
          count: number;
        };
        embeds: Array<{
          url: string;
          metadata: {
            content_type: string;
            image?: {
              width_px: number;
              height_px: number;
            };
          };
        }>;
      };
    }>;
  }
}

export {};
