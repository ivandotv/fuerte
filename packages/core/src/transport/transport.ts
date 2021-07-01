import { Model } from '../model/Model'

export interface Transport<TModel extends Model<any> = Model<any>> {
  load(config?: any): Promise<{ data: any[] }>

  getById(id: string): Promise<{ data?: any } | void>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

export class InMemoryTransport<TModel extends Model<any> = Model<any>>
  implements Transport<TModel>
{
  load(): Promise<{ data: any[] }> {
    return Promise.resolve({ data: [] })
  }

  getById(id: string): Promise<void> {
    return Promise.resolve()
  }

  save(model: TModel): Promise<void> {
    return Promise.resolve()
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
