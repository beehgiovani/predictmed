const getEnv = (key: string): string => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key]!;
  }
  // @ts-ignore: Deno might not be defined in Node environment
  if (typeof Deno !== "undefined" && Deno.env && Deno.env.get(key)) {
    // @ts-ignore
    return Deno.env.get(key)!;
  }
  return "";
};

export const ENV = {
  appId: getEnv("VITE_APP_ID"),
  cookieSecret: getEnv("JWT_SECRET"),
  databaseUrl: getEnv("DATABASE_URL"),
  oAuthServerUrl: getEnv("OAUTH_SERVER_URL"),
  ownerOpenId: getEnv("OWNER_OPEN_ID"),
  isProduction: getEnv("NODE_ENV") === "production",
  forgeApiUrl: getEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: getEnv("GEMINI_API_KEY") || getEnv("BUILT_IN_FORGE_API_KEY"),
};
