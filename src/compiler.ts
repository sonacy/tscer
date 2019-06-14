import fs from 'fs-extra'
import path from 'path'
import prettier from 'prettier'
import { CompilerOptions, createPrinter, createProgram, EmitHint, transform } from 'typescript'

import { rcDecoratorToHoc } from './transform/decoratorToHoc'
import { generateGenericPropAndState } from './transform/generateGenericPropAndState'
import { parseTsFunc } from './transform/parseTsFunc'
import { removeImportPropTypes } from './transform/removeImportPropTypes'
import { removeStaticPropTypes } from './transform/removeStaticPropTypes'

export const compile = (realPath: string, compileOptions: CompilerOptions) => {
  const program = createProgram([realPath], compileOptions)

  const sourceFiles = program
    .getSourceFiles()
    .filter(s => s.fileName === realPath)

  const typeChecker = program.getTypeChecker()

  const result = transform(sourceFiles, [
    generateGenericPropAndState(typeChecker),
    rcDecoratorToHoc(typeChecker),
    removeImportPropTypes(),
    removeStaticPropTypes(typeChecker),
    parseTsFunc(typeChecker),
  ])

  const printer = createPrinter()
  const printed = printer.printNode(
    EmitHint.SourceFile,
    result.transformed[0],
    sourceFiles[0]
  )

  const res = prettier.format(printed, {
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    parser: 'typescript',
  })
  return res
}

export const run = (
  filename: string,
  dir: string,
  compileOptions: CompilerOptions
) => {
  const realPath = path.resolve(dir, filename)

  const res = compile(realPath, compileOptions)

  const name = realPath.slice(0, realPath.lastIndexOf('.'))
  const ext = path.extname(realPath).replace('j', 't')
  // create a dir .tscer, mv orgin file into this dir

  fs.moveSync(realPath, path.join(dir, './.tscer', filename))
  fs.outputFileSync(`${name}${ext}`, res, {
    encoding: 'utf8',
  })
}
