# Fuerte

[![Test](https://github.com/ivandotv/fuerte/actions/workflows/CI.yml/badge.svg)](https://github.com/ivandotv/fuerte/actions/workflows/CI.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/ivandotv/fuerte)](https://app.codecov.io/gh/ivandotv/fuerte)
[![GitHub license](https://img.shields.io/github/license/ivandotv/fuerte)](https://github.com/ivandotv/fuerte/blob/main/LICENSE)

Mobx powered library inspired by the best parts of Backbone.js and Ember.js

<!-- toc -->

- [Motivation](#motivation)
- [Installation](#installation)
- [Usage](#usage)
  - [Model](#model)
  - [Factory](#factory)
  - [Transport](#transport)
  - [Collection](#collection)
  - [Putting it all together](#putting-it-all-together)
- [Model](#model-1)
  - [Properties](#properties)
  - [Methods](#methods)
  - [Callbacks](#callbacks)
- [Collection](#collection-1)
  - [Collection concepts](#collection-concepts)
    - [Data loading](#data-loading)
    - [Reset](#reset)
  - [Callbacks](#callbacks-1)
- [Autosave Collection](#autosave-collection)
  - [Callbacks](#callbacks-2)
- [Transport](#transport-1)
- [Recipes](#recipes)
  - [Use composition instead of inheritance](#use-composition-instead-of-inheritance)
  - [Restufl transport](#restufl-transport)

<!-- tocstop -->

## Motivation

It started as an experiment in using domain-driven design and separation of concerns in the frontend.
The idea was to separate the Model, Model Collection, and Persistence (Transport) into three distinct parts.

- Model should be an object that mostly just carries data
- Collection should implement business logic, and act as aggregation root for the Model
- Transport should only be concerned with persisting data.

After some trial and error, I've ended up with a library that I think, satisfies these concerns.

The `Collection` part of the library is inspired by [Backbone.js](https://backbonejs.org/#Collection) while the `Model` part of the library is inspired by [Ember.js](https://guides.emberjs.com/release/models/#toc_what-are-ember-data-models)

[Mobx](mobx.js.org/) is used for the reactivity so we don't concern ourselves with integrating the library with different frontend frameworks.

This abstraction on top of the Mobx will cost you an additional [~4.3KB](https://bundlephobia.com/package/@fuerte/core), and I think it's worth it.

## Installation

```sh
npm i @fuerte/core
```

## Usage

To showcase the basic usage and capabilities of the library, we are going to create a simple **todo** app.

- Todo `Model` (todo item)
- Model collection (`Collection` of todo items)
- Factory function for creating new models
- Transport for persisting the models ( local storage, REST API, etc..)

### Model

First, we will create a `Model`.
Models usually carry the data, but they can also have their methods to manipulate the data or perform other tasks.

The `model` will have an `id`, `done`, and a `task` properties.

Every `model` needs to have a `serialize` method which will be used to serialize the model to storage, and track if the model is _dirty_ (has changed properties).

```ts
import {Model} from '@fuerte/core`
import { makeObservable, action, observable } from 'mobx'

class Todo extends Model {
  public done: boolean

  constructor(public task: string, public id?: number) {
    super()

    this.done = false

    makeObservable(this, {
      task: observable,
      done: observable,
      setTask: action,
    })
  }

  //data to be saved when the model is persisted
  serialize() {
    return {
      id: this.id,
      task: this.task,
      done: this.done,
    }
  }

  setTask(task: string) {
    this.task = task
  }
}

```

### Factory

Next, we need a `model factory`. This is a function whose purpose is to create the new `Model` instance, the function can be asynchronous.

```ts
import type { FactoryFn } from '@fuerte/core'

export type ModelDTO = { task: string; id?: number }

const modelFactory: FactoryFn = (data: ModelDTO) => {
  return new Todo(data.task, data.id ?? Math.random())
}
```

### Transport

Next, we create the transport layer. The transport layer is used for transporting (persisting) the data. Usually, the transport layer will use `fetch`, `localStorage`, or `IndexedDB`. In this simple example, we are going to save the data _in memory_.

Transport class needs to implement `Transport` interface, which requires three methods:

- `load`: loads the data from somewhere, this is usually used when the app first starts. This method **does not create the model instances**, it just returns the raw data (`ModelDTO` in the model section) that will later be used by the factory function to construct the models.
- `save`: for saving or updating the model
- `delete`: for deleting the model

```ts
import type { Transport } from '@fuerte/core'

//sample data
const firstTodo = { id: 1, task: 'Remember the milk' }
const secondTodo = { id: 2, task: 'Return books to the library' }

//simple in memory storage
const storage: Map<string, ModelDTO> = new Map()

//populate the storage
storage.set(firstTodo.id, firstTodo)
storage.set(secondTodo.id, secondTodo)

//transport implementation
export class MemoryTransport implements Transport {
  load(): Promise<{ data: ModelDTO[] }> {
    // return everything from the storage
    return Promise.resolve({ data: [...storage.values()] })
  }

  save(model: Todo) {
    storage.set(model.id, model.payload)
  }

  delete(model: Todo) {
    storage.delete(model.id)
  }
}
```

### Collection

One final missing piece and also the most important one is the `Collection`.

Business logic should generally be set on the collection. You can think of the collection as the [`Mobx store`](https://mobx.js.org/defining-data-stores.html#defining-data-stores).

To construct the `Collection` class instance we need both the `factory` and the `transport`.

```ts
import { Collection } from '@fuerte/core'
import { makeObservable computed } from 'mobx'
import {modelFactory} from './modelFactory'
import {MemoryTransport} from './memoryTransport'

class TodoCollection extends Collection<
  Todo,
  typeof modelFactory,
  MemoryTransport
> {
  constructor(factory: typeof modelFactory, transport: MemoryTransport) {
    super(factory, transport)

    makeObservable(this, {
      doneTasks: computed
    })
  }

  get doneTasks() {
    return this.models.filter((model) => model.done === true)
  }
}
```

### Putting it all together

Now that we have all the pieces that we need. We can build our Todo app.

```ts
import { modelFactory } from './modelFactory'
import { MemoryTransport } from './memoryTransport'
import { TodoCollection } from './todoCollection'

// create the collection instance
const collection = new TodoCollection(modelFactory, MemoryTransport)

//load all the models (calls MemoryTransport.load under the hood)
const loadResult = await collection.load()

//get first task from the collection
const todoOne = collection.models[0]
todoOne.task // 'remember the milk'

todoOne.isDirty // false (model hasn't changed)

todoOne.setTask('remember the icecream instead')
todoOne.isDirty //true (model.task has changed)

//save the model to the storage (MemoryTransport)
const result = await todoOne.save()

//"done" tasks
collection.doneTasks // []

todoOne.done = true
todoOne.isDirty // true - model is dirty again

collection.doneTasks // [todoOne]

//Let's create a completely new todo
const newTodo = collection.create({ id: '3', task: 'buy cat food' })
newTodo.isNew //true
newTodo.isDirty // false Note new models are not dirty!

//just add the model to the collection without saving it (Transport.save is not called)
collection.add(newTodo)

//save the model (this will not add the model a second time, it will just save it via Transport.save)
await collection.save(newTodo)
```

And that is the gist of it. It's important to note that both the `collection` and the `model` have properties that are **reactive** (via Mobx) so you can use them directly in your React components, and the components will be rendered when the data is changed. All standard Mobx rules apply.
Some of the react properties are

```ts
model.isSaving // true - if the model is in the process of saving
model.isSyncing //true - if model is saving or deleting

collection.isSyncing // true - the collection has models that are currently saving or deleting

collection.saving // [model] - returns all the models that are currently in the process of saving

collection.syncing //[model] - returns all the models that are currently deleting or saving

model.isDirty // when model data differs from the last saved data
```

All these properties are documented at the [Model properties](#properties) and [Collection properties](#properties) sections of the readme.

## Model

Model is generally used to carry data, although there is no reason not to carry its own logic in form of custom methods.

The two most important pieces of the Model class are the `serialize` method and the `indentityKey` static property.

`serialize` method is used to determine what properties of the object will be used by the transport for saving the object and for determining if the model `isDirty`(has changed properties). This method **must** be implemented by every class that extends the `Model` class.

collection. `Identity key` should be heavily used by the `transport` layer, for persisting the models.

`indentityKey` is a static property that holds the `name` of the property that will be **unique** for every model. This unique property is used by the collection to check if the model with the same value is already present, remember `Collection` can only have models with unique values for `identityKey`.

`Transport` layer can also use this key to persist data. In case you have some kind of transport that adheres to REST principles the transport can then construct API endpoints by utilizing the `identityKey`.
For example:

```sh
POST /todos/${todo.identity}
DELETE /todos/${todo.identity}
```

> Check out the [Fetch transport recepie](#fetch-transport)

In the next example, `Book` model has the `isbn` property set as the `indentityKey`

```ts
class Book extends Model {
  static indentityKey = 'isbn'

  constructor(public isbn: string) {}
}

const book = new Book('123')

collection.add(book)
collection.getByIdentity(book.isbn) // book

book.getIdentityKey() // isbn
book.identity // 123
```

### Properties

All model _getter_ properties are reactive (via Mobx). And they reflect the state of the model.

- `isSaving`: true when the model is in the process of saving.
- `isDeleting`: true when the model is in the process of deleting.
- `isSyncing`: true if the model is either saving or deleting.
- `isDeleted`: if the model is deleted by transport.
- `isDestroyed`: true if the model `destroy` method has been called.
- `identity`: model identity value.
- `indentityKey`: model identity key.
- `cid`: model client identity (used internally by collection).
- `payload`: data that is returned by the `serialize` method. The transport layer should use this property to save the model.
- `isDirty`: true when the current model data is different than the last model data that has been saved.
- `saveError`: error when the `Transport.save` method fails to save the model.
- `deleteError`: error `Transport.delete` method fails to delete the model.
- `hasErrors`: true if either `saveError` or `deleteError` is truthy.
- `lastSavedData`: last successfully saved data.

### Methods

- `setIdentity(newValue:string)`: set new identity value (`indentityKey` value will be changed)
- `setIsNew(isNew:boolean)`: Set `isNew` property on the model. This method should generally not be used by the client code. The transport layer can check this property to determine if it should use `POST` or `PATCH` methods for persistence
- `getCollection` - returns the `Collection` that the model is part of. This could be **undefined** if the model is created but not yet added to the collection.
- `destroy()`: stops model internal processes. This method should be used when you want to completely remove the model from the app and release the memory used by the model.

### Callbacks

The model supports various callbacks in the form of methods on a class. It's important to note that you **should not call** `super[method name]` on any of the callbacks. They are all fire and forget.

```ts
import type {
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  ModelSaveErrorCallback,
  ModelSaveStartCallback,
  ModelSaveSuccessCallback
} from '@fuerte/core'

import { TodoCollection } from './TodoCollection'
import { TodoTransport } from './TodoTransport'

export class TodoModel extends Model<TodoCollection> {
  // called when the model is added to the collection.
  override onAdded(collection: TodoCollection): void {}

  // called when the model is removed from the collection
  override onRemoved(collection: TodoCollection): void {}

  // called when model is about to be saved by the collection
  override onSaveStart(data: ModelSaveStartCallback<TodoTransport>): void {}

  //called when model is successfully saved by the collection
  override onSaveSuccess(data: ModelSaveSuccessCallback<TodoTransport>): void {}

  //called when collection has failed to save the model
  override onSaveError(
    data: ModelSaveErrorCallback<TodoModel, TodoTransport>
  ): void {}

  // called when collection is about to delete the model
  override onDeleteStart(data: ModelDeleteStartCallback<TodoTransport>): void {}

  // called when collection has successfully deleted the model
  override onDeleteSuccess(
    data: ModelDeleteSuccessCallback<TodoTransport>
  ): void {}

  // called when collecton has failed to delete the model
  override onDeleteError(data: ModelDeleteErrorCallback<TodoTransport>): void {}

  // called when the model is destroyed. `Model.destroy() method has been called
  override onDestroy(): void {}
}
```

For more info check out the [Model API docs](./packages/core/docs/api/classes/Model.md)

## Collection

Collection class as the name suggests is used for collecting (manipulating) the models and acting as an aggregation root for the models. It has methods like `add`, `remove`, `save` etc...

Business logic that concerns the models in the collection should generally be set on the collection. You can think of the collection as the [Mobx store](https://mobx.js.org/defining-data-stores.html#defining-data-stores).

The collection constructor has three dependencies.

- factory: used for creating the models
- transport: used for persisting the models
- configuration: an optional configuration that determines the default behavior for the collection

```ts
import { Collection } from '@fuerte/core'

import { todoFactory } from './todoFactory'
import { TodoModel } from './TodoModel'
import { TodoTransport } from './TodoTransport'

export class TodoCollection extends Collection<
  TodoModel,
  typeof todoFactory,
  TodoTransport
> {}

const todoCollection = new TodoCollection(todoFactory, new TodoTransport())

//create uses the factory function internally
const newTodo = todoCollection.create({ task: 'Buy milk' })

//save uses the transport  class internally
todoCollection.save(newTodo)
```

### Collection concepts

There are a few key concepts for working with the `Collection`.

#### Data loading

When you first start your app, the collection will probably be empty. You need a way to immediately populate the collection when the app starts. You can use the `Collection.load` method for that.

When you call the `Collection.load` method, under the hood it will call the `Transport.load` method.

`Transport.load` method should return **raw** model data (that will be directly passed to the `modelFactory` function), then that data is iterated over and passed to the `modelFactory` function, which in turn creates `Model` instances.

`Collection.load` method also returns a Promise that resolves to all of the models that were created and added.

```ts
const todoCollection = new TodoCollection(todoFactory, new TodoTransport())

const result = await todoCollection.load()
//result.added - new models
```

In the case of calling `load` multiple times and loading the same model data (models with the same value for the `indentityKey` property), there will be an issue when the model with the same value is already present in the collection and you will need to decide what to do with that model when that happens, you can _keep the old_ model, _keep the new_ model, or _keep both_.

```ts
import { DuplicateModelStrategy, ModelCompareResult } from '@fuerte/core'

collection.load({
  //keep the new models
  duplicateModelStrategy: DuplicateModelStrategy.KEEP_NEW
})

collection.load({
  //keep the model that is already present in the collection
  duplicateModelStrategy: DuplicateModelStrategy.KEEP_OLD
})

collection.load({
  // compare new and old model and then decide
  duplicateModelStrategy: DuplicateModelStrategy.COMPARE,
  compareFn: (newModel: TodoModel, oldModel: TodoModel) => {
    //here you have access to the new and old models

    // keep the new model
    return ModelCompareResult.KEEP_NEW

    // keep the old model
    return ModelCompareResult.KEEP_OLD

    // keep both models!
    return ModelCompareResult.KEEP_BOTH
  }
})
```

In the case of the `ModelCompareResult.KEEP_BOTH` you need to make sure to change the identity of one of the models, otherwise `Collection.load` will throw an error. As mentioned earlier, there can't be two models in the collection with the same value for `identity` property.

There is also an option to empty the collection (reset) before adding new models. After the `load` method completes, only newly loaded models will be present in the collection.

```ts
const result = todoCollection.load({ reset: true })
```

#### Reset

Any time in the lifecycle of the app you can empty the collection (reset) and optionally add new models by providing data for the factory.

```ts
//empty the collection
collection.reset()

//empty the collection and add new models
collection.reset([{ task: 'Buy crypto' }, { task: 'by cinema tickets' }])
```

### Callbacks

There are various callbacks in form of methods on a class. It it's important to note that you **should not call** `super[method name]` on any of the callbacks. They are all fire and forget.

```ts
import {
  DeleteErrorCallback,
  DeleteStartCallback,
  DeleteSuccessCallback,
  FactoryData,
  LoadErrorCallback,
  LoadStartCallback,
  LoadSuccessCallback,
  SaveErrorCallback,
  SaveStartCallback,
  SaveSuccessCallback
  Collection
} from '@fuerte/core'
import { todoFactory } from './todoFactory'
import { TodoModel } from './TodoModel'
import { TodoTransport } from './TodoTransport'

export class TestCollection extends Collection<
  TodoModel,
  typeof todoFactory,
  TodoTransport
> {

  //called when collecton is reset
  override onReset(
    added: TodoModel[],
    removed: TodoModel[],
    fromLoad = false
  ): void {}

  //called when the model is removed from the collection
  override onRemoved(model: TodoModel): void {}

  //called when the model is added to the collection
  override onAdded(model: TodoModel): void {}

  //called when model save process is about to start
  override onSaveStart(
    data: SaveStartCallback<TodoModel, TodoTransport>
  ): void {}

  //called when the model is saved successfully
  override onSaveSuccess(
    data: SaveSuccessCallback<TodoModel, TodoTransport>
  ): void {}

  //called when model save process fails
  override onSaveError(
    data: SaveErrorCallback<TodoModel, TodoTransport>
  ): void {}

  //called when model delete process starts
  override onDeleteStart(
    data: DeleteStartCallback<TodoModel, TodoTransport>
  ): void {}

  //called when model delete process completes successfully
  override onDeleteSuccess(
    data: DeleteSuccessCallback<TodoModel, TodoTransport>
  ): void {}

  //called when model delete process fails
  override onDeleteError(
    data: DeleteErrorCallback<TodoModel, TodoTransport>
  ): void {}

  //called when collection load process starts
  override onLoadStart(
    data: LoadStartCallback<TodoModel, TodoTransport>
  ): void {}

  //called when collection load process completes successfully
  override onLoadSuccess(
    data: LoadSuccessCallback<TodoModel, TodoTransport>
  ): void {}

  //called when collection load process fails
  override onLoadError(
    data: LoadErrorCallback<TodoModel, TodoTransport>
  ): void {}

  /**
   * called when `Collection.serialize` method executes
   * If you want to add additional data to the serialization, return the data from the callback, and it will be
   * added to the serialized object.
   */
  override onSerialize():Record<string, any> | void {}

  //called when collection `destroy` method is called
  override onDestroy():void {}

  /**
   * Callback for when the collection is about to create a new model.
   * This callback fires only on `Collection.reset` and `Collection.load` methods.
   * It will not fire when the model is created via `Collection.create`
   * Here, you can return modified data for model creation.
   * If `undefined` is returned model creation will be skipped
   */
  protected override onModelCreateData(
    data: FactoryData<typeof todoFactory>
  ): void | {
    foo?: string | undefined
    bar?: string | undefined
    id?: string | undefined
  } {}
}
```

For more info check out the [Collection API docs](./packages/core/docs/api/classes/Collection.md)

## Autosave Collection

Autosave collection inherits from the `Collection`. Its main differentiator is that it can automatically save the model whenever the `model payload` changes.

```ts
import { AutosaveCollection } from '@fuerte/core'
import { todoFactory } from './todoFactory'
import { TodoModel } from './TodoModel'
import { TodoTransport } from './TodoTransport'

const collection = new AutosaveCollection(todoFactory, new TodoTransport(), {
  autoSave: {
    enabled: true //immediately enable autosave
  }
})

const model = collection.add(collection.create({ task: 'buy milk' }))

model.setTask('Buy orange juice') // autosave triggers automatically
```

You can enable or disable autosave only for certain models or for all of the collection at once.

```ts
collection.startAutosave(modelOne)
collection.startAutosave([modelTwo, modelThree])
collection.startAutosave() //start for all the models in the collection

collection.stopAutosave(modelOne)
collection.stopAutosave([modelTwo, modelThree])
collection.stopAutosave() //start for all the models in the collection
```

### Callbacks

- In addition to all the [callbacks](#callbacks-1) of the `Collection` class, `AutosaveCollection` has it's own callbacks.

```ts
import { AutosaveCollection } from '@fuerte/core'
import { testModelFactory } from './TodoFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TodoAutosaveCollection extends AutosaveCollection<
  TestModel,
  typeof testModelFactory,
  TestTransport
> {
  /**
   * Callback for when {@link AutosaveCollection.stopAutoSave} method has been executed.
   * @param models - the array of models for which the auto-save process has been stopped.
   */
  onStartAutoSave(models: TestModel[]): void {}

  /**
   * Callback for when {@link AutosaveCollection.startAutoSave} method is executed.
   * @param models - the array of models for which the auto-save process has been started
   */
  onStopAutoSave(models: TestModel[]): void {}
}
```

## Transport

There is no `Transport` class in `@fuerte/core` there is only an `Interface` that classes that want to act as `transport` layer need to implement. The current transport interface consists of these methods:

```ts
export interface Transport<TModel extends Model = Model, TDTO = any> {
  /**
   * Loads the model data. This method should just return the data that the factory requires to construct
   * the models.
   * @param config - transport config
   * @returns array of model data for model construction
   */
  load(config?: any): Promise<{ data: TDTO[] }>

  /**
   * Saves the model
   * @param model - model to save
   * @param config - save the configuration
   * @returns Object with optional "data" property to pass back to collection
   */
  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  /**
   * Deletes the model
   * @param model - model to delete
   * @param config - delete configuration
   * @returns Object with optional "data" property to pass back to collection
   */
  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}
```

This simplest transport, which saves the data **in-memory** could look like this:

```ts
import type { Transport } from '@fuerte/core'

//sample data
const firstTodo = { id: 1, task: 'Remember the milk' }
const secondTodo = { id: 2, task: 'Return books to library' }

//simple in memory storage
const storage: Map<string, ModelDTO> = new Map()

//populate the storage
storage.set(firstTodo.id, firstTodo)
storage.set(secondTodo.id, secondTodo)

export class MemoryTransport implements Transport {
  load(): Promise<{ data: ModelDTO[] }> {
    // return everything from the storage (load the collection)
    return Promise.resolve({ data: [...storage.values()] })
  }

  save(model: Todo) {
    storage.set(model.id, model.payload)
  }

  delete(model: Todo) {
    storage.delete(model.id)
  }
}
```

Head over to the recipes section to see more examples of [`Transport` implementations](#fetch-transport).

## Recipes

### Use composition instead of inheritance

Sometimes you don't want to expose all the methods of the `Collection` to the client code. Or do you want to have
method names that better reflect your business logic, so instead of using `Collection.add` and `Collection.create` you would like to have `MyTodoStore.addTodo()`.

[Composition](https://en.wikipedia.org/wiki/Composition_over_inheritance) is a perfect candidate for something like this.

In the next example, we are going to create a class that instead of inheriting from the `Collection` will use the `Collection` as its _protected_ property.

```ts
import { todoFactory } from './TodoFactory'
import { TodoModel } from './TodoModel'
import { TodoTransport } from './TodoTransport'
import { FactoryData, Collection } from '@fuerte/core'

export class MyTodoStore {
  protected collection = new Collection(todoFactory, new TodoTransport())

  addTodo(data: FactoryData<typeof todoFactory>): TodoModel {
    const todo = this.collection.create(data)

    this.collection.add(todo)

    return todo
  }

  get todos() {
    return this.collection.models
  }
}
```

Bonus:
If you are into Dependency injection (and you should be), then you can modify the previous example so that the `MyTodoStore` class
accepts already created collections.

```ts
import { todoFactory } from './TodoFactory'
import { TodoModel } from './TodoModel'
import { TodoTransport } from './TodoTransport'
import { FactoryData, Collection, Transport } from '@fuerte/core'

type TodoFactory = typeof todoFactory

export class MyTodoStore {
  constructor(
    protected collection: Collection<TodoModel, TodoFactory, Transport>
  ) {}
}
```

### Restufl transport

This transport recipe uses `fetch` to communicate with the restful API.

```ts
import type { Transport } from '@fuerte/core'

export class FetchTransport implements Transport {
  async load(data?: { page?: string }): Promise<{ data: ModelDTO[] }> {
    //maybe we have pagination enabled, check to see if we are using pagination
    const query = data?.page ? `?query=${data.page}` : ''

    const response = await fetch(`/some/api/todos${query}`)

    const data = await response.json()

    return data
  }

  async save(model: Todo) {
    // if the model is new use POST otherwise use PUT
    const method = model.isNew ? 'POST' : 'PUT'

    const response = await fetch(`/some/api/todos/${model.identity}`, {
      method,
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(model)
    })
  }

  async delete(model: Todo) {
    const response = await fetch(`/some/api/todos/${model.identity}`, {
      method: 'DELETE'
    })
  }
}
```
