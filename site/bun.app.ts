// Bun Bake (`bun build --app`) with its built-in React framework: every file in
// pages/ is a route, rendered to static HTML at build time, and public/ is
// copied as is. scripts/finish.ts tidies the output afterwards.
export default {
  app: {
    framework: "react",
  },
};
