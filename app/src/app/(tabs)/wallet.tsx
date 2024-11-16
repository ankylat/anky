import { View, ScrollView, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { getUserTransactions } from "@/src/api/newen";

import NewenIcon from "@/assets/icons/newen.svg";
import { useUser } from "@/src/context/UserContext";
import { usePrivy } from "@privy-io/expo";

export default function PouchScreen() {
  const { ankyUser } = useUser();
  const { getAccessToken, user } = usePrivy();
  const { setCreateAccountModalVisible } = useUser();
  const accessToken = getAccessToken();
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      // TODO: Get these values from auth context
      const token = await getAccessToken();
      const userId = ankyUser?.id;
      const walletAddress = ankyUser?.wallet_address;
      console.log("going for the user transactions");
      if (!userId || !walletAddress || !token)
        throw new Error("Missing required auth data");
      return getUserTransactions(userId, walletAddress, token);
    },
  });
  console.log("askhjakjchjkalsckjsa", transactions);

  return (
    <View className="flex-1 bg-purple-400 p-4">
      <View className="mt-12 items-center mb-4">
        <NewenIcon width={222} height={222} />
        <Text className="text-white text-4xl font-bold -mt-4">
          {transactions?.transactions?.reduce(
            (acc, tx) => acc + tx.amount,
            0
          ) || 0}{" "}
          $newen
        </Text>
      </View>

      {user || ankyUser?.privy_user?.id ? (
        <ScrollView className="flex-1">
          {!isLoading &&
            transactions?.transactions?.map((transaction) => (
              <View
                key={transaction.hash}
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
                  {new Date(transaction.timestamp).toLocaleString()}
                </Text>
              </View>
            ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-start">
          <Pressable
            onPress={() => setCreateAccountModalVisible(true)}
            className="bg-purple-800/50 px-8 py-4 rounded-2xl border-2 border-purple-300 active:scale-95 active:bg-purple-700/50"
          >
            <Text className="text-white text-2xl font-bold text-center">
              login to start channeling $newen
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
