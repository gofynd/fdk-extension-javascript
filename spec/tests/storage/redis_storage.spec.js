const RedisStorage = require('../../../express/storage/redis_storage');
const { redisConnection } = require("../../helpers/setup_db");

describe('Redis Storage', () => {
  let redisStorage;

  beforeAll(() => {
    redisStorage = new RedisStorage(redisConnection, 'testPrefix');
  });

  it('Should set and get a value', async () => {
    await redisStorage.set('key1', 'value1');
    const result = await redisStorage.get('key1');
    expect(result).toBe('value1');
  });

  it('Should set and delete a value', async () => {
    await redisStorage.set('key2', 'value2');
    await redisStorage.del('key2');
    const result = await redisStorage.get('key2');
    expect(result).toBeNull();
  });

  it('Should set and get a hash value', async () => {
    await redisStorage.hset('hashKey', 'nestedKey', 'nestedValue');
    const result = await redisStorage.hget('hashKey', 'nestedKey');
    expect(result).toBe('nestedValue');
  });

  it('Should handle non-existent hash key in hget', async () => {
    const result = await redisStorage.hget('nonExistentKey', 'nonExistentNestedKey');
    expect(result).toBeNull();
  });

  it('Should handle non-existent key in hgetall', async () => {
    const result = await redisStorage.hgetall('nonExistentKey');
    expect(result).toEqual({});
  });
});
