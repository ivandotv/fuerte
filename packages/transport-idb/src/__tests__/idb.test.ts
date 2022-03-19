import { Model } from '@fuerte/core'
import 'fake-indexeddb/auto'
import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { openDB } from 'idb'
import { TransportIDB } from '../idb-transport'

beforeEach(() => {
  global.indexedDB = new FDBFactory()
  jest.clearAllMocks()
})

const dbName = 'test_db'
const store = 'test_store'
const keyPath = 'id'

class TestModel extends Model {
  static identityKey = 'id'

  constructor(
    public foo: string = 'foo',
    public bar: string = 'bar',
    public id: string = String(Math.random())
  ) {
    super()
  }

  serialize(): Record<string, string> {
    return {
      id: this.id,
      foo: this.foo,
      bar: this.bar
    }
  }
}

describe('Transport IDB', () => {
  test('Create DB', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const db = await transport.getDB()

    expect(db.name).toBe(dbName)
    expect(db.objectStoreNames).toEqual([store])
  })

  test('Create DB with default arguments', async () => {
    const transport = new TransportIDB(dbName)
    const db = await transport.getDB()

    expect(transport.keyPath).toBe('cid')
    expect(transport.store).toBe('models')
    expect(db.name).toBe(dbName)
    expect(db.objectStoreNames).toEqual(['models'])
  })

  test('Create DB via custom function', async () => {
    const dbName = 'custom_name'
    const store = 'custom_store'
    const keyPath = 'custom_path'
    const createFn = jest
      .fn()
      .mockImplementation(async (dbName, store, keyPath) => {
        const db = await openDB(dbName, 1, {
          upgrade: (db, oldVersion) => {
            if (oldVersion === 0) {
              db.createObjectStore(store, { keyPath: keyPath })
            }
          }
        })

        return db
      })

    const transport = new TransportIDB(dbName, store, keyPath, createFn)
    const db = await transport.getDB()

    expect(db.name).toBe(dbName)
    expect(db.objectStoreNames).toEqual([store])
    expect(createFn).toHaveBeenCalledWith(dbName, store, keyPath)
  })

  test('Save model', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new TestModel()

    await transport.save(model)

    const result = (await transport.getById(model.identity)) as {
      data: unknown
    }

    expect(result.data).toEqual(model.payload)
  })

  test('Load all data', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new TestModel()
    const modelTwo = new TestModel('two')
    const modelThree = new TestModel('three')

    await transport.save(model)
    await transport.save(modelTwo)
    await transport.save(modelThree)

    const result = await transport.load()

    expect(result).toEqual({
      data: expect.arrayContaining([
        model.payload,
        modelTwo.payload,
        modelThree.payload
      ])
    })
  })

  test('Delete all data', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new TestModel()
    const modelTwo = new TestModel('two')
    const modelThree = new TestModel('three')
    await transport.save(model)
    await transport.save(modelTwo)
    await transport.save(modelThree)
    await transport.deleteAll()

    const result = await transport.load()

    expect(result).toEqual({ data: [] })
  })

  test('Delete model', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new TestModel()
    await transport.save(model)

    await transport.delete(model)

    const result = await transport.getById(model.identity)
    expect(result).toBeUndefined()
  })
})
