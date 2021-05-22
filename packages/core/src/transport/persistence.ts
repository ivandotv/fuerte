import { Model } from '../model/Model'

export interface Persistence<TModel extends Model<any> = Model<any>> {
  load(config?: any): Promise<{ data: any[] }>

  save(model: TModel, config?: any): Promise<{ data?: any }>

  reload(model: TModel, config?: any): Promise<{ data: any }>

  delete(model: TModel, config?: any): Promise<{ data?: any }>
}

export class InMemoryPersistance implements Persistence {
  load(): Promise<{ data: any[] }> {
    return Promise.resolve({ data: [] })
  }

  save(): Promise<{ data?: any }> {
    return Promise.resolve({})
  }

  reload(): Promise<{ data: any }> {
    return Promise.resolve({ data: [] })
  }

  delete(): Promise<{ data?: any }> {
    return Promise.resolve({})
  }
}
