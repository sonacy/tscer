import commander from 'commander'
import fs from 'fs-extra'
import glob from 'glob'
import path from 'path'

import { run } from './compiler'
import { tracert } from './tracert'
import { checkDirIsEmpty, error, replaceFile } from './utils/files'
import { readTsConfig } from './utils/readTsconfig'

const pkg = fs.readJSONSync(path.resolve(__dirname, '../package.json'))

const program = new commander.Command()

program
  .version(pkg.version)
  .option('-D --dir', 'specific a directory')
  .action(relativePath => {
    if (relativePath === undefined) {
      error('you need to specific a file or a dir!')
    } else {
      const absolutePath = path.resolve(process.cwd(), relativePath)
      if (!fs.existsSync(absolutePath)) {
        error(`${absolutePath} not exist!`)
        return
      }
      const stat = fs.statSync(absolutePath)
      const isDir = stat.isDirectory()

      if (program.dir) {
        if (!isDir) {
          error(`${absolutePath} is not a directory!`)
        } else {
          // dir
          const compileOptions = readTsConfig(absolutePath)
          // support for jsx and js
          const files = glob.sync('**/*.js*', {
            cwd: absolutePath,
            ignore: 'node_modules',
          })
          files.forEach(f => {
            try {
              run(f, absolutePath, compileOptions)
            } catch (e) {
              error(f)
              error(e.message)
            }
          })
        }
      } else {
        if (isDir) {
          error(`${absolutePath} is not a file!`)
        } else {
          // file
          const dir = path.dirname(absolutePath)
          const compileOptions = readTsConfig(dir)
          try {
            run(path.basename(absolutePath), dir, compileOptions)
          } catch (e) {
            error(absolutePath)
            error(e.message)
          }
        }
      }
    }
  })

program
  .command('revert [filepath]')
  .option('-D --dir', 'specific a directory')
  .action(filepath => {
    if (filepath === undefined) {
      error('you need to specific a file or a dir!')
      return
    }

    const absolutePath = path.resolve(process.cwd(), filepath)
    if (!fs.existsSync(absolutePath)) {
      error(`${absolutePath} not exist!`)
      return
    }
    const stat = fs.statSync(absolutePath)
    const isDir = stat.isDirectory()

    if (program.dir) {
      if (!isDir) {
        error('you need to specific a dir, not a file!')
        return
      }

      const targetDir = absolutePath

      const tmpDir = path.join(targetDir, './.tscer/')

      if (!fs.existsSync(tmpDir)) {
        error(`${tmpDir} seems not exist, sorry we can not revert back!`)
      } else {
        // recursive replace file
        replaceFile(tmpDir, targetDir)
        if (checkDirIsEmpty(tmpDir)) {
          fs.removeSync(tmpDir)
        }
      }
    } else {
      if (isDir) {
        error('you need to specific a file, not a dir!')
        return
      }
      const targetDir = path.dirname(absolutePath)
      const tmpDir = path.join(targetDir, './.tscer/')

      if (!fs.existsSync(tmpDir)) {
        error(`${tmpDir} seems not exist, sorry we can not revert back!`)
      } else {
        const filename = path.basename(absolutePath).split('.')[0]
        const files = glob.sync(`*${filename}*`, {
          cwd: tmpDir,
        })
        if (files.length === 0) {
          error(`not found ${filename} in .tscer`)
        } else {
          // move back file
          fs.moveSync(
            path.join(tmpDir, files[0]),
            path.join(targetDir, files[0])
          )
          // remove origin file
          fs.removeSync(absolutePath)
          // check .tscer has file
          const tmpfiles = fs.readdirSync(tmpDir)
          if (tmpfiles.length === 0) {
            fs.removeSync(tmpDir)
          }
        }
      }
    }
  })

program.command('tracert [dir] [filePath]').action((dir, filePath) => {
  if (!dir || !filePath) {
    error('dir and target must be given!')
    return
  }
  const directory = path.resolve(process.cwd(), dir)
  const indexFile = path.resolve(process.cwd(), filePath)
  const compileOptions = readTsConfig(directory)
  tracert(indexFile, directory, compileOptions)
})

program.parse(process.argv)
