import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index.js';

describe('core shell', () => {
  it('exists', () => {
    expect(PACKAGE_NAME).toBe('@playthelegend/core');
  });
});
