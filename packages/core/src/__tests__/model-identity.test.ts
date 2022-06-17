import { configure } from 'mobx'
import { fixtureFactory } from './__fixtures__/fixtureFactory'
import { TestModel } from './__fixtures__/TestModel'
import { IdentityError } from '../model/identity-error'

configure({ enforceActions: 'always', reactionRequiresObservable: true })

const fixtures = fixtureFactory()

beforeEach(() => {
  expect.hasAssertions()
})
describe('Model - identity #identity #model', () => {
  test('Set model identity key', () => {
    const identityKey = 'isbn'
    class Test extends TestModel {
      static identityKey = identityKey
    }

    const model = new Test()

    expect(model.identityKey).toBe(identityKey)
  })

  test('Set identity value for the model', () => {
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const newValue = '123'

    model.setIdentity(newValue)

    expect(model.identity).toBe(newValue)
    expect(modelTwo.identity).not.toBe(newValue)
  })

  test('Extract identity value from a successful response', async () => {
    const original = TestModel.setIdentityFromResponse
    TestModel.setIdentityFromResponse = true
    const newId = '123'
    const transport = fixtures.transport()
    jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })
    const collection = fixtures.collection(undefined, transport)
    const model = fixtures.model()
    collection.add(model)

    await collection.save(model)

    expect(model.identity).toBe(newId)

    // I know, static props are bad for unit testing
    TestModel.setIdentityFromResponse = original
  })

  test('If not set in the configuration, do not try to extract identity value from the response', async () => {
    const newId = '123'
    class Test extends TestModel {
      static identityKey = 'id'

      static setIdentityFromResponse = false
    }
    const model = new Test()
    const transport = fixtures.transport()
    jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })
    const collection = fixtures.collection(undefined, transport)
    jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })
    const oldIdentityValue = model.identity

    await collection.save(model)

    expect(model.identity).toBe(oldIdentityValue)
    expect(model.identity).not.toBe(newId)
  })

  test("If identity value can't be extracted from the response, throw error", async () => {
    const original = TestModel.setIdentityFromResponse
    TestModel.setIdentityFromResponse = true
    const newId = '123'
    const model = fixtures.model()
    const transport = fixtures.transport()
    // @ts-expect-error - type mismatch on purpose
    jest.spyOn(transport, 'save').mockResolvedValue({ wrongKey: newId })
    const collection = fixtures.collection(undefined, transport)

    const { error } = await collection.save(model)

    expect(error).toBeInstanceOf(IdentityError)
    expect((error as Error).message).toMatch(/Can't set identity/i)

    // I know, static props are bad for unit testing
    TestModel.setIdentityFromResponse = original
  })
})