// Translations are a plain object mapping the English UI string to its translation:
//   { 'Bold (Ctrl+B)': 'Negrita (Ctrl+B)', '{count} words': '{count} palabras' }
// Anything missing falls back to the English text, so a partial map is always safe.
// `{name}` placeholders are filled from the second argument.

export function createTranslator(translations) {
  if (!translations) return (text, vars) => fill(text, vars);
  return (text, vars) => {
    const translated = Object.prototype.hasOwnProperty.call(translations, text) ? translations[text] : text;
    return fill(translated, vars);
  };
}

function fill(text, vars) {
  if (!vars || typeof text !== 'string') return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

// Shallow comparison used by the Editor's memo check, so an inline `translations={{...}}` literal
// does not re-render the whole editor on every host render.
export function sameTranslations(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}
