# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Use GitHub's private reporting instead:
open the repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, the smallest HTML or steps that reproduce it, and the browser and version. You can
expect a reply within a few days, and a fix or a clear answer as soon as the problem is understood.

## What counts

React Easy Editor edits and displays HTML in the browser, so the interesting problems are ways to get script
execution or unsafe navigation past the sanitizer:

- HTML that runs script after it is loaded, pasted, undone or shown in `ContentViewer`
- A `javascript:` or similar address that survives in a link, an image or an uploaded-image result
- An embedded frame that is not on the allowed list (YouTube and Vimeo)

## What the sanitizer does and does not promise

The editor and the viewer remove scripts, event-handler attributes and unsafe addresses in the browser. That
is a safety net, not a replacement for server-side checks. If you store or show content written by other
people, sanitize it on your server before saving it.

## Supported versions

Security fixes go into the latest 1.x release.
