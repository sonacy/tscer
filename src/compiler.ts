import fs from 'fs-extra'
import path from 'path'
import prettier from 'prettier'
import { generateGenericPropAndState } from "transform/generateGenericPropAndState"
import { removeImportPropTypes } from "transform/removeImportPropTypes"
import { removeStaticPropTypes } from "transform/removeStaticPropTypes"
import { CompilerOptions, createPrinter, createProgram, EmitHint, transform } from "typescript"

export const run = (filename: string, dir: string, compileOptions: CompilerOptions) => {
  const realPath = path.resolve(dir, filename)
  
  const program = createProgram([realPath], compileOptions)

  const sourceFiles = program.getSourceFiles().filter(s => s.fileName === realPath)
  
  const typeChecker = program.getTypeChecker()

  const result = transform(sourceFiles, [generateGenericPropAndState(typeChecker),removeImportPropTypes(), removeStaticPropTypes(typeChecker)])
  
  const printer = createPrinter()
  const printed = printer.printNode(EmitHint.SourceFile, result.transformed[0], sourceFiles[0])
  
  const res = prettier.format(printed, {
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    parser: "typescript"
  })
  const name = realPath.slice(0, realPath.lastIndexOf('.'))
  fs.removeSync(realPath)
  fs.outputFileSync(`${name}.tsx`, res, {
    encoding: 'utf8'
  })
}