import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'

export function replaceFile(srcDir: string, destDir: string) {
  const files = fs.readdirSync(srcDir)

  files.forEach(f => {
    const absFilePath = path.join(srcDir, f)
    const stat = fs.statSync(absFilePath)
    if (stat.isDirectory()) {
      // dir
      replaceFile(absFilePath, destDir)
    } else {
      const relateivePath = path.relative(
        path.join(destDir, './.tscer'),
        absFilePath
      )
      fs.moveSync(absFilePath, path.join(destDir, relateivePath))
      // remove file
      fs.removeSync(path.join(destDir, relateivePath.replace('.j', '.t')))
    }
  })
}

export const checkDirIsEmpty = (dir: string): boolean => {
  if (!fs.existsSync(dir)) {
    error('not a valid directory')
    return false
  }

  const files = fs.readdirSync(dir)

  for (const f of files) {
    const absFilePath = path.join(dir, f)
    const stat = fs.statSync(absFilePath)
    if (stat.isDirectory()) {
      // dir
      if (!checkDirIsEmpty(absFilePath)) {
        return false
      }
    } else {
      return false
    }
  }
  return true
}

export const error = (msg: string) => {
  console.error(chalk.redBright(msg))
}
