import '@testing-library/jest-dom';

// Mock import.meta.env for Supabase and other env-dependent modules
globalThis.import = globalThis.import || {};
