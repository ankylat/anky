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

  // updatedConfig.isCSSEnabled = true;

  return updatedConfig;
})();

const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  if (moduleName.startsWith("@privy-io/")) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: true,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = withNativeWind(config, { input: "./global.css" });
