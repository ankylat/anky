import { View, Text, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";

import AetherIcon from "@/assets/icons/aether.svg";
import LuminaIcon from "@/assets/icons/lumina.svg";
import TerraIcon from "@/assets/icons/terra.svg";

export default function PouchScreen() {
  // This would be replaced with actual wallet/transaction data
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      Promise.resolve([
        {
          id: 1,
          type: "aether",
          amount: 100,
          date: "2024-01-20",
        },
        {
          id: 2,
          type: "lumina",
          amount: -50,
          date: "2024-01-19",
        },
        {
          id: 3,
          type: "terra",
          amount: 75,
          date: "2024-01-18",
        },
      ]),
  });

  const balances = {
    aether: 2,
    lumina: 20,
    terra: 13,
  };

  const totalNewen =
    balances.aether * 1000 + balances.lumina * 500 + balances.terra * 250;

  return (
    <View className="flex-1 bg-stone-100 p-4">
      <View className="mt-20 flex-row justify-around mb-6 relative">
        <View className="items-center">
          <AetherIcon width={48} height={48} />
          <Text
            className="text-lg mt-2 font-bold"
            style={{ fontFamily: "serif" }}
          >
            {balances.aether}
          </Text>
          <Text
            className="text-sm text-black/40 absolute -bottom-4"
            style={{ fontFamily: "serif" }}
          >
            ${balances.aether * 1000}
          </Text>
        </View>

        <View className="items-center">
          <LuminaIcon width={48} height={48} />
          <Text
            className="text-lg mt-2 font-bold"
            style={{ fontFamily: "serif" }}
          >
            {balances.lumina}
          </Text>
          <Text
            className="text-sm text-black/40 absolute -bottom-4"
            style={{ fontFamily: "serif" }}
          >
            ${balances.lumina * 500}
          </Text>
        </View>

        <View className="items-center">
          <TerraIcon width={48} height={48} />
          <Text
            className="text-lg mt-2 font-bold"
            style={{ fontFamily: "serif" }}
          >
            {balances.terra}
          </Text>
          <Text
            className="text-sm text-black/40 absolute -bottom-4"
            style={{ fontFamily: "serif" }}
          >
            ${balances.terra * 250}
          </Text>
        </View>

        <View
          className="absolute bottom-0 w-full h-0.5 bg-black/50"
          style={{
            transform: [{ translateY: 80 }],
          }}
        />
      </View>

      <View className="items-center mb-12">
        <Text className="text-2xl font-bold" style={{ fontFamily: "serif" }}>
          {totalNewen} $NEWEN
        </Text>
      </View>

      <ScrollView className="flex-1">
        {isLoading ? (
          <Text className="text-center">Loading...</Text>
        ) : (
          transactions?.map((transaction) => (
            <View
              key={transaction.id}
              className="bg-stone-50 p-4 rounded-lg mb-3 border border-stone-200 flex-row justify-between items-center"
            >
              {transaction.type === "aether" && (
                <AetherIcon width={24} height={24} />
              )}
              {transaction.type === "lumina" && (
                <LuminaIcon width={24} height={24} />
              )}
              {transaction.type === "terra" && (
                <TerraIcon width={24} height={24} />
              )}

              <Text
                className={`text-xl ${
                  transaction.amount > 0 ? "text-emerald-700" : "text-red-700"
                }`}
                style={{ fontFamily: "serif" }}
              >
                {transaction.amount > 0 ? "+" : "-"}
                {Math.abs(transaction.amount)}
              </Text>

              <Text className="text-stone-600" style={{ fontFamily: "serif" }}>
                {transaction.date}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
