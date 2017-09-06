import EventEmitter from 'events';
import { exec } from 'child_process';
import path from 'path';
import noble from 'noble';
import debug from 'debug';
// import TrackerAuthCredentials from './tracker-auth-credentials';
// import gattServer from './gatt/server';

const execAsync = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({stdout, stderr});
    });
  });
};

const UUID_SERVICE_GENERIC_ACCESS = '00001800-0000-1000-8000-00805f9b34fb';
const UUID_SERVICE_FITBIT_COMM =  'adabfb00-6e7d-4601-bda2-bffaa68956ba';
const UUID_SERVICE_FITBIT_LIVE =  '558dfa00-4fa8-4105-9f02-4eaa93e62980';

const UUID_CHARACTERISTICS_GENERIC_ACCESS = '00002A00-0000-1000-8000-00805f9b34fb';
const UUID_CHARACTERISTICS_DEVICE_NAME = 'fb00';
const UUID_CHARACTERISTICS_APPEARANCE = '2a01';
const UUID_CHARACTERISTICS_MANUF_NAME = '2a29';
const UUID_CHARACTERISTICS_BATTERY_LEVEL = '2a19';
const UUID_CHARACTERISTICS_READ_DATA = 'adabfb01-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTICS_WRITE_DATA = 'adabfb02-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTICS_LIVE_DATA = '558dfa01-4fa8-4105-9f02-4eaa93e62980';
const UUID_CHARACTERISTICS_READ_UNKNOWN1 = 'adabfb03-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTICS_READ_UNKNOWN2 = 'adabfb04-6e7d-4601-bda2-bffaa68956ba';
const UUID_CHARACTERISTICS_READ_UNKNOWN3 = 'adabfb05-6e7d-4601-bda2-bffaa68956ba';

const characteristicsUuids = [];
const serviceUuids = [];

