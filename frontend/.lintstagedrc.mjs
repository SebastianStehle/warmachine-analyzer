// ESLint 8 has no --no-warn-ignored, so explicitly ignored files would fail --max-warnings 0. Drop them before linting.
const IGNORED_PATHS = ['src/api/generated/', '/vite.config.ts'];

export default {
  '*.{ts,tsx}': (files) => {
    const linted = files.filter((file) => {
      const normalized = file.replace(/\\/g, '/');

      return !IGNORED_PATHS.some((ignored) => normalized.includes(ignored));
    });

    if (linted.length === 0) {
      return [];
    }

    const args = linted.map((file) => `"${file}"`).join(' ');

    return [`eslint --report-unused-disable-directives --max-warnings 0 --fix ${args}`];
  },
};
