import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import Cast from "./Cast";
import { Cast as CastType } from "@/src/types/Cast";

interface FeedProps {
  casts: CastType[];
  cursor: string;
  onLoadMore: (cursor: string) => Promise<void>;
  isLoading?: boolean;
}

const Feed: React.FC<FeedProps> = ({
  casts,
  cursor,
  onLoadMore,
  isLoading = false,
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCasts, setHasMoreCasts] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Reset hasMoreCasts when new casts are loaded
    setHasMoreCasts(casts.length === 25);
  }, [casts]);

  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: any }) => {
      if (isLoadingMore || !hasMoreCasts) return;

      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      const scrollPosition = contentOffset.y;
      const totalHeight = contentSize.height;
      const scrollViewHeight = layoutMeasurement.height;

      // Calculate scroll percentage
      const scrollPercentage =
        (scrollPosition + scrollViewHeight) / totalHeight;

      // If user has scrolled past 55% and we have a cursor
      if (scrollPercentage > 0.55 && cursor) {
        loadMoreCasts();
      }
    },
    [cursor, isLoadingMore, hasMoreCasts]
  );

  const loadMoreCasts = async () => {
    try {
      setIsLoadingMore(true);
      await onLoadMore(cursor);
    } catch (error) {
      console.error("Error loading more casts:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderCast = ({ item }: { item: CastType }) => <Cast cast={item} />;

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View className="py-4">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }

    if (!hasMoreCasts) {
      return (
        <View className="py-8 items-center">
          <Text className="text-gray-500 text-lg">
            You've reached the end of the feed
          </Text>
        </View>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={casts}
      renderItem={renderCast}
      keyExtractor={(item) => item.hash}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      className="flex-1"
    />
  );
};

export default Feed;
