import { useState, useEffect } from "react";
import { Pressable, View, Text, Modal, Image, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  isVisible: boolean;
  onClose: () => void;
};

type Track = {
  id: number;
  artist: string;
  album: string;
  title: string;
  imageUrl: string;
  year: string;
  duration: number;
};

export default function MusicModal({ isVisible, onClose }: Props) {
  const [currentTrack, setCurrentTrack] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackMetadata, setTrackMetadata] = useState<Track[]>([]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        // Try to get cached data first
        const cachedData = await AsyncStorage.getItem("musicMetadata");
        if (cachedData) {
          console.log("Loading music metadata from cache...");
          setTrackMetadata(JSON.parse(cachedData));
          return;
        }

        console.log("No cached data found, loading from asset...");
        // Load the asset using require
        const asset = Asset.fromModule(require("/music_metadata/index.txt"));
        // Ensure the asset is downloaded/available
        await asset.downloadAsync();

        const fileContents = await FileSystem.readAsStringAsync(
          asset.localUri!
        );

        // Parse the track data
        const trackRegex = /^(.*?)\n(.*?)\n(.*?)\n(.*?)\n(\d+)\n(\d+)$/gm;
        const tracks: Track[] = [];
        let match;
        let id = 1;

        console.log("Parsing tracks...");
        while ((match = trackRegex.exec(fileContents)) !== null) {
          const track = {
            id: id++,
            artist: match[1],
            album: match[2],
            title: match[3],
            imageUrl: match[4],
            year: match[5],
            duration: parseInt(match[6]),
          };
          tracks.push(track);
        }

        console.log("Total tracks parsed:", tracks.length);

        // Cache the parsed data
        await AsyncStorage.setItem("musicMetadata", JSON.stringify(tracks));
        console.log("Music metadata cached successfully");

        setTrackMetadata(tracks);
      } catch (error) {
        console.error("Error loading music metadata:", error);
        // Try to load from cache as fallback if loading from asset fails
        try {
          const cachedData = await AsyncStorage.getItem("musicMetadata");
          if (cachedData) {
            console.log("Loading from cache after error...");
            setTrackMetadata(JSON.parse(cachedData));
          }
        } catch (cacheError) {
          console.error("Error loading from cache:", cacheError);
        }
      }
    };

    loadMetadata();
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTrackSelect = (trackId: number) => {
    setCurrentTrack(trackId);
    setIsPlaying(true);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/70">
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl border-t border-black p-6 h-2/3"
        >
          {/* Now Playing Section */}
          <View className="flex items-center mb-8">
            <Text className="text-2xl font-bold text-purple-800 mb-4">
              Now Playing
            </Text>
            {trackMetadata[currentTrack - 1] && (
              <Image
                source={{ uri: trackMetadata[currentTrack - 1].imageUrl }}
                className="w-48 h-48 rounded-lg shadow-xl mb-4"
              />
            )}
            <Text className="text-xl font-bold text-purple-900">
              {trackMetadata[currentTrack - 1]?.title}
            </Text>
            <Text className="text-md text-purple-600">
              {trackMetadata[currentTrack - 1]?.artist}
            </Text>

            {/* Playback Controls */}
            <View className="flex-row items-center space-x-8 mt-4">
              <Pressable>
                <MaterialIcons name="skip-previous" size={40} color="#6B46C1" />
              </Pressable>
              <Pressable
                onPress={handlePlayPause}
                className="bg-purple-600 rounded-full p-4"
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={32}
                  color="white"
                />
              </Pressable>
              <Pressable>
                <MaterialIcons name="skip-next" size={40} color="#6B46C1" />
              </Pressable>
            </View>
          </View>

          {/* Track List */}
          <ScrollView className="flex-1">
            <View className="space-y-2">
              {trackMetadata.map((track) => (
                <Pressable
                  key={track.id}
                  onPress={() => handleTrackSelect(track.id)}
                  className={`flex-row items-center p-4 rounded-xl ${
                    currentTrack === track.id ? "bg-purple-100" : "bg-gray-50"
                  }`}
                >
                  <Image
                    source={{ uri: track.imageUrl }}
                    className="w-12 h-12 rounded-md mr-4"
                  />
                  <View className="flex-1">
                    <Text className="font-bold text-purple-900">
                      {track.title}
                    </Text>
                    <Text className="text-purple-600">{track.artist}</Text>
                  </View>
                  <Text className="text-purple-500">
                    {formatDuration(track.duration)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
