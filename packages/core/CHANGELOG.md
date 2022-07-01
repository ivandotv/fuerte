# @fuerte/core

## 5.0.0

### Major Changes

- ebee7da: refactor exported Typescript types
  refactor `AutosaveCollectionConfig`
- 8a3bf02: If the model is added in to the collection when it is initialized, assign `collection` property to the model.
- 368b8d3: Remove "set identity from response" functionality.

  There is too much magic going on with that.

- dcdacd1: Remove `Collection.loadStatus` and implement `Collection.loading` which is a simple boolean flag property.
- 464fa7d: Rename `Collection.getById` to `getByIdentity'

### Minor Changes

- 9885620: Implement model save and delete methods.

  Model now has a reference to the collection. Collection can be
  retrieved via `model.getCollection()`

- 515ec40: Add `onRemoved` and `onAdded` callbacks to the `Model` class.
- aeaa369: Implement `toJSON` method for the model.
  Internally this method return `model.payload`

## 4.1.0

### Minor Changes

- db8c5b7: move autosave package in to the core

## 4.0.1

### Patch Changes

- ccd88ec: add comments to Model class
- ccd88ec: add comments to collection class and move methods around

## 4.0.0

### Major Changes

- 7d32e25: Update package dependencies, and make all packages of type `module`.

## 3.0.0

### Major Changes

- 6c3a1be: remove lite collection

  lite collection has been merged to the regular collection and model has no reference to the collection anymore.

## 2.0.3

### Patch Changes

- 654507b: fix: initialize model immediately after the creation

## 2.0.2

### Patch Changes

- da5f43f: switch all build tasks to use microbundle.
  Fix eslint errors.

## 2.0.1

### Patch Changes

- 54fcdd0: Remove "instanceOf" check and replace it with "isPrototypeOf". The reason for this
  is because "instanceOf" does not work in IE11.

## 2.0.0

### Major Changes

- 2db05a7: Splict Collection class in two

### Patch Changes

- 66d03e1: core: make model payload getter have full type support
- 082abd6: core: Warn when model is added to a different collection.

## 1.1.0

### Minor Changes

- 550add8: Collection child classes can override transport calls.

## 1.0.1

### Patch Changes

- add licence field

## 1.0.0

### Major Changes

- 362e67a: Initial release
