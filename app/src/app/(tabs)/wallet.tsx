import { View, ScrollView, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";

import NewenIcon from "@/assets/icons/newen.svg";

export default function PouchScreen() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      Promise.resolve([
        {
          id: 1,
          amount: 2675,
          date: "2024-01-20",
        },
        {
          id: 2,
          amount: -200,
          date: "2024-01-19",
        },
        {
          id: 3,
          amount: 2675,
          date: "2024-01-19",
        },
        {
          id: 4,
          amount: 2675,
          date: "2024-01-18",
        },
      ]),
  });

  const balance = transactions?.reduce((acc, t) => acc + t.amount, 0) ?? 0;

  return (
    <View className="flex-1 bg-purple-400 p-4">
      <View className="mt-20 items-center mb-12">
        <NewenIcon width={222} height={222} />
        <View className="mt-6">
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-3xl font-bold">
              {balance} $newen
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {!isLoading &&
          transactions?.map((transaction) => (
            <View
              key={transaction.id}
              className="bg-purple-800/50 p-4 rounded-xl mb-3 flex-row justify-between items-center border border-purple-700"
            >
              <Text
                className={`text-center mr-auto ml-auto text-xl font-bold ${
                  transaction.amount > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {transaction.amount > 0 ? "+" : "-"}
                {Math.abs(transaction.amount)}
              </Text>

              <Text className="text-purple-300 text-sm">
                {transaction.date}
              </Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
