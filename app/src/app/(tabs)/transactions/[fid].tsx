import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import AetherCoin from "@/assets/icons/aether.svg";
import LuminaCoin from "@/assets/icons/lumina.svg";
import TerraCoin from "@/assets/icons/terra.svg";
import { Ionicons } from "@expo/vector-icons";
import { calculateBalance, transactions } from "@/src/app/lib/transactions";

const UserTransactionsScreen = () => {
  const { fid } = useLocalSearchParams<{ fid: string }>();

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
