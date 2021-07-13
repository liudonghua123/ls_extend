#!/usr/bin/env node

const { showHelp } = require('yargs');
const chalk = require('chalk');
const { existsSync } = require('fs');
const { join, resolve, dirname } = require('path');
const glob = require("glob");
const debug = require('debug')('ls_extend');
const { stat } = require('fs/promises');
const dayjs = require('dayjs');
const moment = require('moment');

// https://github.com/yargs/yargs
const argv = require('yargs')
  .usage('Usage: $0 <file_path> [options]')
  .example('$0 .', 'ls current working directory')
  // option config
  // .alias('r', 'recursive')
  // .describe('r', 'recursive traverse the filePath')
  // .default('r', false)
  .alias('m', 'mode')
  .describe('m', 'file mode of time for filtering, available modes: mtime[default], atime, ctime')
  .default('m', 'mtime')
  .alias('p', 'pattern')
  .describe('p', 'file pattern for traverse the filePath')
  .default('p', '*')
  .alias('d', 'delimiter')
  .describe('d', 'delimiter for output result')
  .default('d', ' ')
  .alias('st', 'start-time')
  .describe('st', 'start time for filter')
  .alias('et', 'end-time')
  .describe('et', 'end time for filter')
  .alias('sd', 'start-date')
  .describe('sd', 'start date for filter')
  .alias('ed', 'end-date')
  .describe('ed', 'end date for filter')
  .help('h')
  .version('0.0.1')
  .alias('h', 'help')
  .alias('v', 'version')
  .epilog('Copyright (c) 2021 liudonghua').argv;

debug(`argv: `, argv)

// position argvs
const [filePath] = argv._
// option argvs
const { mode, pattern, delimiter, startTime, endTime, startDate, endDate } = argv

if (!filePath || !existsSync(filePath)) {
  console.info(chalk.red.bold(`filePath: ${filePath} does not exists!`));
  process.exit(-1);
}

const constructExtraFields = ({ atimeMs, mtimeMs, ctimeMs }) => {
  const now = moment()
  const atimeMoment = moment(atimeMs)
  const mtimeMoment = moment(mtimeMs)
  const ctimeMoment = moment(ctimeMs)
  return {
    atimeOnly: moment({ hour: atimeMoment.hour(), minute: atimeMoment.hour(), second: atimeMoment.second() }),
    mtimeOnly: moment({ hour: mtimeMoment.hour(), minute: mtimeMoment.hour(), second: mtimeMoment.second() }),
    ctimeOnly: moment({ hour: ctimeMoment.hour(), minute: ctimeMoment.hour(), second: ctimeMoment.second() }),
  }
}

glob(pattern, { cwd: filePath }, async (er, files) => {
  // contruct a rich stat objects
  const fileStats = {};
  for (const file of files) {
    const statInfo = await stat(join(filePath, file));
    const extraFields = constructExtraFields(statInfo);
    fileStats[file] = {
      ...statInfo,
      ...extraFields,
      file,
    };
  }
  // do the filter work
  const filteredFiles = files.filter(file => {
    const fileStat = fileStats[file]
    if (startTime) {
      const startTimeMoment = moment(startTime, 'HH:mm:ss')
      if (fileStat[`${mode}Only`].isBefore(startTimeMoment)) {
        return false;
      }
      debug(`startTime filter passed for ${file} and ${startTime}`)
    }
    if (endTime) {
      const endTimeMoment = moment(endTime, 'HH:mm:ss')
      if (fileStat[`${mode}Only`].isAfter(endTimeMoment)) {
        return false;
      }
      debug(`endTime filter passed for ${file} and ${endTime}`)
    }
    if (startDate) {
      const startDateMoment = moment(startDate, 'YYYY-MM-DD HH:mm:ss')
      if (fileStat[`${mode}`].isBefore(startDateMoment)) {
        return false;
      }
      debug(`startDate filter passed for ${file} and ${startDate}`)
    }
    if (endDate) {
      const endDateMoment = moment(endDate, 'YYYY-MM-DD HH:mm:ss')
      if (fileStat[`${mode}`].isBefore(endDateMoment)) {
        return false;
      }
      debug(`endDate filter passed for ${file} and ${endDate}`)
    }
    return true;
  });
  console.info(chalk.red.bold(`${filteredFiles.join(delimiter)}`));
})