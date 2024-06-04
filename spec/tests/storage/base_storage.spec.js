const BaseStorage = require('../../../express/storage/base_storage');

describe('Base Storage', () => {
  let baseStorage;

  beforeAll(() => {
    baseStorage = new BaseStorage('dummyPrefix');
  });

  it('Should throw error for no implementation of get method', async () => {
    await expectAsync(baseStorage.get('key')).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of set method', async () => {
    await expectAsync(baseStorage.set('key', 'value')).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of del method', async () => {
    await expectAsync(baseStorage.del('key')).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of setex method', async () => {
    await expectAsync(baseStorage.setex('key', 'value', 10)).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of hget method', async () => {
    await expectAsync(baseStorage.hget('key', 'hashKey')).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of hset method', async () => {
    await expectAsync(baseStorage.hset('key', 'hashKey', 'value')).toBeRejectedWithError('Method not implemented');
  });

  it('Should throw error for no implementation of hgetall method', async () => {
    await expectAsync(baseStorage.hgetall('key')).toBeRejectedWithError('Method not implemented');
  });
});
