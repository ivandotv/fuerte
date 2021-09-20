import type { Model } from '../model/Model'

export interface Transport<TModel extends Model<any> = Model<any>, TDTO = any> {
  load(config?: any): Promise<{ data: TDTO[] }>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

export class StubTransport<TModel extends Model<any> = Model<any>>
  implements Transport<TModel>
{
  load(): Promise<{ data: any[] }> {
    return Promise.resolve({ data: [] })
  }

  save(m: TModel): Promise<void> {
    return Promise.resolve()
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
