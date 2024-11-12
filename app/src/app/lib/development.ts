import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearAllUserDataFromLocalStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    console.log("Successfully cleared all user data from AsyncStorage");
  } catch (error) {
    console.error("Error clearing user data:", error);
    throw new Error("Failed to clear user data");
  }
};