const connectAsync = (peripheral) => {
  return new Promise((resolve, reject) => {
    peripheral.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const discoverServicesAsync = (peripheral, serviceUUIDs) => {
  return new Promise((resolve, reject) => {
    peripheral.discoverServices(serviceUUIDs, (err, services) => {
      if (err) reject(err);
      else resolve(services);
    });
  });
}

const discoverSomeServicesAndCharacteristicsAsync = (peripheral, serviceUUIDs, characteristicsUUIDs) => {
  return new Promise((resolve, reject) => {
    peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicsUUIDs, (err, services, characteristicses) => {
      if (err) reject(err);
      else resolve({
        services,
        characteristicses
      });
    });
  });
}

const discoverAllServicesAndCharacteristicsAsync = (peripheral) => {
  return discoverSomeServicesAndCharacteristicsAsync(peripheral, [], []);
};

const discoverDescriptorsAsync = (characteristics) => {
  return new Promise((resolve, reject) => {
    characteristics.discoverDescriptors((err, descriptor) => {
      if (err) reject(err);
      else resolve(descriptor);
    });
  });
};

const subscribeAsync = (characteristics) => {
  return new Promise((resolve, reject) => {
    characteristics.subscribe(() => {
      resolve();
    })
  });
};

const unsubscribeAsync = (characteristics) => {
  return new Promise((resolve, reject) => {
    characteristics.unsubscribe(() => {
      resolve();
    })
  });
};

const writeData = (requestCharacteristics, requestData, responseCharacteristics, condition) => {
  return new Promise((resolve, reject) => {
    const onNotify = function(responseData) {
      debug('tracker')(`${new Date()}|${this.uuid} --> : (${responseData.length}) ${responseData.toString('hex')}`);
      if (condition(responseData)) resolve(responseData);
      else this.once('read', onNotify.bind(this));
    };
    responseCharacteristics.once('read', onNotify.bind(responseCharacteristics));
    requestCharacteristics.write(requestData, true, () => {
      debug('tracker')(`${new Date()}|${requestCharacteristics.uuid} <-- : (${requestData.length}) ${requestData.toString('hex')}`);
    });
  });
};

const arrange4Bytes = (bytes, from) => {
  return bytes[from + 3] << 24 | bytes[from + 2] << 16 | bytes[from + 1] << 8 | bytes[from];
};
const arrange2Bytes = (bytes, from) => {
  return bytes[from + 1] << 8 | bytes[from];
};

export class Tracker extends EventEmitter {
  constructor(peripheral, auth) {
    super();
    this.peripheral = peripheral;
    this.auth = auth;
  }

  disconnect(forceReconnect) {
    this.forceReconnect = false;
    this.peripheral.disconnect();
  }

  connect(forceReconnect) {
    this.forceReconnect = forceReconnect;
    this.peripheral.once('disconnect', () => {
      if (this.forceReconnect) this.connect(true);
      this.emit('disconnect');
    })
    return connectAsync(this.peripheral)
    .then(() => {
      this.emit('connect');                
      return discoverSomeServicesAndCharacteristicsAsync(
        this.peripheral,
        serviceUuids.map(e => e.replace(/-/g, '')),
        characteristicsUuids.map(e => e.replace(/-/g, ''))
      );
    })
    .then((data) => {
      console.log(`${data.characteristicses.length} characteristicses are found`);
      return Promise.all(
        data.characteristicses.map((ch) => discoverDescriptorsAsync(ch))
      ).then(() => data.characteristicses);
    })
    .then((characteristicses) => {
      const control = characteristicses.filter((ch) => {
        return ch.uuid === UUID_CHARACTERISTICS_READ_DATA.replace(/-/g, '');
      })[0];
      const live = characteristicses.filter((ch) => {
        return ch.uuid === UUID_CHARACTERISTICS_LIVE_DATA.replace(/-/g, '');
      })[0];
      const writable = characteristicses.filter((ch) => {
        return ch.uuid === UUID_CHARACTERISTICS_WRITE_DATA.replace(/-/g, '');
      })[0];
      const read = characteristicses.filter((ch) => {
        return ch.uuid === UUID_CHARACTERISTICS_MANUF_NAME.replace(/-/g, '');
      })[0];
      return subscribeAsync(control)
        .then(() => {
          // send message 'OPEN_SESSION'
          this.emit('openSession');
          return writeData(
            writable,
            new Buffer([0xc0,0x0a,0x0a,0x00,0x08,0x00,0x10,0x00,0x00,0x00,0xc8,0x00,0x01]),
            control,
            (data) => {
              return data.length === 14;
            }
          );
        })
        .then(() => {
          this.emit('authenticate');                
          // send message 'Command.AUTH_TRACKER'
          const data = [0xc0, 0x50];
          const getRandomInt = (min, max) => {
            return Math.floor( Math.random() * (max - min + 1) ) + min;
          };
          const nonce = this.auth.btleClientAuthCredentials.nonce;
          data.push(getRandomInt(0x00, 0xff));
          data.push(getRandomInt(0x00, 0xff));
          data.push(getRandomInt(0x00, 0xff));
          data.push(getRandomInt(0x00, 0xff));
          data.push(nonce & 0x000000ff);
          data.push((nonce >> 8) & 0x000000ff);
          data.push((nonce >> 16) & 0x000000ff);
          data.push((nonce >> 24) & 0x000000ff);
          return writeData(
            writable,
            new Buffer(data),
            control,
            (data) => {
              return data.length === 14;
            }
          )
        })
        .then((data) => {
          const nonce = this.auth.btleClientAuthCredentials.nonce;
          const authSubKey = this.auth.btleClientAuthCredentials.authSubKey;
          const binPath = path.join(__dirname, '../../bin');
          return execAsync(`java -cp "${binPath}/*" Main ${data.toString('hex')} ${authSubKey} ${nonce}`)
            .then((res) => {
              const bytes = res.stdout.match(/.{2}/g).map((seg) => {
                return parseInt(seg, 16);
              });
              // send message 'Command.SEND_AUTH'
              this.emit('sendAuth');                
              return writeData(
                writable,
                new Buffer(bytes),
                control,
                (data) => {
                  return data.length === 2;
                }
              );
            });
        })
        .then((data) => {
          // send message 'CLOSE_SESSION'
          this.emit('authenticated');                
          return writeData(
            writable,
            new Buffer([0xc0, 0x01]),
            control,
            (data) => {
              return data.length === 2;
            }
          )
        })
        .then(() => {
          return unsubscribeAsync(control);
        })
        .then(() => {
          return subscribeAsync(live);
        })
        .then(() => {
          live.on('read', (data) => {
            // 8cbca859 e70d0000 0c572600 8103     3c00      1400       4d        02
            // time     steps    distanse calories elevation veryActive heartRate heartrate
            const time = new Date(arrange4Bytes(data, 0) * 1000);
            const steps = arrange4Bytes(data, 4);
            const distanse = arrange4Bytes(data, 8);
            const calories = arrange2Bytes(data, 12);
            const elevation = arrange2Bytes(data, 14) / 10;
            const veryActive = arrange2Bytes(data, 16);
            const heartRate = data[18] & 255;
            this.emit('data', {
              time,
              steps,
              distanse,
              calories,
              elevation,
              veryActive,
              heartRate,
            })
            // debug('tracker')(`${new Date()}|${this.uuid} --> : (${data.length}) ${data.toString('hex')}`);
            // debug('tracker')(` time       : ${time}`);
            // debug('tracker')(` steps      : ${steps}`);
            // debug('tracker')(` distanse   : ${distanse}`);
            // debug('tracker')(` calories   : ${calories}`);
            // debug('tracker')(` elevation  : ${elevation}`);
            // debug('tracker')(` veryActive : ${veryActive}`);
            // debug('tracker')(` heartRate  : ${heartRate}`);
          })
        });
    });
  };
}

export default class FitbitLiveData extends EventEmitter {
  constructor(params) {
    super();
    this.trackerInfos = params;
    this.trackers = [];
  }

  scan() {
    noble.on('discover', (peripheral) => {
      if (peripheral.address !== 'unknown') debug('tracker')(peripheral.address);
      const trackers = this.trackerInfos.filter((info) => {
        return info.trackerId === peripheral.address;
      });
      if (trackers.length === 1) {
        console.log(`'${peripheral.address}' is discovered`);
        trackers[0].tracker = new Tracker(peripheral, trackers[0].auth);
        this.emit('discover', trackers[0].tracker);
        if (this.trackerInfos.filter((info) => {return !info.tracker;}).length === 0) noble.stopScanning();
        // connect(peripheral);
      }
    });
    
    if (noble.state === 'poweredOn') {
      debug('tracker')('already powered on.');
      debug('tracker')('start scanning...');
      noble.startScanning();
    } else {
      noble.on('stateChange', (state) => {
        if (state === 'poweredOn') {
          debug('tracker')('start scanning...');
          noble.startScanning();
        } else {
          noble.stopScanning();
        }
      });
    }
  }
}