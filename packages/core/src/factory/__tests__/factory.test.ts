import { Model } from '../../model/Model'
import { createModelFactory } from '../factory'

class FactoryModel extends Model {
  constructor(public name: string) {
    super()
  }

  serialize() {
    return { name: this.name }
  }
}

describe('Factory #factory', () => {
  test('Create model  synchronously', () => {
    const modelName = 'model'
    const factory = createModelFactory((name: string) => new FactoryModel(name))

    const model = factory.create(modelName)
    expect(model).toBeInstanceOf(FactoryModel)
  })

  test('Create model  asynchronously', async () => {
    const modelName = 'model'
    const factory = createModelFactory((name: string) =>
      Promise.resolve(new FactoryModel(name))
    )

    const model = await factory.create(modelName)
    expect(model).toBeInstanceOf(FactoryModel)
  })

  test('Correctly pass arguments to factory function', () => {
    const modelName = 'model'
    const factory = createModelFactory((name: string) => new FactoryModel(name))

    const model = factory.create(modelName)
    expect(model.name).toBe(modelName)
  })
})
