import path from 'path'

import { compile } from '../src/compiler'
import { readTsConfig } from '../src/utils/readTsconfig'

describe('react class component', () => {
  const testFile = path.resolve(__dirname, 'test-react.jsx')
  const dir = path.resolve(__dirname)
  const options = readTsConfig(dir)
  const result = compile(testFile, options)

  it('should remove import PropTypes', () => {
    expect(result.includes(`import PropTypes from 'prop-types'`)).toBeFalsy()
  })

  it('should remove static PropTypes', () => {
    expect(result.includes('static propTypes')).toBeFalsy()
  })

  it('PropTypes.object should be object', () => {
    expect(result.includes('obj?: object')).toBeTruthy()
  })
  it('PropTypes.bool should be boolean', () => {
    expect(result.includes('isBool?: boolean')).toBeTruthy()
  })
  it('PropTypes.string should be string', () => {
    expect(result.includes('str?: string')).toBeTruthy()
  })
  it('PropTypes.array should be any[]', () => {
    expect(result.includes('arr?: any[]')).toBeTruthy()
  })
  it('PropTypes.oneOfType should be any', () => {
    expect(result.includes('oneOfType?: any')).toBeTruthy()
  })
  it('PropTypes.oneOf should be `a | b`', () => {
    expect(result.includes("oneOf?: 'a' | 'b' | 'c' | 'd';")).toBeTruthy()
  })
  it('PropTypes.node should be React.ReactNode', () => {
    expect(result.includes('node?: React.ReactNode')).toBeTruthy()
  })
  it('PropTypes.func should be (...args: any[]) => any', () => {
    expect(result.includes('func?: (...args: any[]) => any')).toBeTruthy()
  })
  it('PropTypes.required should not have ?', () => {
    expect(result.includes('required: (...args: any[]) => any')).toBeTruthy()
  })

  it('should generate IProps', () => {
    expect(result.includes('interface ITestProps')).toBeTruthy()
  })

  it('should generate IState', () => {
    expect(result.includes('interface ITestState')).toBeTruthy()
  })

  it('should remove constructor', () => {
    expect(result.includes('constructor')).toBeFalsy()
  })

  it('should have generate mapStateToProps', () => {
    expect(result.includes('const mapStateToProps')).toBeTruthy()
  })

  it('should have generate mapDispatchToProps', () => {
    expect(result.includes('const mapDispatchToProps')).toBeTruthy()
  })

  it('should have transform decorator to hoc', () => {
    expect(result.includes(`export default connect(`)).toBeTruthy()
    expect(result.includes(`mapStateToProps,`)).toBeTruthy()
    expect(result.includes(`mapDispatchToProps`)).toBeTruthy()
    expect(
      result.includes(`)(Format.inject(errorBoundary()(Test)))`)
    ).toBeTruthy()
  })

  it('should generate generic Props and State to Class Component', () => {
    expect(result.includes(`class Test extends Component<`)).toBeTruthy()
    expect(result.includes(`ITestProps &`)).toBeTruthy()
    expect(result.includes(`ReturnType<typeof mapStateToProps> &`)).toBeTruthy()
    expect(
      result.includes(`ReturnType<typeof mapDispatchToProps>,`)
    ).toBeTruthy()
    expect(result.includes(`ITestState`)).toBeTruthy()
    expect(result.includes(`>`)).toBeTruthy()
  })

  it('should move constructor this. to class member', () => {
    expect(result.includes(`aaa = '111'`)).toBeTruthy()
  })
})
