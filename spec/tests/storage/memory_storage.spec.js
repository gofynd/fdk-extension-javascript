const MemoryStorage = require('../../../lib/storage/memory_storage');

describe('Memory Storage', () => {
  let memoryStorage;

  beforeEach(() => {
    memoryStorage = new MemoryStorage();
  });

  it('Should set and get a value', async () => {
    await memoryStorage.set('key1', 'value1');
    const result = await memoryStorage.get('key1');
    expect(result).toBe('value1');
  });

  it('Should set and delete a value', async () => {
    await memoryStorage.set('key2', 'value2');
    await memoryStorage.del('key2');
    const result = await memoryStorage.get('key2');
    expect(result).toBeUndefined();
  });

  it('Should set and get a hash value', async () => {
    await memoryStorage.hset('hashKey', 'nestedKey', 'nestedValue');
    const result = await memoryStorage.hget('hashKey', 'nestedKey');
    expect(result).toBe('nestedValue');
  });

  it('Should handle non-existent hash key in hget', async () => {
    const result = await memoryStorage.hget('nonExistentKey', 'nonExistentNestedKey');
    expect(result).toBeNull();
  });

  it('Should handle non-existent key in hgetall', async () => {
    const result = await memoryStorage.hgetall('nonExistentKey');
    expect(result).toBeUndefined();
  });
});
