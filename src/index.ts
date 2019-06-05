import chalk from 'chalk'
import commander from 'commander'
import { run } from 'compiler'
import fs from 'fs-extra'
import glob = require('glob')
import path from 'path'
import { readTsConfig } from 'utils/readTsconfig'

const error = (msg: string) => {
  console.error(chalk.redBright(msg))
}

const pkg = fs.readJSONSync(path.resolve(__dirname, '../package.json'))

const program = new commander.Command()

program
  .version(pkg.version)
  .usage('tscer [filepath]')
  .option('-D --dir', 'specific a directory')
  .parse(process.argv)

const relativePath = program.args[0]

if (relativePath === undefined) {
  error('you need to specific a file or a dir!')
} else {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  const stat = fs.statSync(absolutePath)
  const isDir = stat.isDirectory()

  if (program.dir) {
    if (!isDir) {
      error(`${absolutePath} is not a directory!`)
    } else {
      // dir
      const compileOptions = readTsConfig(absolutePath)
      const files = glob.sync('**/*.jsx', {
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
        run(absolutePath, dir, compileOptions)
      } catch (e) {
        error(absolutePath)
        error(e.message)
      }
    }
  }
}
