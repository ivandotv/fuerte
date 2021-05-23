import { Model } from '../model/Model'
import { Transport } from './transport'
import merge from 'deepmerge'
import { TestModel } from '../__fixtures__/TestModel'

export type FetchConfig = {
  loadRequest?: RequestConfig
  saveRequest?: RequestConfig
  reloadRequest?: RequestConfig
  deleteRequest?: RequestConfig
}

export type RequestConfig = {
  url?: string
  request?: RequestInit
  callback?: <T = any>(response: Response) => T
}

export class HttpTransport<TModel extends Model<any>>
  implements Transport<TModel>
{
  protected fetchRef: typeof fetch

  constructor(
    public url: string,
    public config?: FetchConfig,
    fetchRef?: typeof fetch
  ) {
    this.fetchRef = fetchRef ? fetchRef : window ? fetch.bind(window) : fetch
  }

  async save<T>(
    model: TModel,
    config?: RequestConfig
  ): Promise<{ data?: T; response: Response }> {
    const cfg = merge(
      this.config?.saveRequest || {},
      config?.request || {}
    ) as unknown as Required<RequestConfig>

    cfg.request.method = cfg.request.method
      ? cfg.request.method
      : model.isNew
      ? 'POST'
      : 'PUT'

    const result = this.handleFetch(
      cfg.url || this.url,
      cfg.request,
      cfg.callback
    )

    return result
  }

  load(config?: any): Promise<{ data: any[] }> {
    throw new Error('Method not implemented.')
  }

  reload(model: TModel, config?: any): Promise<{ data: any }> {
    throw new Error('Method not implemented.')
  }

  delete(model: TModel, config?: any): Promise<{ data?: any }> {
    throw new Error('Method not implemented.')
  }

  protected async handleFetch(
    url: string,
    request: RequestInit,
    cb: (response: Response) => any
  ) {
    const response = await this.fetchRef(url, request)
    let data
    if (cb) {
      data = await cb(response)
    } else {
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        //is JSON
        if (contentType && contentType.indexOf('application/json') !== -1) {
          data = await response.json()
        }
      } else {
        throw response
      }
    }

    return {
      data,
      response
    }
  }
}

const test = new HttpTransport('')

test.save<{ name: string }>(new TestModel()).then((result) => {
  result.data?.name
})
