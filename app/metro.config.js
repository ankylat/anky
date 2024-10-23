const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */

const config = (() => {
  const baseConfig = getDefaultConfig(__dirname);

  const { transformer, resolver } = baseConfig;

  const updatedConfig = {
    ...baseConfig,
    transformer: {
      ...transformer,
      babelTransformerPath: require.resolve("react-native-svg-transformer"),
    },
    resolver: {
      ...resolver,
      assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
      sourceExts: [...resolver.sourceExts, "svg"],
    },
  };

  updatedConfig.isCSSEnabled = true;

  return updatedConfig;
})();

module.exports = withNativeWind(config, { input: "./global.css" });
