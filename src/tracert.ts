import glob from 'glob'
import { CompilerOptions, createProgram } from 'typescript'

export const tracert = (
  filePath: string,
  dir: string,
  compileOptions: CompilerOptions
) => {
  const files = glob.sync('**/*.[j|t]s*', {
    cwd: dir,
    ignore: 'node_modules',
  })

  const program = createProgram([filePath], compileOptions)

  const importFiles = program
    .getSourceFiles()
    .filter(s => s.fileName.indexOf('node_modules') < 0)
    .map(s => s.fileName)

  const unUsedFiles = files.filter(
    f => importFiles.findIndex(s => s.indexOf(f) > -1) < 0
  )

  console.log(unUsedFiles)
}
