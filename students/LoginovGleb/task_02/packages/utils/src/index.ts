export const notImplemented = (feature = ""): never => {
  const label = feature ? `${feature} is not implemented yet` : "Not implemented";
  throw new Error(label);
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
