// https://github.dev/eslint/eslint/blob/34c05a779ada3142995392ae12978461900088df/lib/linter/interpolate.js
export function interpolate(text: string, data?: object) {
  if (!data) {
    return text;
  }

  // Substitution content for any {{ }} markers.
  return text.replace(
    /\{\{([^{}]+?)\}\}/gu,
    (fullMatch, termWithWhitespace) => {
      const term = termWithWhitespace.trim();

      if (term in data) {
        return (data as any)[term];
      }

      // Preserve old behavior: If parameter name not provided, don't replace it.
      return fullMatch;
    }
  );
}
