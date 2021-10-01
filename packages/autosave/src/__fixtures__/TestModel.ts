import { makeObservable, observable } from 'mobx'
import { Model } from '@fuerte/core'

export type TestModelData = {
  foo?: string
  bar?: string
  id?: string
}

export class TestModel extends Model<any> {
  static identityKey = 'id'

  foo: string

  bar: string

  id: string | undefined

  constructor(foo = 'foo', bar = 'bar', id?: string) {
    super()
    this.foo = foo
    this.bar = bar
    this.id = id

    makeObservable(this, {
      foo: observable,
      bar: observable,
      id: observable
    })
  }

  serialize(): TestModelData {
    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }
}
