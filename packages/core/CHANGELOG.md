# @fuerte/core

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
