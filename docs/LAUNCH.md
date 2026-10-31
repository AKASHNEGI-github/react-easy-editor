# Launch kit

Everything in here is a draft in your voice. Edit freely, and only post what you are happy to stand behind.
All the numbers below were measured on this version; re-check them if the code changes.

## 1. GitHub repository settings (10 minutes)

GitHub search and Google both read these, so they matter as much as the README.

**About box** (the gear icon next to "About" on the repository page):

- **Description:**
  `A free, open-source rich text (WYSIWYG) editor for React. One component: full toolbar, tables, code blocks, image upload, Markdown shortcuts, dark mode, 5 languages. TypeScript, MIT.`
- **Website:** `https://react-easy-editor.netlify.app/`
- **Topics** (GitHub allows 20):
  `react` `react-editor` `rich-text-editor` `wysiwyg` `wysiwyg-editor` `text-editor` `react-component`
  `react-text-editor` `html-editor` `contenteditable` `typescript` `nextjs` `markdown-shortcuts`
  `image-upload` `dark-mode` `rtl` `i18n` `javascript` `npm-package` `open-source`

**Settings → General → Social preview:** upload `docs/social-preview.png` (1280 × 640). It is the image shown
when the repository link is shared.

**Settings → Code security:** turn on **Private vulnerability reporting** (`SECURITY.md` points to it) and
**Dependabot alerts**.

**After the first npm publish:** open Releases → Draft a new release → choose tag `v1.1.0` → paste the 1.1.0
section of `CHANGELOG.md`. A repository with a recent release looks alive to visitors.

## 2. Get the demo site found

1. Open <https://search.google.com/search-console> and add the property
   `https://react-easy-editor.netlify.app/` (URL prefix).
2. Verify it with the **HTML tag** method: paste the `<meta name="google-site-verification" ...>` line into the
   `<head>` of `index.html`, push, then click Verify.
3. Submit `https://react-easy-editor.netlify.app/sitemap.xml`.

The page already has a title, description, canonical address, social-share tags and structured data, and a
plain-HTML copy of the key text for crawlers that do not run JavaScript.

## 3. The posts

**Be present for the first day.** Answer every comment, thank people for bug reports, and fix the quick ones
the same day. How you handle the first feedback matters more than the post itself.

### dev.to or Hashnode article

**Title:** A rich text editor for React that you add with one component

**Tags:** `react`, `javascript`, `opensource`, `webdev`

