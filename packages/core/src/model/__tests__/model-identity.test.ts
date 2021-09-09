import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'
import { IdentityError } from '../identity-error'

configure({ enforceActions: 'always', reactionRequiresObservable: true })

const fixtures = fixtureFactory()

beforeEach(() => {
  expect.hasAssertions()
})
describe('Model identity', () => {
  test('Set model class identity key', () => {
    const identityKey = 'isbn'
    class Test extends TestModel {
      static identityKey = identityKey
    }

    const model = new Test()

    expect(model.identityKey).toBe(identityKey)
  })

  test('Set identity key per model instance', () => {
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

    await model.save()

    // I know, static props are bad for unit testing
    TestModel.setIdentityFromResponse = original
    expect(model.identity).toBe(newId)
  })

  test('If not set in config, do not try to extract identity value from the response ', async () => {
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

    // I know, static props are bad for unit testing
    TestModel.setIdentityFromResponse = original

    expect(error).toBeInstanceOf(IdentityError)
    expect((error as Error).message).toMatch(/could not set identity/i)
  })
})
