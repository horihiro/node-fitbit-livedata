#!/usr/bin/env node
import readline from 'readline';
import stream from 'stream';
import program from 'commander';
import debug from 'debug';
import FitbitLiveData from '..';
import pkg from '../../package.json';

const mutableStdout = new stream.Writable({
  write: function(chunk, encoding, callback) {
    if (!this.muted)
      process.stdout.write(chunk, encoding);
    callback();
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true
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

const fitbit = new FitbitLiveData();

fitbit.on('success', () => {
  fitbit.scan();
});
fitbit.on('error', (err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
})
fitbit.on('discover', (tracker) => {
  tracker.on('disconnect', (data) => {
    debug('tracker')('disconnect');
    tracker.connect();    
  });

  tracker.on('connect', (data) => {
    debug('tracker')('connect');
  });
  tracker.on('openSession', (data) => {
    debug('tracker')('openSession');
  });
  tracker.on('authenticate', (data) => {
    debug('tracker')('authenticate');
  });
  tracker.on('sendAuth', (data) => {
    debug('tracker')('sendAuth');
  });
  tracker.on('authenticated', (data) => {
    debug('tracker')('authenticated');
  });
  tracker.on('data', (livedata) => {
    process.stdout.write(`${JSON.stringify(livedata)}\n`);
  });
  tracker.connect();
});
Promise.resolve().then(() => {
  if (program.authcodes.length > 0) {
    const firstCode = program.rawArgs.indexOf(program.authcodes[0]);
    let index = 0;
    for (let i = 0; i < program.rawArgs.length; i++) {
      if (i <= firstCode) continue;
      else if (program.rawArgs[i][0] === '-') break;
      else program.authcodes.push(program.rawArgs[i]);
    }
    return program.authcodes.map((authCode) => {
      return {
        authCode
      }
    });
  } else {
    return Promise.resolve()
      .then(() => {
        return program.username || new Promise((resolve) => {
          process.stdout.write('Enter FitBit account\n');
          rl.question('username : ', (answer) => {
            resolve(answer);
          });
          mutableStdout.muted = false;
        });
      })
      .then((username) => {
        const isRequired = program.username !== username;
        program.username = username;
        return !isRequired && program.password || new Promise((resolve) => {
          rl.question(`Password : `, (answer) => {
            mutableStdout.muted = false;
            resolve(answer);
          });
          mutableStdout.muted = true;
        });
      })
      .then((password) => {
        program.password = password;
      });
    }
  })
  .then((authCodes) => {
    fitbit.login(authCodes ? authCodes : [{
      username: program.username,
      password: program.password
    }]);
  });
