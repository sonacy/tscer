import path from 'path'

import { compile } from '../src/compiler'
import { readTsConfig } from '../src/utils/readTsconfig'

describe('func', () => {
  const testFile = path.resolve(__dirname, 'test-func.js')
  const dir = path.resolve(__dirname)
  const options = readTsConfig(dir)
  const result = compile(testFile, options)

  it('should add types to params', () => {
    expect(result.includes('(a: any, b: any) => any'))
    expect(result.includes('a: any, // TODO:'))
    expect(result.includes('b: any, // TODO:'))
  })
})
