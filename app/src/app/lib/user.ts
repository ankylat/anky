export const prettyLog = (obj: any, label?: string) => {
  const timestamp = new Date().toISOString();

  if (label) {
    console.log(`\n=== ${label} (${timestamp}) ===`);
  } else {
    console.log(`\n=== Debug Log (${timestamp}) ===`);
  }

  try {
    console.log(JSON.stringify(obj, null, 2));
  } catch (err) {
    // Fallback for objects that can't be stringified
    console.dir(obj, { depth: null, colors: true });
  }

  console.log("=====================================\n");
};
