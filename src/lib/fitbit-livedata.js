import EventEmitter from 'events';
import { exec } from 'child_process';
import path from 'path';
import axios from 'axios';
import debug from 'debug';
// import TrackerAuthCredentials from './tracker-auth-credentials';
import generateBtleCredentials from './generateBtleCredentials';
import GattServer from './gatt/server';

axios.defaults.baseURL = 'https://android-cdn-api.fitbit.com';

const execAsync = cmd => new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve({ stdout, stderr });
  });
});

// const UUID_SERVICE_GENERIC_ACCESS = '00001800-0000-1000-8000-00805f9b34fb';
// const UUID_SERVICE_FITBIT_COMM = 'adabfb00-6e7d-4601-bda2-bffaa68956ba';
// const UUID_SERVICE_FITBIT_LIVE = '558dfa00-4fa8-4105-9f02-4eaa93e62980';

// const UUID_CHARACTERISTIC_GENERIC_ACCESS = '00002A00-0000-1000-8000-00805f9b34fb';
// const UUID_CHARACTERISTIC_DEVICE_NAME = 'fb00';
// const UUID_CHARACTERISTIC_APPEARANCE = '2a01';
// const UUID_CHARACTERISTIC_MANUF_NAME = '2a29';
// const UUID_CHARACTERISTIC_BATTERY_LEVEL = '2a19';
const UUID_CHARACTERISTIC_READ_DATA = 'adabfb01-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTIC_WRITE_DATA = 'adabfb02-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTIC_LIVE_DATA = '558dfa01-4fa8-4105-9f02-4eaa93e62980';
// const UUID_CHARACTERISTIC_READ_UNKNOWN1 = 'adabfb03-6e7d-4601-bda2-bffaa68956ba';
// const UUID_CHARACTERISTIC_READ_UNKNOWN2 = 'adabfb04-6e7d-4601-bda2-bffaa68956ba';
// const UUID_CHARACTERISTIC_READ_UNKNOWN3 = 'adabfb05-6e7d-4601-bda2-bffaa68956ba';

// const characteristicUuids = [];
// const serviceUuids = [];

const connectAsync = peripheral => new Promise((resolve, reject) => {
  peripheral.connect((err) => {
    if (err) reject(err);
    else resolve();
  });
});

// const discoverServicesAsync = (peripheral, serviceUUIDs) => new Promise((resolve, reject) => {
//   peripheral.discoverServices(serviceUUIDs, (err, services) => {
//     if (err) reject(err);
//     else resolve(services);
//   });
// });

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

const arrange4Bytes =
  (bytes, fr) => bytes[fr + 3] << 24 | bytes[fr + 2] << 16 | bytes[fr + 1] << 8 | bytes[fr];
const arrange2Bytes =
  (bytes, fr) => bytes[fr + 1] << 8 | bytes[fr];

export class Tracker extends EventEmitter {
  constructor(peripheral, params) {
    super();
    this.peripheral = peripheral;
    this.params = params;
    this.connected = false;
    this.peripheral.on('disconnect', () => {
      this.emit('disconnect');
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      if (this.connected) {
        this.peripheral.once('disconnect', () => {
          resolve();
          this.connected = false;
        });
        this.peripheral.disconnect();
      } else {
        this.emit('disconnect');
        resolve();
      }
    });
  }

