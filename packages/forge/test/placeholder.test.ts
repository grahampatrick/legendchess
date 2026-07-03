import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index.js';

describe('forge shell', () => {
  it('exists', () => {
    expect(PACKAGE_NAME).toBe('@playthelegend/forge');
  });
});
