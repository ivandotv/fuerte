import { Model } from '@fuerte/core'
import 'fake-indexeddb/auto'
// @ts-ignore - no .d.ts files
import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { openDB } from 'idb'
import { TransportIDB } from '../idb-transport'

const dbName = 'test_db'
const store = 'test_store'
const keyPath = 'cid'

class TestModel extends Model {
  constructor(public foo: string = 'foo', public bar: string = 'bar') {
    super()
  }
}

class BookModel extends Model {
  static identityKey = 'isbn'

  constructor(public isbn: string) {
    super()
  }
}

describe('Transport IDB', () => {
  beforeEach(() => {
    global.indexedDB = new FDBFactory()
  })

  test('Create DB', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const db = await transport.getDB()

    expect(db.name).toBe(dbName)
    expect(db.objectStoreNames).toEqual([store])
  })

  test('Create DB with default arguments', async () => {
    const transport = new TransportIDB(dbName)
    const db = await transport.getDB()

    expect(transport.keyPath).toEqual('cid')
    expect(transport.store).toEqual('models')
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
    expect(createFn).toBeCalledWith(dbName, store, keyPath)
  })

  test('Save model', async () => {
    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new TestModel()

    await transport.save(model)

    const result = await transport.getById(model.identity)

    expect(result?.data).toEqual(model)
  })

  test('Save model with custom identity key', async () => {
    const keyPath = 'isbn'
    const isbn = '123'

    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new BookModel(isbn)

    await transport.save(model)

    const result = await transport.getById(model.identity)

    expect(result?.data).toEqual(model)
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
      data: expect.arrayContaining([model, modelTwo, modelThree])
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

  test('Delete model with custom identity key', async () => {
    const keyPath = 'isbn'
    const isbn = '123'

    const transport = new TransportIDB(dbName, store, keyPath)
    const model = new BookModel(isbn)
    await transport.save(model)

    await transport.delete(model)

    const result = await transport.getById(model.identity)
    expect(result).toBeUndefined()
  })
})
