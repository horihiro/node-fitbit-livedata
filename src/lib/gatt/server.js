import EventEmitter from 'events';
import Noble from 'noble/lib/noble';
import resolveBindings from 'noble/lib/resolve-bindings';
import setServices from './setServices';

class PrimaryService extends EventEmitter {
  constructor(options) {
    super();
    this.uuid = options.uuid.replace(/-/g, '');
    this.characteristics = options.characteristics || [];
  }

  toString() {
    return JSON.stringify({
      uuid: this.uuid,
      characteristics: this.characteristics
    });
  }
}

class Characteristic extends EventEmitter {
  constructor(options) {
    super();

    this.uuid = options.uuid.replace(/-/g, '');
    this.properties = options.properties || [];
    this.secure = options.secure || [];
    this.value = options.value || null;
    this.descriptors = options.descriptors || [];
  
    if (this.value && (this.properties.length !== 1 || this.properties[0] !== 'read')) {
      throw new Error('Characteristics with value can be read only!');
    }
  
    if (options.onReadRequest) {
      this.onReadRequest = options.onReadRequest;
    }
  
    if (options.onWriteRequest) {
      this.onWriteRequest = options.onWriteRequest;
    }
  
    if (options.onSubscribe) {
      this.onSubscribe = options.onSubscribe;
    }
  
    if (options.onUnsubscribe) {
      this.onUnsubscribe = options.onUnsubscribe;
    }
  
    if (options.onNotify) {
      this.onNotify = options.onNotify;
    }
  
    if (options.onIndicate) {
      this.onIndicate = options.onIndicate;
    }
  
    this.on('readRequest', this.onReadRequest.bind(this));
    this.on('writeRequest', this.onWriteRequest.bind(this));
    this.on('subscribe', this.onSubscribe.bind(this));
    this.on('unsubscribe', this.onUnsubscribe.bind(this));
    this.on('notify', this.onNotify.bind(this));
    this.on('indicate', this.onIndicate.bind(this));
  }

  toString() {
    return JSON.stringify({
      uuid: this.uuid,
      properties: this.properties,
      secure: this.secure,
      value: this.value,
      descriptors: this.descriptors
    });  
  }

  onReadRequest(offset, callback) {
    callback(this.RESULT_UNLIKELY_ERROR, null);
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    callback(this.RESULT_UNLIKELY_ERROR);
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    this.maxValueSize = maxValueSize;
    this.updateValueCallback = updateValueCallback;
  }

  onUnsubscribe() {
    this.maxValueSize = null;
    this.updateValueCallback = null;
  }

  onNotify() {
  }

  onIndicate() {
  }
}

const bindings = resolveBindings();

bindings.setServices = setServices();

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

Noble.prototype.setServices = function (services, callback) {
  this._bindings.setServices(services);
  if (callback) {
    this.once('servicesSet', callback);
  }
};

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
const noble = new Noble(bindings);
noble.on('stateChange', (state) => {
  if (state === 'poweredOn') noble.setServices([primaryService]);
});

export default noble;
