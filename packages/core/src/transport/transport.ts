import type { Model } from '../model/Model'

export interface Transport<TModel extends Model<any> = Model<any>, TDTO = any> {
  load(config?: any): Promise<{ data: TDTO[] }>

  getById(id: string): Promise<{ data?: TDTO } | void>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

export class StubTransport<TModel extends Model<any> = Model<any>>
  implements Transport<TModel>
{
  load(): Promise<{ data: any[] }> {
    return Promise.resolve({ data: [] })
  }

  getById(id: string): Promise<void> {
    return Promise.resolve()
  }

  save(m: TModel): Promise<void> {
    return Promise.resolve()
  }

  delete(): Promise<void> {
    return Promise.resolve()
  }
}
