import { NormalizedPromiseResult } from '../../utils/utils'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TransportConfig, Model } from '../..'
import { Persistence, TransportResult } from '../Transport'

const factory = fixtureFactory()
describe('Base Transport', () => {
  let modelPool: any[]
  beforeEach(() => {
    modelPool = []
    for (let index = 0; index <= 10; index++) {
      modelPool.push(factory.model())
    }
  })

  describe('Configuration', () => {
    test('Use configuration passed in constructor ', () => {
      const config: TransportConfig = { identifier: '_id' }

      const transport = factory.transport(config)

      expect(transport.config).toEqual(config)
    })
  })
  describe('Save', () => {
    describe('Successful save', () => {
      test('Resolve promise successfuly', async () => {
        const transport = factory.transport()

        await expect(transport.save(modelPool[0])).resolves.toBeTruthy()
      })
      test('Return same item instances that were passed in to be saved', async () => {
        const transport = factory.transport()

        const items = modelPool.slice(0, 2)
        const r = await transport.save(items)

        expect(r.successful.length).toBe(items.length)
        expect(r.successful[0].identifier).toBe(items[0].id)
        expect(r.successful[1].identifier).toBe(items[1].id)
      })

      test('Return correct transport result', async () => {
        const transport = factory.transport()
        const items = modelPool.slice(0, 2)
        const response = {
          successful: [
            {
              id: items[0].id,
              response: {}
            },
            {
              id: items[1].id,
              response: {}
            }
          ],
          failed: []
        }

        const result = await transport.save(items)

        expect(result).toEqual(response)
      })

      test('Call save success hook on successful save with the correct arguments', async () => {
        const transport = factory.transport()
        const saveSuccessSpy = jest.spyOn(transport, 'onSaveSuccess')
        const items = modelPool.slice(0, 2)
        const result = [
          {
            id: items[0].id,
            response: {}
          },

          {
            id: items[1].id,
            response: {}
          }
        ]

        await transport.save(items)

        expect(saveSuccessSpy).toBeCalledTimes(1)
        expect(saveSuccessSpy).toBeCalledWith(result)
      })
    })
    describe('Failed Save', () => {
      const transportSaveMock = function (
        models: any[],
        _config = {}
      ): Promise<any> {
        const result: {
          successful: NormalizedPromiseResult['result'][]
          failed: NormalizedPromiseResult['result'][]
        } = {
          successful: [],
          failed: []
        }
        models.forEach((model) => {
          result.failed.push({ id: model.id, response: {} })
        })

        return Promise.reject(result)
      }

      test('Return rejected promise when "save" method fails', async () => {
        const transport = factory.transport()
        const itemsToSave = modelPool.splice(0, 2)
        jest
          .spyOn(transport, 'saveImplementation')
          .mockImplementation(transportSaveMock)
        const result = {
          successful: [],
          failed: [
            {
              id: itemsToSave[0].id,
              response: {}
            },
            {
              id: itemsToSave[1].id,
              response: {}
            }
          ]
        }

        expect.assertions(1)
        await expect(transport.save(itemsToSave)).rejects.toEqual(result)
      })

      test('Return proper result when trying to save all items fails', async () => {
        const transport = factory.transport()
        const itemsToSave = modelPool.splice(0, 2)
        jest
          .spyOn(transport, 'saveImplementation') // internal template hook - bad name
          .mockImplementation(transportSaveMock)
        const result = {
          successful: [],
          failed: [
            {
              id: itemsToSave[0].id,
              response: {}
            },
            {
              id: itemsToSave[1].id,
              response: {}
            }
          ]
        }

        expect.assertions(1)

        try {
          await transport.save(itemsToSave)
        } catch (e) {
          expect(e).toEqual(result)
        }
      })

      test('Replace model id, for successful models', async () => {
        class TestTransport extends Persistence {
          saveImplementation(models: Model[]): Promise<TransportResult> {
            return super.saveImplementation(models)
          }
        }
        const transport = new TestTransport({ identifier: '__newIdKey' })
        const modelOne = factory.model()
        const newIdOne = '123'

        const modelTwo = factory.model()
        const oldIdTwo = modelTwo.id

        const transportResponse = {
          successful: [
            {
              id: modelOne.id,
              response: {
                __newIdKey: newIdOne
              }
            }
          ],
          failed: [
            {
              id: modelTwo.id,
              response: {
                status: 'fail'
              }
            }
          ]
        }
        jest
          .spyOn(transport, 'saveImplementation')
          .mockRejectedValue(transportResponse)

        try {
          await transport.save([modelOne, modelTwo])
        } catch (e) {
          expect(modelOne.id).toEqual(newIdOne)
          expect(modelTwo.id).toEqual(oldIdTwo)
        }
      })

      test('Call save error hook method hook with the correct arguments ', async () => {
        const transport = factory.transport()
        const itemsToSave = modelPool.splice(0, 2)
        jest
          .spyOn(transport, 'saveImplementation')
          .mockImplementation(transportSaveMock)
        const onSaveErrorSpy = jest.spyOn(transport, 'onSaveError')
        const result = {
          successful: [],
          failed: [
            {
              id: itemsToSave[0].id,
              response: {}
            },
            {
              id: itemsToSave[1].id,
              response: {}
            }
          ]
        }

        expect.assertions(1)

        try {
          await transport.save(itemsToSave)
        } catch (e) {
          expect(onSaveErrorSpy).toBeCalledWith(result)
        }
      })
    })
  })
})
