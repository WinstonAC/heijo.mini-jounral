import { describe, it, expect } from 'vitest';

/**
 * Test content hash deduplication logic
 * This simulates the deduplication logic used in Composer saveEntry
 */
describe('Save Deduplication', () => {
  it('should generate same hash for identical content', () => {
    const content1 = 'Hello world';
    const tags1 = ['tag1', 'tag2'];
    const source1 = 'text';
    
    const content2 = 'Hello world';
    const tags2 = ['tag1', 'tag2'];
    const source2 = 'text';
    
    const hash1 = `${content1}-${tags1.join(',')}-${source1}`;
    const hash2 = `${content2}-${tags2.join(',')}-${source2}`;
    
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different content', () => {
    const content1 = 'Hello world';
    const content2 = 'Hello world!';
    
    const hash1 = `${content1}-[]-text`;
    const hash2 = `${content2}-[]-text`;
    
    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hash for different tags', () => {
    const content = 'Hello world';
    const tags1 = ['tag1'];
    const tags2 = ['tag2'];
    
    const hash1 = `${content}-${tags1.join(',')}-text`;
    const hash2 = `${content}-${tags2.join(',')}-text`;
    
    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hash for different sources', () => {
    const content = 'Hello world';
    const tags: string[] = [];
    
    const hash1 = `${content}-${tags.join(',')}-text`;
    const hash2 = `${content}-${tags.join(',')}-voice`;
    
    expect(hash1).not.toBe(hash2);
  });
});

