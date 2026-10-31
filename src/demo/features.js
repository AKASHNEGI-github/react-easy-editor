// What the editor contains, as shown on the demo page. This is the one place to edit that list:
//   - the page renders it (src/App.jsx),
//   - the build writes it into index.html as plain HTML for search engines (vite.config.js),
//   - tests/unit/features.test.js checks that every toolbar button is mentioned here and that nothing
//     named here is missing from the editor, so the page cannot drift from the code.
// `plugins` lists the toolbar plugins an item covers (see allPlugins). Items without it are not
// toolbar buttons.

export const FEATURE_GROUPS = [
  {
    title: 'Text formatting',
    items: [
      { text: 'Bold, italic, underline and strikethrough', plugins: ['bold', 'italic', 'underline', 'strikeThrough'] },
      { text: 'Superscript and subscript', plugins: ['superscript', 'subscript'] },
      { text: 'Font family and font size', plugins: ['fontFamily', 'fontSize'] },
      { text: 'Text and background colors', plugins: ['color'] },
      { text: 'Paragraph, heading 1 to 4 and quote styles', plugins: ['formatBlock'] },
      { text: 'Align left, center, right or justify', plugins: ['align'] },
      { text: 'Line height', plugins: ['lineHeight'] },
      { text: 'Clear formatting', plugins: ['clearFormatting'] },
    ],
  },
  {
    title: 'Lists and layout',
    items: [
      { text: 'Bulleted and numbered lists', plugins: ['unorderedList', 'orderedList'] },
      { text: 'Increase and decrease indent', plugins: ['indent', 'outdent'] },
      { text: 'Horizontal line', plugins: ['horizontalLine'] },
      { text: 'Alert boxes: note, tip, important, caution and warning', plugins: ['alert'] },
      { text: 'Special characters', plugins: ['specialCharacter'] },
      { text: 'Emoji picker with search', plugins: ['emoji'] },
    ],
  },
  {
    title: 'Tables',
    items: [
      { text: 'Insert a table of any size', plugins: ['insertTable'] },
      { text: 'Add or delete rows and columns', plugins: ['tableTools'] },
      { text: 'Merge and split cells, toggle a header row' },
      { text: 'Cell text, background and border colors' },
      { text: 'Drag to resize columns' },
    ],
  },
  {
    title: 'Code blocks',
    items: [
      { text: 'Tabbed code blocks with a file name on each tab', plugins: ['insertCode'] },
      { text: 'Syntax highlighting for 19 languages' },
      { text: 'Copy button, and edit or delete tabs in place' },
    ],
  },
  {
    title: 'Links, images, video and files',
    items: [
      { text: 'Insert, edit, open and remove links, with Ctrl+K', plugins: ['insertLink'] },
      { text: 'Images from a URL, the file picker, drag and drop, or paste', plugins: ['insertImage'] },
      { text: 'Alt text, resizing, and placing images side by side' },
      { text: 'Your own upload function, with an instant preview' },
      { text: 'Video from YouTube, Vimeo or a direct link', plugins: ['insertVideo'] },
      { text: 'File links', plugins: ['insertFile'] },
    ],
  },
  {
    title: 'Editing',
    items: [
      { text: 'Undo and redo', plugins: ['undo', 'redo'] },
      { text: 'Find and replace, with match case and replace all', plugins: ['findReplace'] },
      { text: 'Cut, copy, paste and select all', plugins: ['cut', 'copy', 'paste', 'selectAll'] },
      { text: 'Markdown shortcuts as you type' },
      { text: 'A free line always follows a trailing code block, table or quote, so you can keep typing' },
      { text: 'Word and character count, with an optional limit' },
    ],
  },
  {
    title: 'Views and tools',
    items: [
      { text: 'HTML source view', plugins: ['sourceMode'] },
      { text: 'Preview', plugins: ['preview'] },
      { text: 'Print or save as PDF', plugins: ['print'] },
      { text: 'Full screen', plugins: ['fullscreen'] },
      { text: 'Lock to read-only', plugins: ['lock'] },
      { text: 'Light and dark themes', plugins: ['theme'] },
    ],
  },
  {
    title: 'For developers',
    items: [
      { text: 'Controlled value and onChange, or a ref with getHTML, setHTML, focus and more' },
      { text: 'A real form field: give it a name' },
      { text: 'Choose, reorder or add toolbar buttons and plugins' },
      { text: 'TypeScript types, ESM and CommonJS, Next.js App Router' },
      { text: 'English, Spanish, French, German and Hindi, plus right-to-left text' },
      { text: 'Styles scoped to the editor, themed with CSS variables' },
      { text: 'HTML cleaned on load, paste and undo' },
      { text: 'ContentViewer to show saved content' },
    ],
  },
];

// The toolbar plugin that is only a "tell me about this editor" dialog is not a feature worth listing.
export const UNLISTED_PLUGINS = ['about'];