> Adding a rich text editor to a React app usually means picking a framework, wiring up plugins, building a
> toolbar and writing the CSS. I wanted the opposite: install a package, render one component, and get a
> toolbar that already works.
>
> That is [React Easy Editor](https://github.com/AKASHNEGI-github/react-easy-editor). It is free, MIT licensed
> and about 80 KB gzipped (React not included).
>
> ```jsx
> import { Editor } from 'react-easy-editor';
>
> export default function App() {
>   return <Editor height={400} onChange={(html) => save(html)} />;
> }
> ```
>
> You get tables, tabbed code blocks with syntax highlighting, image upload, find and replace, Markdown
> shortcuts as you type, a dark theme, right-to-left text and an interface in five languages. It saves plain
> HTML. You can [try it in the browser](https://react-easy-editor.netlify.app/) without
> installing anything.
>
> **Three things I spent the most time on**
>
> **1. Typing must never fight React.** A controlled editor is hard, because every keystroke would otherwise
> round-trip through your state and reset the caret. With `value` and `onChange`, the editor ignores its own
> value when it comes back, and when you change the value from outside it keeps the caret where it was.
>
> **2. Images.** Pick, drag in or paste one and it appears at once as a dimmed placeholder, while your
> `onImageUpload` function sends it to your server. The placeholder never reaches `onChange` or a form value,
> and a failed upload leaves nothing behind.
>
> **3. Staying out of your CSS.** Every rule is scoped under one class, the editor starts from a clean slate
> so your global styles cannot leak in, and the content area restores bullets and headings that Tailwind's or
> Bootstrap's resets remove. I checked that in a real browser against Bootstrap, normalize.css and Tailwind.
>
> **How I tested it**
>
> There are 200+ unit tests and 100+ tests that drive a real Chromium: typing, uploads, forms, translations,
> accessibility. The whole browser suite also passes on React 18 and 19. Writing them paid off. While building
> the demo site I found that code blocks had no padding and clipped long lines instead of scrolling. It was a
> CSS specificity bug that had been there from the start. It now has a test that fails without the fix.
>
> **What it is not**
>
> It reads and writes HTML. There is no real-time collaboration, and no custom document schema. The automated
> tests run in Chromium only, and the Spanish, French, German and Hindi translations have not been reviewed by
> native speakers yet.
>
> If you try it, I would like to hear what stops you from using it: [open an issue](https://github.com/AKASHNEGI-github/react-easy-editor/issues)
> or reply here.

### Reddit (r/reactjs, later r/webdev)

Read the subreddit's current rules first. r/reactjs has limited self-promotion to specific threads or flairs in
the past, so look for the weekly showcase thread or the "show" flair. Do not post to several subreddits on the
same day.

**Title:** I made a drop-in rich text editor for React: tables, code blocks, image upload, Markdown shortcuts. Looking for feedback

> I have been working on React Easy Editor, a rich text editor you add with one component, MIT licensed, about
> 80 KB gzipped.
>
> - Controlled (`value` / `onChange`) or a `ref` with `getHTML()` and friends
> - Image upload hook (picked, dropped and pasted images share one path)
> - Works as a normal form field (`name`), so server actions can read it
> - Tables, tabbed code blocks, dark mode, RTL, 5 interface languages
> - TypeScript types, ESM + CJS, works in the Next.js App Router
>
> Live demo, no install: https://react-easy-editor.netlify.app/
> Repo: https://github.com/AKASHNEGI-github/react-easy-editor
>
> Honest limits: HTML output only, no collaboration, browser tests run in Chromium only, translations are
> unreviewed. What would you want in a drop-in editor that this does not have?

### Show HN

**Title:** Show HN: React Easy Editor – a drop-in rich text editor for React

**URL:** `https://react-easy-editor.netlify.app/`

**First comment (post it yourself right away):**

> Hi HN, I built this because adding a rich text editor to a React app usually means choosing a framework and
> assembling a toolbar yourself. This is one component with a working toolbar that saves HTML.
>
> Technical bits you might care about: the controlled `value` prop breaks the echo loop instead of resetting
> the caret, image uploads go through one pipeline (picked, dropped, pasted) with an instant placeholder that
> never leaks into the saved HTML, and all CSS is scoped under one class so Tailwind or Bootstrap resets do
> not break it (checked in a real browser).
>
> What it does not do: collaboration, a custom document model, anything but HTML output. Browser tests run in
> Chromium only. MIT licensed, about 80 KB gzipped. I would love bug reports, especially from Safari and Firefox.

Post on a weekday morning (US time). Do not ask friends to upvote; it is against the rules and it gets
detected.

### LinkedIn

> I just released React Easy Editor, a free rich text editor for React.
>
> One component gives you a full toolbar, tables, code blocks with syntax highlighting, image upload, Markdown
> shortcuts, dark mode and five interface languages. It saves plain HTML and is about 80 KB gzipped.
>
> The part I enjoyed most was the testing: 200+ unit tests plus 100+ tests that drive a real browser. Along the
> way they caught bugs I would never have seen by eye.
>
> Try it in your browser, no install: https://react-easy-editor.netlify.app/
> Code (MIT): https://github.com/AKASHNEGI-github/react-easy-editor
>
> If you build React apps, I would value your feedback.
>
> #react #javascript #opensource #webdevelopment

### X or Bluesky

> React Easy Editor: a rich text editor for React in one component.
> Tables, code blocks, image upload, Markdown shortcuts, dark mode, 5 languages. MIT, ~80 KB gzipped.
> Try it in the browser: https://react-easy-editor.netlify.app/

## 4. Other places that bring steady traffic

- **Answer questions honestly.** Search Stack Overflow and Reddit for "react rich text editor" and "react
  wysiwyg", answer the ones where it genuinely fits, and say that you are the author.
- **Awesome lists.** Search GitHub for "awesome react components" and "awesome wysiwyg" lists and open a pull
  request following each list's rules. A line in a popular list sends visitors for years.
- **Keep shipping.** A package with releases every few weeks looks maintained. Search engines and people both
  notice.

## 5. Things not to claim

- Do not call it "the best" or "a replacement for" any other editor. State what it does.
- It is tested in Chromium only. Say so, and ask for Firefox and Safari reports.
- The translations are starter packs. Say so, and ask for corrections.
