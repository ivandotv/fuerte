import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestCollection } from '../../__fixtures__/TestCollection'
import { TestModelData } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()
let modelPool: any[]

beforeEach(() => {
  modelPool = []
  for (let index = 0; index < 10; index++) {
    const model = fixtures.model()
    modelPool.push(model)
  }
})

describe('Collection - reset #reset', () => {
  test('Return added and removed models', async () => {
    const collection = fixtures.collection()
    const models = modelPool.splice(0, 5)
    collection.add(models)

    const result = await collection.reset(fixtures.rawModelData)

    expect(result).toEqual([collection.models, models])
  })

  test('Call on reset callback with added and removed models', async () => {
    const collection = fixtures.collection()
    const onResetSpy = jest.spyOn(collection, 'onReset')
    const models = modelPool.splice(0, 2)
    collection.add(models)

    await collection.reset(fixtures.rawModelData)

    expect(onResetSpy).toBeCalledTimes(1)
    expect(onResetSpy).toBeCalledWith(collection.models.slice(), models)
  })

  test('Populate collection with new models', async () => {
    const collection = fixtures.collection()

    await collection.reset(fixtures.rawModelData)

    expect(collection.models.length).toBe(fixtures.rawModelData.length)
  })

  test('If collection is not empty, clear it', async () => {
    const collection = fixtures.collection()
    const models = modelPool.splice(0, 5)
    collection.add(models)

    await collection.reset(fixtures.rawModelData)

    expect(collection.models.length).toBe(fixtures.rawModelData.length)
    expect(collection.getByIdentity(models[0].cid)).toBeUndefined()
    expect(collection.getByIdentity(models[1].cid)).toBeUndefined()
  })

  test('Reset collection without adding new models', async () => {
    const collection = fixtures.collection()
    const onResetSpy = jest.spyOn(collection, 'onReset')
    const models = modelPool.splice(0, 5)
    collection.add(models)

    const result = await collection.reset()

    expect(collection.models.length).toBe(0)
    expect(onResetSpy).toBeCalledWith([], models)
    expect(result).toEqual([[], models])
  })

  test('Model creation data can be modified before constructing new models', async () => {
    const modelData: TestModelData = {
      id: '123',
      foo: 'modified',
      bar: 'modified'
    }
    class Test extends TestCollection {
      onModelCreateData(_data: TestModelData): TestModelData {
        return modelData
      }
    }
    const collection = new Test(fixtures.factory(), fixtures.transport())

    await collection.reset(fixtures.rawModelData.slice(0, 1))

    expect(collection.models[0]).toEqual(expect.objectContaining(modelData))
  })

  test('If model the creation data callback returns falsy value, skip model creation', async () => {
    class Test extends TestCollection {
      onModelCreateData(_data: TestModelData): void {}
    }
    const collection = new Test(fixtures.factory(), fixtures.transport())

    await collection.reset(fixtures.rawModelData)

    expect(collection.models.length).toBe(0)
  })
})
