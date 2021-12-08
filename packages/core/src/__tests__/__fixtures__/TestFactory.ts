import { TestModel } from './TestModel'

export function testModelFactory(data: {
  foo?: string
  bar?: string
  id?: string
}) {
  const model = new TestModel(data.foo, data.bar, data.id)

  return model
}

export function testModelFactoryAsync(data: {
  foo?: string
  bar?: string
  id?: string
}) {
  const model = testModelFactory(data)

  return Promise.resolve(model)
}
