export class IdentityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Identity Error'
  }
}
