import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import AetherCoin from "@/assets/icons/aether.svg";
import LuminaCoin from "@/assets/icons/lumina.svg";
import TerraCoin from "@/assets/icons/terra.svg";
import { Ionicons } from "@expo/vector-icons";

const UserTransactionsScreen = () => {
  const { fid } = useLocalSearchParams<{ fid: string }>();

  const transactions = [
    {
      id: "1",
      type: "Daily Writing",
      timestamp: "2023-06-15T09:30:00Z",
      inflow: 2675,
      outflow: 0,
    },
    {
      id: "2",
      type: "Image Generation",
      timestamp: "2023-06-15T10:15:00Z",
      inflow: 0,
      outflow: 500,
    },
    {
      id: "3",
      type: "Anky Minted by User123",
      timestamp: "2023-06-15T11:45:00Z",
      inflow: 1000,
      outflow: 0,
    },
    {
      id: "4",
      type: "Text Completion",
      timestamp: "2023-06-15T14:20:00Z",
      inflow: 0,
      outflow: 300,
    },
    {
      id: "5",
      type: "Daily Writing",
      timestamp: "2023-06-16T09:15:00Z",
      inflow: 2675,
      outflow: 0,
    },
    {
      id: "6",
      type: "NFT Sale",
      timestamp: "2023-06-16T13:30:00Z",
      inflow: 5000,
      outflow: 0,
    },
    {
      id: "7",
      type: "Community Contribution",
      timestamp: "2023-06-17T11:00:00Z",
      inflow: 1500,
      outflow: 0,
    },
    {
      id: "8",
      type: "AI Model Training",
      timestamp: "2023-06-17T16:45:00Z",
      inflow: 0,
      outflow: 1000,
    },
    {
      id: "9",
      type: "Referral Bonus",
      timestamp: "2023-06-18T10:20:00Z",
      inflow: 3000,
      outflow: 0,
    },
    {
      id: "10",
      type: "Premium Feature Unlock",
      timestamp: "2023-06-18T14:55:00Z",
      inflow: 0,
      outflow: 2000,
    },
  ];

  const renderTransaction = ({ item }: { item: (typeof transactions)[0] }) => (
    <TouchableOpacity
      className={`flex-row justify-between items-center p-4 mb-3 rounded-lg ${
        item.inflow > 0 ? "bg-green-100" : "bg-red-100"
      }`}
    >
      <View>
        <Text className="text-lg font-semibold text-gray-800">{item.type}</Text>
        <Text className="text-sm text-gray-500">
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <View className="flex-row items-center">
        {item.inflow > 0 ? (
          <Ionicons name="arrow-up" size={20} color="#10B981" />
        ) : (
          <Ionicons name="arrow-down" size={20} color="#EF4444" />
        )}
        <Text
          className={`text-lg font-bold ml-2 ${
            item.inflow > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {item.inflow > 0 ? `+${item.inflow}` : `-${item.outflow}`} $newen
        </Text>
      </View>
    </TouchableOpacity>
  );

  const calculateBalance = () => {
    return transactions.reduce(
      (acc, transaction) => acc + transaction.inflow - transaction.outflow,
      0
    );
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-4">FID: {fid}</Text>

      <View className="bg-white rounded-xl p-6 mb-6 shadow-md">
        <Text className="text-xl font-semibold text-gray-700 mb-2">
          Current Balance
        </Text>
        <Text className="text-4xl font-bold text-blue-600 mb-4">
          {calculateBalance()} $newen
        </Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <AetherCoin width={40} height={40} />
            <Text className="mt-2 text-lg font-medium text-gray-700">100</Text>
          </View>
          <View className="items-center">
            <LuminaCoin width={40} height={40} />
            <Text className="mt-2 text-lg font-medium text-gray-700">75</Text>
          </View>
          <View className="items-center">
            <TerraCoin width={40} height={40} />
            <Text className="mt-2 text-lg font-medium text-gray-700">50</Text>
          </View>
        </View>
      </View>

      <Text className="text-xl font-bold text-gray-800 mb-4">
        Transaction History
      </Text>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default UserTransactionsScreen;
