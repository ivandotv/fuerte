import type { Model } from '../model/Model'

export interface Transport<TModel extends Model<any> = Model<any>, TDTO = any> {
  load(config?: any): Promise<{ data: TDTO[] }>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

export class StubTransport<TModel extends Model<any> = Model<any>, TDTO = any>
  implements Transport<TModel, TDTO>
{
  load(): Promise<{ data: TDTO[] }> {
    return Promise.resolve({ data: [] })
  }

  save(m: TModel): Promise<void> {
    return Promise.resolve()
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
