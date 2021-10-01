import { configure } from 'mobx'
import { AutosaveCollectionConfig } from '../utils/types'
import { fixtureFactory } from '../__fixtures__/fixtureFactory'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()
describe('Collection - autosave #autosave #collection', () => {
  test('Can pass in custom configuration', () => {
    const customConfig: AutosaveCollectionConfig = {
      autoSave: {
        enabled: true
      },
      add: {
        insertPosition: 'start'
      },
      load: {
        insertPosition: 'start'
      },
      save: {
        insertPosition: 'start'
      },
      delete: { removeOnError: true }
    }

    const collection = fixtures.collection(undefined, undefined, customConfig)

    expect(collection.getConfig()).toMatchObject(customConfig)
  })

  test('By default autosave option is disabled', async () => {
    const collection = fixtures.collection()

    const config = collection.getConfig()

    expect(config.autoSave.enabled).toBe(false)
    expect(config.autoSave.debounce).toBe(0)
  })

  test('When the model is changed autosave is called immediately', () => {
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
    model.bar = 'new bar'

    expect(autoSaveSpy).toHaveBeenCalledTimes(2)
    expect(transportSaveSpy).toHaveBeenCalledTimes(2)
  })

  test('When debounce is active, model is saved with a delay', () => {
    jest.useFakeTimers()
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: true,
        debounce: 100
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

    expect(autoSaveSpy).toHaveBeenCalledTimes(1)
    expect(transportSaveSpy).toHaveBeenCalledTimes(1)
    expect(autoSaveSpy).toHaveBeenCalledWith(
      { model, data: newData },
      { model, data: oldData },
      expect.anything() // mobx reaction disposer()
    )
  })

  test('When the model is removed from the collection, autosave is disabled', () => {
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

    collection.remove(model.cid)

    model.foo = 'foo 2'
    model.foo = 'foo 3'

    expect(autoSaveSpy).toHaveBeenCalledTimes(0)
    expect(transportSaveSpy).toHaveBeenCalledTimes(0)
  })

  test('Start autosave for one model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    collection.add(model)

    const result = collection.startAutoSave(model)

    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([model])
    expect(result).toBe(model)
  })

  test('Start autosave for multiple models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add(model)
    collection.add(modelTwo)

    const result = collection.startAutoSave([model, modelTwo])

    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([model, modelTwo])
    expect(result).toStrictEqual([model, modelTwo])
  })

  test('Start autosave for all models', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport, {
      autoSave: {
        enabled: false
      }
    })
    const callbackSpy = jest.spyOn(collection, 'onStartAutoSave')
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add(model)
    collection.add(modelTwo)

    const result = collection.startAutoSave()

    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith(collection.models)
    expect(result).toStrictEqual(collection.models)
  })

  test('Dont start autosave if autosave is already active for the model', () => {
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

    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([modelTwo])
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

    expect(autoSaveSpy).toHaveBeenCalledTimes(0)
    expect(transportSaveSpy).toHaveBeenCalledTimes(0)
    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([model])
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

    expect(autoSaveSpy).toHaveBeenCalledTimes(0)
    expect(transportSaveSpy).toHaveBeenCalledTimes(0)
    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([model, modelTwo])
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

    expect(autoSaveSpy).toHaveBeenCalledTimes(0)
    expect(transportSaveSpy).toHaveBeenCalledTimes(0)
    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith(collection.models)
    expect(result).toEqual(collection.models)
  })

  test('Do not stop autosave for already stoped model', () => {
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

    expect(autoSaveSpy).toHaveBeenCalledTimes(2)
    expect(transportSaveSpy).toHaveBeenCalledTimes(2)
    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(callbackSpy).toHaveBeenCalledWith([model])
    expect(result).toStrictEqual([model])
  })
})
