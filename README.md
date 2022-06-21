# Fuerte

Mobx powered library inspired by Backbone.js and Ember.js

<!-- toc -->

## Motivation

It started as a experiment in using domain driven design and separtion of concerns in the frontend.
The idea was to separate the Model, Repository and Persistence in three distinct parts.

- Model should be an object that mostly just carries data
- Repository should implement busines logic, and act as aggreation root for the Model
- Persistence should only be concerned with persisting data.

After some trial and error, I've ended up with a library that imho satisfies these concerns.

Mobx is used for the reactivity so we don't concern ourselfs with integrating the library with different frontend frameworks

## Installation

```sh
nmp i @fuerte/core
```

## Usage

For a base example we are going to setup a simple TODO app.

First we need a model. In this example the model will be very simple. It will just have an `id` and a `task` properties. We also need a `serialize` method, which will be used to serialize the model to storage, and track if the model is _dirty_.

```ts
import {Model} from '@fuerte/core`

class Todo extends Model{

  constructor(public task:string,public id?:number) {
    super()
    makeObservable(this, {
      task: observable,
    })
  }

  serialize(){
	return {
		id:this.id,
		task:this.task
	}
  }

  setTask(task:string){
	this.task = task
  }
}
```

Next we create a model factory. This is a simple function that just accepts some data, and creates a new Model instance. In the example I've also created a `ModelDTO` type to help us with Typescript typings.

```ts
import type { FactoryFn } from '@fuerte/core'

export type ModelDTO = { task: string; id?: number }

const modelFactory: Factory = (data: ModelDTO) => {
  // note model factory can also return a Promise<Todo>
  return new Todo(data.task, data.id ?? Math.random())
}
```

Next we create the transport layer. Transport layer is used for transporting (persisting) the data. Usually transport layer will use `fetch` `localStorage` or `IndexedDB`.In this simple example we are going to save the data _in memory_.

Transport class needs to implement `Transport` interface, which requires three methods:

- load: loads the data from somewhere, this is usually used when the app first starts. This method **does not create the model instances**, it just returns the raw data that will later be used by the factory (internally) to construct the models.
- save: save the model, or optionally update
- delete: delete the model

```ts
import type { Transport } from '@fuerte/core'

//sample data
const firstTodo = { id: 1, task: 'Remember the milk' }
const secondTodo = { id: 2, task: 'buy dog food' }

//simple in memory storage
const storage: Map<string, ModelDTO> = new Map()

//populate the storage
storage.set(firstTodo.id, firstTodo)
storage.set(secondTodo.id, secondTodo)

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

One final missing piece and also the most important one is the `Collection`.
Busines logic should generally be set on the collection. You can think of collection as the Mobx store.

Collection needs both the `factory` and the `transport`.

```ts
import { Collection } from '@fuerte/core'
//import ,factory, transport

class TodoCollection extends Collection<
  Todo,
  typeof modelFactory,
  MemoryTransport
> {}

// create collection instance
const collection = new TodoCollection(modelFactory, MemoryTransport)

//load all the models
const loadResult = collection.load() // promise

collection.loadStatus // 'PENDING'

await loadResult

collection.loadResult // 'RESOLVED'

//get first task from the collection
const todoOne = collection.models[0]
todoOne.task // 'remember the milk'

todoOne.isDirty // false

todoOne.setTask('buy yoghurt instead')
todoOne.isDirty //true

//save todo back to storage
const result = collection.save(todoOne) //promise

todoOne.isSyncing //true
todoOne.isSaving // true

collection.isSyncing //true

collection.saving // [todoOne] - all models that are currently in the process of saving

collection.syncing //[todoOne] - all models that are currently deleting,updating or saving

await result

//create new todo
const newTodo = collection.create({ id: '3', task: 'buy cat food' })
newTodo.isNew //true
newTodo.isDirty // false

await collection.save(newTodo)

newTodo.isNew //false
newTodo.isSaving //false
newTodo.isSyncing //false
```

And that is the gist of it. It's important to note that all these properties are **reactive** (via Mobx) so you can use them directly in your React components, and the components will be rendered when the data is changed. All standard Mobx rules apply.

There is a lot that can be done with the `Collection` and the `Model`, like **autosave** feature etc..

## Model

Model is generally used to carry data, althoug there is no reason not to cary it's own logic in form of custom methods.

Two most important pieces of the Model class are the `serialize` method and `indentityKey` static property.

`serialize` method is used to deterimine what properties of the object will be used by the transport for saving the object and those same properties will be used to determine if the the model `isDirty`.
AutosSave functionality also dependeds on the serialize method. This method **must** be implemented by every class that extends the `Model` class.

`indentityKey` By default, there is a _private_ model property `cid` (client id) that is used for tracking the uniques of the model inside the collection. However you can set your own property, you can retrieve the model from the collection by the model `indentityKey` (`collection.getById()`)

For example `Book` model will have `isbn` property set as unique key.

```ts
class Book extends Model {
  static indentityKey = 'isbn'

  constructor(public isbn: string) {}
}
const book = new Book('123')
collection.add(book)
collection.getById(book.isbn)

book.getIdentityKey() // isbn
book.identity // 123
```

Various transports can also use this key to in to persist data. In case you have a somekind of transport that adheres to REST principles. That transport can then construct API endpoints by utilizeing the `indentityKey`

```sh
GET /localhost/books/{model.identity}
```

### Properties

All model _getter_ properties are reactive (via Mobx). And they reflect the state of the model.

- `isSaving`: true when the model is in the process of saving.
- `isDeleting`: true when the model is in the process of deleting.
- `isSyncing`: true if model is either saving or deleting
- `isDeleted`: if model is deleted by transport
- `isDestroyed`: true if the model `destroy` method has been called
- `identity`: model identity value
- `indentityKey`: model identity key
- `cid`: model client identity (used internally by collection)
- `payload`: data that is returned by the `serialize` method. Transport layer should use this data for saving the model. This data is always fresh.
- `isDirty`: true when current model data is different than the last model data that has been saved.
- `saveError`: error that has been returned by the unsuccessfully `Transport.save` method
- `deleteError`: error that has been returned by the unsuccessfully `Transport.delete` method
- `hasErrors`: true if either `saveError` or `deleteError` is truthy

- lastSavedData`: This is the data that transport layer used for saving the model.

### Methods

Model has very few methods.

- `setIdentity(newValue:string)`: set new identity value (indentityKey value will be changed)
- `setIsNew(isNew:boolean)`: Set `isNew` property on the model. This method should generally not be used by the client code. Transport layer can check this property in order to determine if it should use `POST` or `PATCH` methods for persistence

- `destroy()`: stops model internal processes this should be used when you want to completely remove the model from the app and relase the memory used by the model.

### Callbacks

Model supports various callbacks in a form of methods on a class

- `onSaveStart` called when model is about to be saved by the transport.
- `onSaveSuccess` called when models is successfully saved by the transport.
- `onSaveError` - called when transport has failed to save the model.

- `onDeleteStart` - called when transport is about to delete the model from persistence.
- `onDeleteStart` - called when transport has successfully deleted the model
- `onDeleteError` - called when transport has failed to delete the model.

## Recepies

- fetch transport
