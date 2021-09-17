import { isPromise } from 'util/types'
import { Collection } from '../collection/Collection'
import { Model } from '../model/Model'
import { FactoryFn } from '../utils/types'

export function createModelFactory<
  TModel extends Model<Collection<any, any, any>>,
  TFactory extends FactoryFn<TModel>
>(factory: TFactory) {
  return {
    create(...args: Parameters<TFactory>): ReturnType<TFactory> {
      const modelPromise = factory(...args)
      if (isPromise(modelPromise)) {
        modelPromise.then((model: TModel) => {
          model.init()
        })
      } else {
        modelPromise.init()
      }

      // @ts-expect-error - generic return type
      return modelPromise
    }
  }
}
