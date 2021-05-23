import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()
describe('Model Autosave', () => {
  test('By default autosave option is disabled', async () => {
    const collection = fixtures.collection()

    const config = collection.getConfig()
    expect(config.autoSave.enabled).toBe(false)
    expect(config.autoSave.debounceMs).toBe(0)
  })

  test('When model is changed autosave is called immediately', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const model = fixtures.model()

    collection.add(model)

    model.foo = 'new foo'
    const newDataOne = model.payload

    model.bar = 'new bar'
    const newDataTwo = model.payload

    expect(autoSaveSpy).toBeCalledTimes(2)
    expect(transportSaveSpy).toBeCalledTimes(2)

    expect(autoSaveSpy.mock.calls[0][0]).toEqual({ model, data: newDataOne })
    expect(autoSaveSpy.mock.calls[1][0]).toEqual({ model, data: newDataTwo })
  })
  test('When model is changed autosave is debounced', () => {
    jest.useFakeTimers()
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true,
        debounceMs: 100
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const model = fixtures.model()

    collection.add(model)

    model.foo = 'new foo'
    model.bar = 'new bar'
    const oldData = model.payload
    model.foo = 'new foo 2'
    const newData = model.payload

    jest.runAllTimers()

    expect(autoSaveSpy).toBeCalledTimes(1)
    expect(transportSaveSpy).toBeCalledTimes(1)

    expect(autoSaveSpy).toBeCalledWith(
      { model, data: newData },
      { model, data: oldData },
      expect.anything() // mobx reaction disposer()
    )
  })

  test('When model is removed from the collection, autosave is disabled', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const model = fixtures.model()

    collection.add(model)

    model.foo = 'new foo'

    collection.remove(model)

    model.foo = 'foo 2'
    model.foo = 'foo 3'

    expect(autoSaveSpy).toBeCalledTimes(1)
    expect(transportSaveSpy).toBeCalledTimes(1)
  })

  test('Start autosave for one model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()

    collection.add(model)

    const result = collection.startAutoSave(model)
    model.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(1)
    expect(transportSaveSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model])
    expect(result).toBe(model)
  })

  test('Start autosave for multiple models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    const result = collection.startAutoSave([model, modelTwo])

    model.foo = 'new foo'
    modelTwo.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(2)
    expect(transportSaveSpy).toBeCalledTimes(2)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model, modelTwo])
    expect(result).toStrictEqual([model, modelTwo])
  })

  test('Start autosave for multiple models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    const result = collection.startAutoSave([model, modelTwo])

    model.foo = 'new foo'
    modelTwo.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(2)
    expect(transportSaveSpy).toBeCalledTimes(2)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model, modelTwo])
    expect(result).toStrictEqual([model, modelTwo])
  })

  test('Start autosave for all models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    const result = collection.startAutoSave()

    model.foo = 'new foo'
    modelTwo.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(2)
    expect(transportSaveSpy).toBeCalledTimes(2)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith(collection.models)
    expect(result).toStrictEqual(collection.models)
  })

  test('Dont start autosave for already started model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })

    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    collection.startAutoSave(model)

    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const result = collection.startAutoSave([model, modelTwo])

    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([modelTwo])
    expect(result).toStrictEqual([modelTwo])
  })

  test('Stop autosave for one model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStopAutoSave')
    const model = fixtures.model()

    collection.add(model)

    const result = collection.stopAutoSave(model)

    model.foo = 'new foo'
    model.bar = 'new bar'

    expect(autoSaveSpy).toBeCalledTimes(0)
    expect(transportSaveSpy).toBeCalledTimes(0)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model])
    expect(result).toStrictEqual(model)
  })

  test('Stop autosave for multiple models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStopAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    const result = collection.stopAutoSave([model, modelTwo])

    model.foo = 'new foo'
    model.bar = 'new bar'

    modelTwo.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(0)
    expect(transportSaveSpy).toBeCalledTimes(0)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model, modelTwo])
    expect(result).toEqual([model, modelTwo])
  })

  test('Stop autosave for all models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const callbackSpy = jest.spyOn(collection, 'onStopAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    const result = collection.stopAutoSave()

    model.foo = 'new foo'
    model.bar = 'new bar'

    modelTwo.foo = 'new foo'

    expect(autoSaveSpy).toBeCalledTimes(0)
    expect(transportSaveSpy).toBeCalledTimes(0)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith(collection.models)
    expect(result).toEqual(collection.models)
  })

  test('Dont stop autosave for already stoped model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const autoSaveSpy = jest.spyOn(collection, 'autoSave')
    const transportSaveSpy = jest.spyOn(transport, 'save')
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add(model)
    collection.add(modelTwo)

    collection.startAutoSave([model, modelTwo])

    model.foo = 'new foo'
    modelTwo.foo = 'new foo'

    collection.stopAutoSave(modelTwo)

    const callbackSpy = jest.spyOn(collection, 'onStopAutoSave')

    const result = collection.stopAutoSave([model, modelTwo])

    expect(autoSaveSpy).toBeCalledTimes(2)
    expect(transportSaveSpy).toBeCalledTimes(2)
    expect(callbackSpy).toBeCalledTimes(1)
    expect(callbackSpy).toBeCalledWith([model])
    expect(result).toStrictEqual([model])
  })
})
