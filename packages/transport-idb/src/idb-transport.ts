import { Model, Transport } from '@fuerte/core'
import { IDBPDatabase, openDB } from 'idb'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TransportIDB<T extends Model = Model, K = any>
  implements Transport<T, K>
{
  protected db!: IDBPDatabase

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

  async load(): Promise<{ data: K[] }> {
    const db = await this.getDB()
    const data = await db.getAll(this.store)

    return { data }
  }

  async save(model: T): Promise<void> {
    const db = await this.getDB()

    await db.put(this.store, model.payload)
  }

  async delete(model: T): Promise<void> {
    const db = await this.getDB()

    await db.delete(this.store, model.identity)
  }

  async deleteAll(): Promise<void> {
    const db = await this.getDB()

    await db.clear(this.store)
  }

  async getById(id: string): Promise<{ data: K } | void> {
    const db = await this.getDB()
    const data = await db.get(this.store, id)
    if (data) {
      return { data }
    }
  }

  async initDB(): Promise<IDBPDatabase> {
    const db = await openDB(this.dbName, 1, {
      upgrade: (db, oldVersion) => {
        /* istanbul ignore next */
        if (oldVersion === 0) {
          db.createObjectStore(this.store, { keyPath: this.keyPath })
        }
      },
      /* istanbul ignore next */
      blocked() {
        if (__DEV__) {
          console.warn('idb: blocked')
        }
      },
      /* istanbul ignore next */
      blocking() {
        if (__DEV__) {
          console.warn('idb: blocking')
        }
      },
      /* istanbul ignore next */
      terminated() {
        if (__DEV__) {
          console.warn('idb: terminated')
        }
      }
    })

    return db
  }

  async getDB(): Promise<IDBPDatabase> {
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
