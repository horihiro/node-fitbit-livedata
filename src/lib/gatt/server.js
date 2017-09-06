import os from 'os';
import noble from 'noble';

const UUID_SERVICE_NOTIFICATION_CENTER = '16bcfd00-253f-c348-e831-0db3e334d580';
// const UUID_CHARACTERISTICS_CONTROL_POINT = '16bcfd01-253f-c348-e831-0db3e334d580';
const UUID_CHARACTERISTICS_NOTIFICATION_SOURCE = '16bcfd02-253f-c348-e831-0db3e334d580';
// const UUID_CHARACTERISTICS_DATA_SOURCE = '16bcfd03-253f-c348-e831-0db3e334d580';
// const UUID_CHARACTERISTICS_LOCATION_SOURCE = '16bcfd04-253f-c348-e831-0db3e334d580';

const onReadRequest = function(offset, callback) {
  console.log(`onReadRequest: ${this.uuid}`);
}

const onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log(`onWriteRequest: ${this.uuid}`);
}

const onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log(`onSubscribe: ${this.uuid}`);
}

const onUnsubscribe = function() {
  console.log(`onUnsubscribe: ${this.uuid}`);
}

const onNotify = function() {
  console.log(`onNotify: ${this.uuid}`);
}

const onIndicate = function() {
  console.log(`onIndicate: ${this.uuid}`);
}

Object.getPrototypeOf(noble).setServices = function (services, callback) {
  if (!this._blenoBindings) {
    this.rssi = 0;
    this.mtu = 20;
    const platform = os.platform();
    if (platform === 'darwin') {
      this._blenoBindings = require('./mac/bindings');
    } else if (platform === 'linux' || platform === 'freebsd' || platform === 'win32' || platform === 'android') {
      this._blenoBindings = require('./hci-socket/bindings');
    } else {
      throw new Error('Unsupported platform');
    }
    this._blenoBindings.on('stateChange', () => {
      this._blenoBindings.setServices(services);
    });
    this._blenoBindings.init();
  } else {
    this._blenoBindings.setServices(services);
  }
  if (callback) {
    this.once('servicesSet', callback);
  }
};

const PrimaryService = require('./primary-service');
const Characteristic = require('./characteristic');
const primaryService = new PrimaryService({
  uuid: UUID_SERVICE_NOTIFICATION_CENTER,
  characteristics: [
    // new Characteristic({
    //   uuid: UUID_CHARACTERISTICS_CONTROL_POINT,
    //   properties: [ 'write' ],
    //   secure: [],
    //   value: null,
    //   descriptors: [
    //   ],
    //   onReadRequest: onReadRequest,
    //   onWriteRequest: onWriteRequest,
    //   onSubscribe: onSubscribe,
    //   onUnsubscribe: onUnsubscribe,
    //   onNotify: onNotify,
    //   onIndicate: onIndicate
    // }),
    new Characteristic({
      uuid: UUID_CHARACTERISTICS_NOTIFICATION_SOURCE,
      properties: [ 'notify' ],
      secure: [],
      value: null,
      descriptors: [
      ],
      onReadRequest: onReadRequest,
      onWriteRequest: onWriteRequest,
      onSubscribe: onSubscribe,
      onUnsubscribe: onUnsubscribe,
      onNotify: onNotify,
      onIndicate: onIndicate
    }),
    // new Characteristic({
    //   uuid: UUID_CHARACTERISTICS_DATA_SOURCE,
    //   properties: [ 'notify' ],
    //   secure: [],
    //   value: null,
    //   descriptors: [
    //   ],
    //   onReadRequest: onReadRequest,
    //   onWriteRequest: onWriteRequest,
    //   onSubscribe: onSubscribe,
    //   onUnsubscribe: onUnsubscribe,
    //   onNotify: onNotify,
    //   onIndicate: onIndicate
    // }),
    // new Characteristic({
    //   uuid: UUID_CHARACTERISTICS_LOCATION_SOURCE,
    //   properties: [ 'notify', 'read' ],
    //   secure: [],
    //   value: null,
    //   descriptors: [
    //   ],
    //   onReadRequest: onReadRequest,
    //   onWriteRequest: onWriteRequest,
    //   onSubscribe: onSubscribe,
    //   onUnsubscribe: onUnsubscribe,
    //   onNotify: onNotify,
    //   onIndicate: onIndicate
    // }),
  ]
});
noble.setServices([primaryService], (err) => {
});
export default class GattServer {
}