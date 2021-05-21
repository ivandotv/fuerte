import { TestModel } from './TestModel'

export class TestFactory {
  create(data: { foo: string; bar: string; id?: string }): TestModel {
    const model = new TestModel(data.foo, data.bar, data.id)

    // return Promise.resolve(model)
    return model
  }
}
