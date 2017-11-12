import EventEmitter from 'events';
import { exec } from 'child_process';
import path from 'path';
import axios from 'axios';
import debug from 'debug';
import generateBtleCredentials from './generateBtleCredentials';
import GattServer from './gatt/server';

axios.defaults.baseURL = 'https://android-cdn-api.fitbit.com';

const execAsync = cmd => new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve({ stdout, stderr });
  });
});

const UUID_CHARACTERISTIC_READ_DATA = 'adabfb01-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTIC_WRITE_DATA = 'adabfb02-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTIC_LIVE_DATA = '558dfa01-4fa8-4105-9f02-4eaa93e62980';

const connectAsync = peripheral => new Promise((resolve, reject) => {
  peripheral.connect((err) => {
    if (err) reject(err);
    else resolve();
  });
});

const discoverSomeServicesAndCharacteristicsAsync =
  (p, sUUIDs, cUUIDs) => new Promise((res, rej) => {
    p.discoverSomeServicesAndCharacteristics(sUUIDs, cUUIDs, (err, s, c) => {
      if (err) rej(err);
      else res({ services: s, characteristics: c });
    });
  });

const discoverAllServicesAndCharacteristicsAsync =
  p => discoverSomeServicesAndCharacteristicsAsync(p, [], []);

const discoverDescriptorsAsync = characteristic => new Promise((resolve, reject) => {
  characteristic.discoverDescriptors((err, descriptor) => {
    if (err) reject(err);
    else resolve(descriptor);
  });
});

const subscribeAsync = characteristic => new Promise((resolve) => {
  characteristic.subscribe(() => {
    resolve();
  });
});

const unsubscribeAsync = characteristic => new Promise((resolve) => {
  characteristic.unsubscribe(() => {
    resolve();
  });
});

const writeData = (reqCh, reqData, resCh, cond) => new Promise((resolve) => {
  const onNotify = function onNotify(responseData) {
    debug('fitbit-livedata')(`HOST <-- ${this.uuid} '${responseData.toString('hex')}'`);
    if (cond(responseData)) resolve(responseData);
    else this.once('read', onNotify.bind(this));
  };
  resCh.once('read', onNotify.bind(resCh));
  reqCh.write(reqData, true, () => {
    debug('fitbit-livedata')(`HOST --> ${reqCh.uuid} '${reqData.toString('hex')}'`);
  });
});

const arrange4Bytes = (bytes, fr) =>
  (bytes[fr + 3] * 16777216) + (bytes[fr + 2] * 65536) + (bytes[fr + 1] * 256) + bytes[fr];
const arrange2Bytes = (bytes, fr) =>
  (bytes[fr + 1] * 256) + bytes[fr];

const gattServer = new GattServer();

export class Tracker extends EventEmitter {
  constructor(peripheral, params) {
    super();
    this.peripheral = peripheral;
    this.params = params;
    this.status = 'disconnected';
    this.peripheral.on('disconnect', () => {
      this.emit('disconnected');
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      if (this.status !== 'disconnected') {
        this.peripheral.removeAllListeners('disconnect');
        this.peripheral.once('disconnect', () => {
          resolve();
          this.status = 'disconnected';
          this.emit('disconnected');
        });
        this.peripheral.disconnect();
      } else {
        this.emit('disconnected');
        resolve();
      }
    });
  }

