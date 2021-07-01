import { Model, Transport } from '@fuerte/core'
import { IDBPDatabase, openDB } from 'idb'

export class TransportIDB<T extends Model> implements Transport<T> {
  protected db!: IDBPDatabase

  //TODO - clear database
  constructor(
    public dbName: string,
    public store = 'models',
    public keyPath = 'cid',
    protected customInitFn?: (
      dbName: string,
      store: string,
      keyPath: string
    ) => Promise<IDBPDatabase>
  ) {}

  async load(): Promise<{ data: any[] }> {
    const db = await this.getDB()
    const data = await db.getAll(this.store)

    return { data }
  }

  async save(model: T) {
    const db = await this.getDB()

    await db.put(this.store, model)
  }

  async delete(model: T) {
    const db = await this.getDB()

    await db.delete(this.store, model.identity)
  }

  async deleteAll() {
    const db = await this.getDB()

    await db.clear(this.store)
  }

  async reload(model: T) {
    const db = await this.getDB()

    return db.get(this.store, model.identity)
  }

  async getById(id: string) {
    const db = await this.getDB()
    const data = await db.get(this.store, id)
    if (data) {
      return { data }
    }
  }

  async initDB() {
    const db = await openDB(this.dbName, 1, {
      upgrade: (db, oldVersion) => {
        if (oldVersion === 0) {
          db.createObjectStore(this.store, { keyPath: this.keyPath })
        }
      },
      blocked() {
        if (__DEV__) {
          console.warn('idb: blocked')
        }
      },
      blocking() {
        if (__DEV__) {
          console.warn('idb: blocking')
        }
      },
      terminated() {
        if (__DEV__) {
          console.warn('idb: terminated')
        }
      }
    })

    return db
  }

  async getDB() {
    if (!this.db) {
      if (this.customInitFn) {
        this.db = await this.customInitFn(this.dbName, this.store, this.keyPath)
      } else {
        this.db = await this.initDB()
      }
    }

    return this.db
  }
}
