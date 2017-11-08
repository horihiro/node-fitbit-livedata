#!/usr/bin/env node
import readline from 'readline';
import stream from 'stream';
import program from 'commander';
import debug from 'debug';
import fitbit from '..';
import pkg from '../../package.json';

const mutableStdout = new stream.Writable({
  write: function write(chunk, encoding, callback) {
    if (!this.muted) process.stdout.write(chunk, encoding);
    callback();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true,
});

const parseCodes = (val, codes) => {
  codes.push(val);
  return codes;
};

program
  .version(pkg.version)
  .option('-u, --username [value]', 'username')
  .option('-p, --password [value]', 'password')
  .option('-c, --authcodes <items>', 'authentication codes', parseCodes, [])
  .parse(process.argv);

Promise.resolve().then(() => {
  if (program.authcodes.length > 0) {
    const firstCode = program.rawArgs.indexOf(program.authcodes[0]);
    for (let i = firstCode + 1; i < program.rawArgs.length; i += 1) {
      if (program.rawArgs[i][0] === '-') break;
      else program.authcodes.push(program.rawArgs[i]);
    }
    return program.authcodes.map(authCode => ({
      authCode,
    }));
  }
  return Promise.resolve().then(() =>
    program.username || new Promise((resolve) => {
      process.stdout.write('Enter FitBit account\n');
      rl.question('username : ', (answer) => {
        resolve(answer);
      });
      mutableStdout.muted = false;
    }))
    .then((username) => {
      const isRequired = program.username !== username;
      program.username = username;
      return !isRequired && (program.password || new Promise((resolve) => {
        rl.question('Password : ', (answer) => {
          mutableStdout.muted = false;
          resolve(answer);
        });
        mutableStdout.muted = true;
      }));
    })
    .then((password) => {
      program.password = password;
    });
})
  .then((authCodes) => {
    const authInfos = authCodes || [{
      username: program.username,
      password: program.password,
    }];
    const trackers = [];

    authInfos.reduce((prev, account) =>
      prev.then(() =>
        new Promise(resolve =>
          fitbit.addAccount(account)
            .then((trackerInfos) => {
              trackerInfos.forEach((trackerInfo) => {
                trackers.push(trackerInfo);
              });
              resolve();
            })
            .catch((err) => {
              debug('fitbit-livedata-cli')(`${err}`);
              resolve();
            }))), Promise.resolve()).then(() => {
      debug('fitbit-livedata-cli')(`all trackers are ${JSON.stringify(trackers, null, 2)}`);
      fitbit.on('discover', (tracker) => {
        tracker.on('disconnect', () => {
          debug('tracker')('disconnected');
          tracker.connect();
        });

        tracker.on('connect', () => {
          debug('tracker')('connect');
        });
        tracker.on('openSession', () => {
          debug('tracker')('openSession');
        });
        tracker.on('authenticate', () => {
          debug('tracker')('authenticate');
        });
        tracker.on('sendAuth', () => {
          debug('tracker')('sendAuth');
        });
        tracker.on('authenticated', () => {
          debug('tracker')('authenticated');
        });
        tracker.on('data', (livedata) => {
          process.stdout.write(`${JSON.stringify(livedata)}\n`);
        });
        tracker.connect();
      });

      fitbit.on('error', (error) => {
        process.stderr.write(`${error}\n`);
        process.exit(1);
      });
      fitbit.scanTrackers();
    });
  });