  connect() {
    return connectAsync(this.peripheral)
      .then(() => {
        this.emit('connecting');
        this.status = 'connecting';
        return discoverAllServicesAndCharacteristicsAsync(this.peripheral);
      })
      .then((data) => {
        debug('fitbit-livedata')(`${data.characteristics.length} characteristics are found`);
        return Promise.all(data.characteristics.map(ch => discoverDescriptorsAsync(ch)))
          .then(() => data.characteristics);
      })
      .then((chs) => {
        const control = chs.filter(ch => ch.uuid === UUID_CHARACTERISTIC_READ_DATA.replace(/-/g, ''))[0];
        const live = chs.filter(ch => ch.uuid === UUID_CHARACTERISTIC_LIVE_DATA.replace(/-/g, ''))[0];
        const writable = chs.filter(ch => ch.uuid === UUID_CHARACTERISTIC_WRITE_DATA.replace(/-/g, ''))[0];
        return subscribeAsync(control)
          .then(() => {
            // send message 'OPEN_SESSION'
            this.emit('openingSession');
            return writeData(
              writable,
              Buffer.from([
                0xc0, 0x0a, 0x0a, 0x00, 0x08, 0x00,
                0x10, 0x00, 0x00, 0x00, 0xc8, 0x00, 0x01,
              ]),
              control,
              data => data.length === 14,
            );
          })
          .then(() => {
            // send message 'Command.AUTH_TRACKER'
            this.emit('authenticating');
            const dataSent = [0xc0, 0x50];
            const getRandomInt = (mi, mx) => (Math.floor(Math.random() * ((mx - mi) + 1)) + mi);
            const { nonce } = this.params.auth.btleClientAuthCredentials;
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(nonce % 256);
            dataSent.push(Math.floor(nonce / 256) % 256);
            dataSent.push(Math.floor(nonce / 65536) % 256);
            dataSent.push(Math.floor(nonce / 16777216) % 256);
            return writeData(
              writable,
              Buffer.from(dataSent),
              control,
              data => data.length === 14,
            );
          })
          .then((dataRcv) => {
            const { authSubKey } = this.params.auth.btleClientAuthCredentials;
            const authType = this.params.auth.type || '';
            const binPath = path.join(__dirname, '../../bin');
            return execAsync(`java -cp "${binPath}/*" Main ${dataRcv.toString('hex')} ${authSubKey} ${authType}`)
              .then((res) => {
                const bytes = res.stdout.match(/.{2}/g).map(seg => parseInt(seg, 16));
                // send message 'Command.SEND_AUTH'
                this.emit('sendAuth');
                return writeData(
                  writable,
                  Buffer.from(bytes),
                  control,
                  data => data.length === 2,
                );
              });
          })
          .then(() => {
            // send message 'CLOSE_SESSION'
            this.emit('authenticated');
            return writeData(
              writable,
              Buffer.from([0xc0, 0x01]),
              control,
              data => data.length === 2,
            );
          })
          .then(() => unsubscribeAsync(control))
          .then(() => subscribeAsync(live))
          .then(() => {
            this.emit('connected');
            this.status = 'connected';
            live.on('read', (data) => {
              // 8cbca859 e70d0000 0c572600 8103     3c00      1400       4d        02
              // time     steps    distanse calories elevation veryActive heartRate heartrate
              const time = new Date(arrange4Bytes(data, 0) * 1000);
              const steps = arrange4Bytes(data, 4);
              const distance = arrange4Bytes(data, 8);
              const calories = arrange2Bytes(data, 12);
              const elevation = arrange2Bytes(data, 14) / 10;
              const veryActive = arrange2Bytes(data, 16);
              const heartRate = data[18] ? data[18] % 256 : 0;
              this.emit('data', {
                device: {
                  name: this.params.name,
                  address: this.params.address,
                  serialNumber: this.params.serialNumber,
                },
                livedata: {
                  time,
                  steps,
                  distance,
                  calories,
                  elevation,
                  veryActive,
                  heartRate,
                },
              });
              debug('livedata')(` params     : ${(this.params)}`);
              debug('livedata')(` time       : ${time}`);
              debug('livedata')(` steps      : ${steps}`);
              debug('livedata')(` distanse   : ${distance}`);
              debug('livedata')(` calories   : ${calories}`);
              debug('livedata')(` elevation  : ${elevation}`);
              debug('livedata')(` veryActive : ${veryActive}`);
              debug('livedata')(` heartRate  : ${heartRate}`);
            });
          });
      });
  }
}

