import { Redirect } from "expo-router";

export default function Index() {
  console.log("Index");
  return <Redirect href="/(tabs)/write" />;
}
