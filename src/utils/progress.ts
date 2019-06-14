import chalk from 'chalk'
import ProgressBar from 'progress'

export const createProgressBar = (total: number) => {
  const bar = new ProgressBar(':file [:bar] :percent :elapseds', {
    total,
    width: 20,
    complete: chalk.cyan('='),
    incomplete: ' ',
  })

  return bar
}
