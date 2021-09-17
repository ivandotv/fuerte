import { nanoid } from 'nanoid'
import { Transport } from '../transport/transport'
import { TestModel } from './TestModel'
/* eslint-disable @typescript-eslint/explicit-function-return-type  */
export class TestTransport implements Transport<TestModel> {
  data = [
    { foo: '1', bar: '1', id: '1' },
    { foo: '2', bar: '2', id: '2' },
    { foo: '3', bar: '3', id: '3' },
    { foo: '4', bar: '4', id: '4' },
    { foo: '5', bar: '5', id: '5' }
  ]

  load(_config: string) {
    return Promise.resolve({
      data: this.data
    })
  }

  save(_model: TestModel, _config?: any) {
    return Promise.resolve({ data: { id: nanoid() } })
  }

  delete(_model: TestModel, _config: any): Promise<{ data: any }> {
    return Promise.resolve({ data: undefined })
  }

  async getById(id: string) {
    return { data: this.data.find(model => model.id === id) }
  }
}
