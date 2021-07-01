import { Model } from '../model/Model'

export interface Transport<TModel extends Model<any> = Model<any>> {
  load(config?: any): Promise<{ data: any[] }>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

export class InMemoryTransport<TModel extends Model<any> = Model<any>>
  implements Transport<TModel>
{
  load(): Promise<{ data: any[] }> {
    return Promise.resolve({ data: [] })
  }

  save(model: TModel): Promise<void> {
    return Promise.resolve()
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
