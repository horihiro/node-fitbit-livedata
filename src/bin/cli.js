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

program
  .version(pkg.version)
  .option('-u, --username [value]', 'username')
  .option('-p, --password [value]', 'password')
  .parse(process.argv);

Promise.resolve()
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
        console.log();
        resolve(answer);
      });
      mutableStdout.muted = true;
    });
  })
  .then((password) => {
    program.password = password;

    const fitbit = new FitbitLiveData();
    
    fitbit.on('authenticated', () => {
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
    fitbit.login({
      username: program.username,
      password: program.password
    });
  });