export default class FitbitLiveData extends EventEmitter {
  constructor() {
    super();
    this.trackers = [];
    this.isScanning = false;
    this.noble = null;
  }

  getTrackers(authinfo) {
    return new Promise((resolve) => {
      generateBtleCredentials(authinfo)
        .then((trackers) => {
          debug('fitbit-livedata')('login succeeded');
          resolve(trackers);
        })
        .catch((err) => {
          debug('fitbit-livedata')(err.response.data.errors.map(e => e.message).join('\n'));
          resolve([]);
        });
    });
  }

  disconnectAllTrackers() {
    return this.trackers.reduce(
      (prev, curr) =>
        prev.then(() =>
          new Promise((res) => {
            curr.disconnect()
              .then(() => res)
              .catch(() => res);
          }))
      , Promise.resolve(),
    ).then(() => {
      this.emit('disconnectAll');
      if (this.noble && this.isScanning) {
        debug('fitbit-livedata')('stop scanning.');
        this.noble.stopScanning();
        this.isScanning = false;
        if (process.platform === 'win32') this.emit('scanStart');
      }
    });
  }

  get trackerStatus() {
    return this.trackers.map((tracker) => {
      const { name, address, serialNumber } = tracker;
      return {
        name,
        address,
        serialNumber,
        status: tracker.tracker.status,
      };
    });
  }

  scanTrackers(trackers) {
    const addresses = this.trackers.map(i => i.address.toLowerCase());
    trackers.forEach((t) => {
      if (addresses.indexOf(t.address.toLowerCase()) < 0) this.trackers.push(t);
    });

    if (this.trackers.length === 0) {
      this.emit('error', 'no available trackers');
      return;
    }
    import(process.platform === 'win32' ? 'noble-uwp' : 'noble').then((noble) => {
      if (!this.noble) this.noble = noble;
      if (this.noble.listenerCount('discover') === 0) {
        this.noble.on('scanStart', () => {
          this.emit('scanStart');
        });
        this.noble.on('scanStop', () => {
          this.emit('scanStop');
        });
        this.noble.on('discover', (p) => {
          if (p.address === 'unknown') return;
          const target = this.trackers.filter(i =>
            i.address.toLowerCase() === p.address.toLowerCase());
          if (target.length === 1) {
            debug('tracker')(`'${p.address}' is discovered`);
            const t = new Tracker(p, target[0]);
            target[0].tracker = t;
            this.emit('discover', t);
            if (this.trackers.filter(i => !i.tracker).length === 0 && this.isScanning) {
              debug('fitbit-livedata')('stop scanning.');
              this.noble.stopScanning();
              this.isScanning = false;
              if (process.platform === 'win32') this.emit('scanStop');
            }
          }
        });
      }
      if (gattServer.listenerCount('listen') === 0) {
        const listen = () => {
          if (this.noble.state === 'poweredOn') {
            if (this.trackers.filter(t => !t.tracker || t.status !== 'connected').length > 0 && !this.isScanning) {
              debug('fitbit-livedata')('already powered on.');
              this.noble.startScanning();
              this.isScanning = true;
              if (process.platform === 'win32') this.emit('scanStart');
            }
          } else {
            this.noble.on('stateChange', (state) => {
              if (state === 'poweredOn') {
                if (this.trackers.filter(t => !t.tracker || t.status !== 'connected').length > 0 && !this.isScanning) {
                  debug('fitbit-livedata')('start scanning...');
                  this.noble.startScanning();
                  this.isScanning = true;
                  if (process.platform === 'win32') this.emit('scanStart');
                }
              } else {
                debug('fitbit-livedata')('stop scanning.');
                this.noble.stopScanning();
                this.isScanning = false;
                if (process.platform === 'win32') this.emit('scanStop');
              }
            });
          }
        };
        gattServer.on('listen', listen);
        gattServer.on('error', (error) => {
          process.stderr.write(`${error}\n`);
          listen();
        });
      }
      gattServer.listen();
    });
  }
}
