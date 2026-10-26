// jsdom has no layout engine and no execCommand. Tests that need real editing behaviour
// live in tests/e2e (real Chromium). Everything here exercises logic and rendering.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library needs this flag so state updates inside tests are handled as in a browser.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => cleanup())
