import { configure, runInAction } from 'mobx'
import {
  DuplicateModelStrategy,
  ModelCompareResult
} from '../collection/collection-config'
import { LoadConfig } from '../types'
import { ASYNC_STATUS } from '../utils'
import { fixtureFactory } from './__fixtures__/fixtureFactory'
import { TestCollection } from './__fixtures__/TestCollection'
import { TestModel, TestModelData } from './__fixtures__/TestModel'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()
let modelPool: TestModel[]

beforeEach(() => {
  modelPool = []
  for (let index = 0; index < 10; index++) {
    const model = fixtures.model()
    modelPool.push(model)
  }
  jest.clearAllMocks()
})

describe('Collection - load #load #collection', () => {
  test('Load method returns original response with the newly added models', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = {
      response: 'custom_response',
      data: fixtures.rawModelData
    }
    jest.spyOn(transport, 'load').mockResolvedValueOnce(response)

    const result = await collection.load()

    expect(result.response).toEqual(response)
    expect(result.added).toEqual(collection.models)
    expect(result.removed).toEqual([])
    expect(collection.models).toHaveLength(fixtures.rawModelData.length)
    expect(collection.models[0].foo).toBe(fixtures.rawModelData[0].foo)
    expect(collection.models[0].bar).toBe(fixtures.rawModelData[0].bar)
    expect(collection.models[1].foo).toBe(fixtures.rawModelData[1].foo)
    expect(collection.models[1].bar).toBe(fixtures.rawModelData[1].bar)
  })

  test('When load fails, return transport error', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'custom_response'
    jest.spyOn(transport, 'load').mockRejectedValueOnce(response)

    const result = await collection.load()

    expect(result.error).toEqual(response)
    expect(collection.models).toHaveLength(0)
  })

  test('When collection is loading, load status reflects the load state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    jest
      .spyOn(transport, 'load')
      .mockResolvedValueOnce({ data: fixtures.rawModelData })

    const result = collection.load()

    expect(collection.loadStatus).toBe(ASYNC_STATUS.PENDING)

    await result

    expect(collection.loadStatus).toBe(ASYNC_STATUS.RESOLVED)
  })

  test('When load fails, error can be retrived via instance property', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'custom_response'
    jest.spyOn(transport, 'load').mockRejectedValueOnce(response)

    await collection.load()

    expect(collection.loadStatus).toBe(ASYNC_STATUS.REJECTED)
    expect(collection.loadError).toBe(response)
  })

  test('When load is called multiple times, all new models are added.', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const firstBatchNum = 2
    jest.spyOn(transport, 'load').mockResolvedValueOnce({
      data: fixtures.rawModelData.slice(0, firstBatchNum)
    })

    await collection.load()

    jest.spyOn(transport, 'load').mockResolvedValueOnce({
      data: fixtures.rawModelData.slice(firstBatchNum)
    })

    await collection.load()

    expect(collection.models).toHaveLength(fixtures.rawModelData.length)
  })

  test('Return original response with all added and removed models', async () => {
    const transport = fixtures.transport()
    const modelToRemoveOne = fixtures.model()
    const modelToRemoveTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      load: {
        duplicateModelStrategy: DuplicateModelStrategy.KEEP_NEW
      }
    })
    const response = {
      response: 'custom_response',
      data: fixtures.rawModelData
    }
    jest.spyOn(transport, 'load').mockResolvedValueOnce(response)
    modelToRemoveOne.setIdentity(fixtures.rawModelData[0].id)
    modelToRemoveTwo.setIdentity(fixtures.rawModelData[1].id)
    modelToRemoveOne.foo = 'oldModelOne'
    modelToRemoveTwo.foo = 'oldModelTwo'
    collection.add([modelToRemoveOne, modelToRemoveTwo])

    const result = await collection.load()

    expect(result.response).toEqual(response)
    expect(result.removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ foo: 'oldModelOne' }),
        expect.objectContaining({ foo: 'oldModelTwo' })
      ])
    )
    expect(collection.models).toHaveLength(fixtures.rawModelData.length)
  })

  test('Reset collection with new models', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    jest
      .spyOn(transport, 'load')
      .mockResolvedValueOnce({ data: fixtures.rawModelData })
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add([modelOne, modelTwo])

    const result = await collection.load({ reset: true })

    expect(result.removed).toEqual(expect.arrayContaining([modelOne, modelTwo]))
    expect(collection.models).toHaveLength(fixtures.rawModelData.length)
  })

  describe('Default configuration #config', () => {
    test('Default duplicate model strategy is to keep the new model', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      const newValue = 'original'
      const original = fixtures.model()
      original.setIdentity(fixtures.rawModelData[0].id)
      original.foo = newValue
      collection.add(original)

      const result = await collection.load()

      expect(result.added).toEqual(collection.models)
      expect(result.removed).toEqual([original])
      expect(collection.models).toHaveLength(1)
      expect(collection.models[0].id).toBe(fixtures.rawModelData[0].id)
      expect(collection.models[0].foo).not.toBe(newValue)
    })

    test('Default insert position is at the end of the collection', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      collection.add(modelPool.slice(0, 5))

      await collection.load()

      const lastModel = collection.models[collection.models.length - 1]
      expect(lastModel.id).toBe(fixtures.rawModelData[0].id)
    })
  })

  describe('Insert position', () => {
    test('Add models at the end of the collection', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      collection.add(modelPool.slice(0, 5))

      await collection.load()

      const lastModel = collection.models[collection.models.length - 1]
      expect(lastModel.id).toBe(fixtures.rawModelData[0].id)
    })

    test('Add models at the beginning of the collection', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      collection.add(modelPool.slice(0, 5))

      await collection.load({ insertPosition: 'start' })

      const firstModel = collection.models[0]
      expect(firstModel.id).toBe(fixtures.rawModelData[0].id)
    })

    test('Model creation data can be modified before model creation', async () => {
      const modifiedData: TestModelData = {
        id: '123',
        foo: 'modified',
        bar: 'modified'
      }
      const transport = fixtures.transport()
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })

      class Test extends TestCollection {
        onModelCreateData(_data: TestModelData): TestModelData {
          return modifiedData
        }
      }
      const collection = new Test(fixtures.factory(), transport)

      await collection.load()

      expect(collection.models[0].foo).toBe(modifiedData.foo)
      expect(collection.models[0].bar).toBe(modifiedData.bar)
      expect(collection.models[0].id).toBe(modifiedData.id)
    })

    test('If the model creation data callback returns a falsy value, skip model creation', async () => {
      const transport = fixtures.transport()
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      class Test extends TestCollection {
        onModelCreateData(_data: TestModelData): void {}
      }
      const collection = new Test(fixtures.factory(), fixtures.transport())

      await collection.load()

      expect(collection.models).toHaveLength(0)
      for (let i = 0; i < collection.models.length; i++) {
        expect(collection.models[i]).toEqual(
          expect.objectContaining(fixtures.rawModelData[i])
        )
      }
    })
  })

  describe('Duplicate model strategy', () => {
    test('Keep the new model', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      const newValue = 'original'
      const original = fixtures.model()
      original.setIdentity(fixtures.rawModelData[0].id)
      original.foo = newValue
      collection.add(original)

      const result = await collection.load({
        duplicateModelStrategy: DuplicateModelStrategy.KEEP_NEW
      })

      expect(result.added).toEqual(collection.models)
      expect(result.removed).toEqual([original])
      expect(collection.models).toHaveLength(1)
      expect(collection.models[0].id).toBe(fixtures.rawModelData[0].id)
      expect(collection.models[0].foo).not.toBe(newValue)
    })

    test('Keep the old model', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 1)
      })
      const newValue = 'original'
      const original = fixtures.model()
      original.setIdentity(fixtures.rawModelData[0].id)
      original.foo = newValue
      collection.add(original)
      const result = await collection.load({
        duplicateModelStrategy: DuplicateModelStrategy.KEEP_OLD
      })

      expect(result.added).toEqual([])
      expect(result.removed).toEqual([])
      expect(collection.models).toHaveLength(1)
      expect(collection.models[0].foo).toBe(newValue)
    })

    test('Destroy removed models', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      jest.spyOn(transport, 'load').mockResolvedValueOnce({
        data: fixtures.rawModelData.slice(0, 2)
      })

      collection.add([
        collection.create(fixtures.rawModelData[0]),
        collection.create(fixtures.rawModelData[1])
      ])

      const result = await collection.load({
        duplicateModelStrategy: DuplicateModelStrategy.KEEP_NEW,
        destroyOnRemoval: true
      })

      expect(result.removed?.length).toBeTruthy()

      result.removed?.forEach((m) => {
        expect(m.isDestroyed).toBe(true)
      })
    })

    describe('Custom compare function', () => {
      test('Compare function is called with appropriate arguments', async () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const compareFn = jest.fn(() => {
          return ModelCompareResult.KEEP_NEW
        })
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const fooProp = 'original'
        const original = fixtures.model()
        const transportConfig = 'custom_transport_config'
        const loadConfig: LoadConfig = {
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          compareFn,
          insertPosition: 'end',
          reset: false
        }
        original.setIdentity(fixtures.rawModelData[0].id)
        original.foo = fooProp
        collection.add(original)

        // @ts-expect-error - transport config
        await collection.load(loadConfig, transportConfig)

        expect(compareFn).toHaveBeenCalledTimes(1)
        expect(compareFn).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', foo: '1' }),
          original
        )
      })

      test('Keep the new model', async () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const compareFn = jest.fn(() => {
          return ModelCompareResult.KEEP_NEW
        })
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const newValue = 'original'
        const original = fixtures.model()
        original.setIdentity(fixtures.rawModelData[0].id)
        original.foo = newValue
        collection.add(original)

        const result = await collection.load({
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          compareFn
        })

        expect(result.added).toEqual(collection.models)
        expect(result.removed).toEqual([original])
        expect(collection.models).toHaveLength(1)
      })

      test('Keep the old model', async () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const compareFn = jest.fn(() => {
          return ModelCompareResult.KEEP_OLD
        })
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const newValue = 'original'
        const original = fixtures.model()
        original.setIdentity(fixtures.rawModelData[0].id)
        original.foo = newValue

        collection.add(original)

        const result = await collection.load({
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          compareFn,
          insertPosition: 'end'
        })

        expect(result.added).toEqual([])
        expect(result.removed).toEqual([])
        expect(collection.models).toHaveLength(1)
      })

      test('Keep both models', async () => {
        const transport = fixtures.transport()
        const collection = new TestCollection(fixtures.factory(), transport, {
          load: {
            compareFn: (a: TestModel) => ModelCompareResult.KEEP_NEW
          }
        })
        jest.fn((newModel: TestModel, oldModel: TestModel) => {
          // when keeping both models, new model needs to have a new unique identity
          newModel.setIdentity('99')

          return ModelCompareResult.KEEP_BOTH
        })
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const fooProp = 'original'
        const original = fixtures.model()
        original.setIdentity(fixtures.rawModelData[0].id)
        runInAction(() => {
          original.foo = fooProp
        })
        collection.add(original)

        const result = await collection.load({
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          compareFn: (newModel: TestModel) => {
            // when keeping both models, new model needs to have a new unique identity
            newModel.setIdentity('99')

            return ModelCompareResult.KEEP_BOTH
          }
        })

        expect(result.removed).toEqual([])
        expect(collection.models).toHaveLength(2)
      })

      test('When keeping both models, if the new model has a non unique identity, throw error', async () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const compareFn = jest.fn(() => {
          return ModelCompareResult.KEEP_BOTH
        })
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const original = fixtures.model()
        original.setIdentity(fixtures.rawModelData[0].id)
        collection.add(original)

        const result = await collection.load({
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          compareFn
        })

        expect((result.error as Error).message).toMatch(/non unique identity/)
      })

      test('If the compare function returns a non recognized result, throw error', async () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        jest.spyOn(transport, 'load').mockResolvedValueOnce({
          data: fixtures.rawModelData.slice(0, 1)
        })
        const fooProp = 'original'
        const original = fixtures.model()
        original.setIdentity(fixtures.rawModelData[0].id)
        original.foo = fooProp
        collection.add(original)

        const result = await collection.load({
          duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
          // @ts-expect-error - itentionally return wrong result
          compareFn: () => {
            return 'non_recognized_result'
          }
        })

        expect((result.error as Error).message).toMatch(
          /Invalid compare result/
        )
      })
    })
  })

  describe('Callbacks', () => {
    test('On load start, start callback is called', async () => {
      const transport = fixtures.transport()
      const transportConfig = 'config'
      const config: Required<LoadConfig> = {
        duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
        reset: false,
        compareFn: () => ModelCompareResult.KEEP_NEW,
        insertPosition: 'end',
        destroyOnRemoval: false,
        destroyOnReset: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const loadStartSpy = jest.spyOn(collection, 'onLoadStart')

      // @ts-expect-error transport config
      await collection.load(config, transportConfig)

      expect(loadStartSpy).toHaveBeenCalledWith({
        transportConfig,
        config
      })
    })

    test('On load success, success callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const response = {
        data: [{ foo: 'foo-reload', bar: 'bar-reload', id: '1' }]
      }
      const transportConfig = 'config'
      const config: LoadConfig = collection.getConfig().load
      const onLoadSuccessSpy = jest.spyOn(collection, 'onLoadSuccess')
      jest.spyOn(transport, 'load').mockResolvedValue(response)

      // @ts-expect-error transport config
      await collection.load(config, transportConfig)

      expect(onLoadSuccessSpy).toHaveBeenCalledWith({
        config,
        response,
        transportConfig,
        added: collection.models,
        removed: []
      })
    })

    test('On load error, load error callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = 'response'
      const transportConfig = 'config'
      const collection = fixtures.collection(fixtures.factory(), transport)
      const config = collection.getConfig().load
      const loadErrorSpy = jest.spyOn(collection, 'onLoadError')
      jest.spyOn(transport, 'load').mockRejectedValue(response)
      await collection.save(model)

      // @ts-expect-error transport config
      const result = await collection.load(config, transportConfig)

      expect(loadErrorSpy).toHaveBeenCalledWith({
        error: result.error,
        config,
        transportConfig
      })
    })
  })
})
