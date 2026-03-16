import { describe, it, expect } from 'vitest';
import { extractError, actId } from '../../utils/metaApi';

describe('actId', () => {
  it('adds act_ prefix to numeric ID', () => {
    expect(actId('123456')).toBe('act_123456');
  });

  it('does not double-prefix act_ IDs', () => {
    expect(actId('act_123456')).toBe('act_123456');
  });

  it('handles number input', () => {
    expect(actId(789)).toBe('act_789');
  });
});

describe('extractError', () => {
  it('returns "Unknown error" for null/undefined', () => {
    expect(extractError(null)).toBe('Unknown error');
    expect(extractError(undefined)).toBe('Unknown error');
    expect(extractError({})).toBe('Unknown error');
  });

  it('prefers error_user_msg', () => {
    const err = { error: { error_user_msg: 'User-facing message', message: 'Dev message', code: 100 } };
    expect(extractError(err)).toBe('User-facing message');
  });

  it('maps known error codes', () => {
    const err = { error: { code: 190 } };
    expect(extractError(err)).toContain('expired');
  });

  it('maps known error subcodes', () => {
    const err = { error: { code: 1, error_subcode: 2615005 } };
    expect(extractError(err)).toContain('Budget');
  });

  it('falls back to message field', () => {
    const err = { error: { code: 99999, message: 'Some random error' } };
    expect(extractError(err)).toBe('Some random error');
  });

  it('falls back to error code string', () => {
    const err = { error: { code: 12345 } };
    expect(extractError(err)).toBe('Error 12345');
  });
});
