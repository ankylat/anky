import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { TabBarIcon } from "./TabBarIcon";
import { Colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CustomTabBarProps {
  onAlienPress: () => void;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ onAlienPress }) => {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.tabBar}>
      <TouchableOpacity style={styles.tabItem}>
        <TabBarIcon
          name="home-outline"
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={onAlienPress}>
        <MaterialCommunityIcons
          name="alien"
          size={24}
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <TabBarIcon
          name="pencil-outline"
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <TabBarIcon
          name="mail-outline"
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem}>
        <TabBarIcon
          name="person-outline"
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    height: 50,
    borderTopWidth: 1,
    borderTopColor: Colors.light.tabIconDefault,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CustomTabBar;