  connect() {
    return connectAsync(this.peripheral)
      .then(() => {
        this.emit('connect');
        // return discoverSomeServicesAndCharacteristicsAsync(
        //   this.peripheral,
        //   serviceUuids.map(e => e.replace(/-/g, '')),
        //   characteristicUuids.map(e => e.replace(/-/g, '')),
        // );
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
        // const read = chs.filter(ch => ch.uuid === UUID_CHARACTERISTIC_MANUF_NAME.replace(/-/g, ''))[0];
        return subscribeAsync(control)
          .then(() => {
            // send message 'OPEN_SESSION'
            this.emit('openSession');
            return writeData(
              writable,
              // new Buffer([
              //   0xc0, 0x0a, 0x0a, 0x00, 0x08, 0x00,
              //   0x10, 0x00, 0x00, 0x00, 0xc8, 0x00, 0x01
              // ]),
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
            this.emit('authenticate');
            const dataSent = [0xc0, 0x50];
            const getRandomInt = (mi, mx) => (Math.floor(Math.random() * ((mx - mi) + 1)) + mi);
            const { nonce } = this.params.auth.btleClientAuthCredentials;
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(getRandomInt(0x00, 0xff));
            dataSent.push(nonce & 0x000000ff);
            dataSent.push((nonce >> 8) & 0x000000ff);
            dataSent.push((nonce >> 16) & 0x000000ff);
            dataSent.push((nonce >> 24) & 0x000000ff);
            return writeData(
              writable,
              // new Buffer(dataSent),
              Buffer.from(dataSent),
              control,
              data => data.length === 14,
            );
          })
          .then((dataRcv) => {
            // const nonce = this.params.auth.btleClientAuthCredentials.nonce;
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
                  // new Buffer(bytes),
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
              // new Buffer([0xc0, 0x01]),
              Buffer.from([0xc0, 0x01]),
              control,
              data => data.length === 2,
            );
          })
          .then(() => unsubscribeAsync(control))
          .then(() => subscribeAsync(live))
          .then(() => {
            live.on('read', (data) => {
              // 8cbca859 e70d0000 0c572600 8103     3c00      1400       4d        02
              // time     steps    distanse calories elevation veryActive heartRate heartrate
              const time = new Date(arrange4Bytes(data, 0) * 1000);
              const steps = arrange4Bytes(data, 4);
              const distance = arrange4Bytes(data, 8);
              const calories = arrange2Bytes(data, 12);
              const elevation = arrange2Bytes(data, 14) / 10;
              const veryActive = arrange2Bytes(data, 16);
              const heartRate = data[18] & 255;
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
  }

  addAccount(authinfo) {
    return new Promise((resolve) => {
      generateBtleCredentials(authinfo)
        .then((trackers) => {
          debug('fitbit-livedata')('login succeeded');
          this.trackers = this.trackers.concat(trackers);
          const infos = trackers.map(tracker => ({
            name: tracker.name,
            address: tracker.address,
          }));
          debug('fitbit-livedata')(`available trackers: ${JSON.stringify(infos)}`);
          resolve(infos);
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
    );
  }

  scanTrackers(targetTrackersInfo) {
    let infos = (() => {
      if (!targetTrackersInfo) return [];
      else if (targetTrackersInfo instanceof Array) return targetTrackersInfo;
      return [targetTrackersInfo];
    })();
    this.trackers = (() => {
      infos = infos.filter(i =>
        this.trackers.filter(tr => tr.name === i.name && tr.address === i.address).length === 1);
      if (infos.length === 0) return this.trackers;
      return this.trackers.filter(tracker =>
        infos.filter(i => tracker.name === i.name && tracker.address === i.address).length === 1);
    })();
    if (this.trackers.length === 0) {
      this.emit('error', 'no available trackers');
      return;
    }
    import(process.platform === 'win32' ? 'noble-uwp' : 'noble').then((noble) => {
      noble.on('discover', (p) => {
        if (p.address === 'unknown') return;
        const target = this.trackers.filter(i =>
          i.address.toLowerCase() === p.address.toLowerCase());
        if (target.length === 1) {
          debug('tracker')(`'${p.address}' is discovered`);
          target[0].tracker = new Tracker(p, target[0]);
          this.emit('discover', target[0].tracker);
          if (this.trackers.filter(i => !i.tracker).length === 0) noble.stopScanning();
        }
      });
      const gattServer = new GattServer();
      const listen = () => {
        if (noble.state === 'poweredOn') {
          debug('fitbit-livedata')('already powered on.');
          debug('fitbit-livedata')('start scanning...');
          noble.startScanning();
        } else {
          noble.on('stateChange', (state) => {
            if (state === 'poweredOn') {
              debug('fitbit-livedata')('start scanning...');
              noble.startScanning();
            } else {
              noble.stopScanning();
            }
          });
        }
      };
      gattServer.on('listen', listen);
      gattServer.on('error', (error) => {
        process.stderr.write(`${error}\n`);
        listen();
      });
      gattServer.listen();
    });
  }
}
