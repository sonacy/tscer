import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { CompilerOptions, JsxEmit, ModuleKind, ScriptTarget } from 'typescript'

export const readTsConfig = (dir: string) => {
  let compileOptions: CompilerOptions = {
    target: ScriptTarget.ES2017,
    module: ModuleKind.ES2015,
    allowJs: true,
    jsx: JsxEmit.Preserve,
  }

  // find dir has tsconfig
  if (fs.existsSync(path.resolve(dir, 'tsconfig.json'))) {
    try {
      const json = fs.readJSONSync(path.resolve(dir, 'tsconfig.json'), {
        encoding: 'utf8',
      })
      compileOptions = Object.assign(json.compilerOptions, compileOptions)
      if (compileOptions.moduleResolution) {
        delete compileOptions.moduleResolution
      }
      if (compileOptions.traceResolution) {
        delete compileOptions.traceResolution
      }
    } catch (e) {
      console.error(
        chalk.redBright(
          'parse tsconfig.json fail, probably because you have comments in json file, or trailing comma is not none, that is illegal to json standard parser!'
        )
      )
    }
  }

  return compileOptions
}
