import '@testing-library/jest-dom/vitest';

// React 18 requires this flag before act()-based interactions in a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
