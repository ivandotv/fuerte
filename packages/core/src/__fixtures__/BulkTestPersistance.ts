import { v4 as uuid } from 'uuid'
import { BulkPersistence, Persistence } from '../transport/persistence'
import { TestModel } from './TestModel'
/* eslint-disable @typescript-eslint/explicit-function-return-type  */
export class TestBulkPersistence extends BulkPersistence<TestModel> {
  load(_config: any) {
    return Promise.resolve({
      response: 'custom_response',
      data: [
        { foo: '1', bar: '1', id: '1' },
        { foo: '2', bar: '2', id: '2' },
        { foo: '3', bar: '3', id: '3' },
        { foo: '4', bar: '4', id: '4' },
        { foo: '5', bar: '5', id: '5' }
      ]
    })
  }

  async save(
    _model: TestModel,
    _config?: { server: string; prefetch: boolean }
  ) {
    return Promise.resolve({ data: { id: uuid() } })
  }

  async reload(_model: TestModel, _config?: any) {
    return Promise.resolve({
      data: { foo: `${_model.cid}-foo`, bar: `${_model.cid}-bar` }
    })
  }

  async delete(_config: any): Promise<{ data: any }> {
    return Promise.resolve({ data: undefined })
  }

  async bulkSave(models: TestModel[], _config?: any) {
    const data: { [key: string]: { id: string } } = {}

    for (const model of models) {
      data[model.cid] = {
        id: uuid()
      }
    }

    return Promise.resolve({ data })
  }

  async bulkReload(models: TestModel[], _config?: any) {
    const data: { [key: string]: any } = {}

    for (const model of models) {
      data[model.identity] = {
        foo: `${model.identity}-foo`,
        bar: `${model.identity}-bar`
      }
    }

    return Promise.resolve({ data })
  }

  async bulkDelete(_models: TestModel[], _config?: any) {
    return Promise.resolve({ status: 'deleted', data: {} })
  }
}
