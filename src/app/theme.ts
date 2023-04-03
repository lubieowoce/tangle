export const variables = {
  "--color-text-client": "#2b6374", // "#2389a1",
  "--color-border-client": "#a6dfec",
  "--color-bg-client": "#d3f5f8",

  "--color-text-server": "#80755c", //"#a77e1f",
  "--color-border-server": "#f2d694",
  "--color-bg-server": "#fffadd",

  "--color-text-loading": "#989898",
  "--color-border-loading": "#cdcdcd",
  "--color-bg-loading": "#dedede",
};

export const colors = {
  textServer: "var(--color-text-server)",
  borderServer: "var(--color-border-server)",
  bgServer: "var(--color-bg-server)",
  textClient: "var(--color-text-client)",
  borderClient: "var(--color-border-client)",
  bgClient: "var(--color-bg-client)",
  textLoading: "var(--color-text-loading)",
  borderLoading: "var(--color-border-loading)",
  bgLoading: "var(--color-bg-loading)",
};

export const colorSets = {
  server: {
    color: colors.textServer,
    borderColor: colors.borderServer,
    backgroundColor: colors.bgServer,
  },
  client: {
    color: colors.textClient,
    borderColor: colors.borderClient,
    backgroundColor: colors.bgClient,
  },
  loading: {
    color: colors.textLoading,
    borderColor: colors.borderLoading,
    backgroundColor: colors.bgLoading,
  },
};
