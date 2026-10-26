// Public API of `react-easy-editor`.
// Anything not exported here is internal and may change in a minor release.
//
// Styles are shipped separately: import 'react-easy-editor/style.css' once in your app.

import Editor from './components/Editor';
import ContentViewer from './components/ContentViewer';

export { Editor, ContentViewer };
export default Editor;

// Built-in plugin set and the default two-row toolbar layout. Compose your own by filtering
// `allPlugins` by `.name` and arranging the results (plus SEPARATOR) into rows.
export { allPlugins, toolbarRows } from './plugins';
export { SEPARATOR } from './components/separator';

// Register extra toolbar icons for custom plugins: IconStore.set('myIcon', '<svg ...>')
export { IconStore } from './core/IconStore';

// The sanitizer the editor runs on every load/undo/redo — handy for cleaning stored HTML
// in the browser before you render it elsewhere.
export { sanitizeHtml } from './core/sanitize';

// Interface translations. Each is a plain { 'English text': 'translation' } object, exported by
// name so bundlers drop the ones you do not import. Pass one as <Editor translations={...} />.
// localeEn is the complete list of strings and the template for writing your own.
export { localeEn } from './locales/en';
export { localeEs } from './locales/es';
export { localeFr } from './locales/fr';
export { localeDe } from './locales/de';
export { localeHi } from './locales/hi';
