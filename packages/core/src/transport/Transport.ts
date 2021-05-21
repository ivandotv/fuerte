import { Model } from '../model/Model'
import { TestModel } from '../__fixtures__/TestModel'

// export interface TransportConfig {
//   // identifier?: string
//   // newModelId?: <T extends { newId?: string }>(
//   //   response: SingleResponse<T>
//   // ) => string | void
// }

export type LoadResponse<T> = Promise<{
  response: any
  data: T[]
}>

//todo - transport bi mozda trebao da bude abstraktna klasa?
export abstract class Persistence<TModel extends Model<any>> {
  abstract save(_model: TModel, _config?: any): Promise<{ data?: any }>

  abstract reload(_model: TModel, _config?: any): Promise<{ data: any }>

  abstract delete(_model: TModel, _config?: any): Promise<{ data?: any }>

  abstract load(_config?: any): Promise<{ data: any[] }>
}

export abstract class BulkPersistence<
  TModel extends Model<any>,
  TDTO = any
> extends Persistence<TModel> {
  abstract bulkDelete(
    _models: TModel[],
    _config?: any
  ): Promise<{ data: Record<string, any> }>

  abstract bulkReload(
    _models: TModel[],
    _config?: any,
    _serializedData?: Map<string, TDTO>
  ): Promise<{ data: Record<string, any> }>

  abstract bulkSave(
    _models: TModel[],
    _config?: any,
    _serializedData?: Map<string, TDTO>
  ): Promise<{ data: Record<string, any> }>
}
