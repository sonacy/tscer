import { run } from 'compiler'
import fs from 'fs-extra'
import glob from 'glob'
import path from 'path'
import ts from 'typescript'

// dir path that need to transform
const dir = path.resolve(__dirname, '../../teaToB')

const files = glob.sync("**/*.jsx", {
  cwd: dir,
  ignore: 'node_modules'
})
// const file = 'fe/src/RedirectRouter.jsx'

let compileOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2017,
  module: ts.ModuleKind.ES2015,
  allowJs: true,
  jsx: ts.JsxEmit.Preserve
}
  
// find dir has tsconfig
if (fs.existsSync(path.resolve(dir, 'tsconfig.json'))) {
  try {
    const json = fs.readJSONSync(path.resolve(dir, 'tsconfig.json'), {
      encoding: 'utf8'
    })
    compileOptions = Object.assign(json.compilerOptions, compileOptions)
    if (compileOptions.moduleResolution) {
      delete compileOptions.moduleResolution
    }
    if (compileOptions.traceResolution) {
      delete compileOptions.traceResolution
    }
  } catch(e) {
    console.error('parse tsconfig.json fail, probably because you have comments in json file, or trailing comma is not none, that is illegal to json standard parser!')   
  }
}

// try {
//   run(file, dir, compileOptions)
// } catch(e) {
//   console.log(e.message)
// }

files.forEach(f => {
  try {
    run(f, dir, compileOptions)
  } catch(e) {
    console.log(path.resolve(dir, f), e.message)
  }
})