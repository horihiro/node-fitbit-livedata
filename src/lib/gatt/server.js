import EventEmitter from 'events';
import bleno from 'bleno';

export default class GattServer extends EventEmitter {
  launch() {
    const UUID_SERVICE_NOTIFICATION_CENTER = '16bcfd00-253f-c348-e831-0db3e334d580';
    const UUID_CHARACTERISTICS_NOTIFICATION_SOURCE = '16bcfd02-253f-c348-e831-0db3e334d580';
    
    const primaryService = new bleno.PrimaryService({
        uuid: UUID_SERVICE_NOTIFICATION_CENTER, // or 'fff0' for 16-bit
        characteristics: [
          new bleno.Characteristic({
            uuid: UUID_CHARACTERISTICS_NOTIFICATION_SOURCE,
            properties: [ 'notify' ],
            secure: [],
            value: null,
            descriptors: [
            ],
            onReadRequest: null, 
            onWriteRequest: null,
            onSubscribe: null,
            onUnsubscribe: null,
            onNotify: null,
            onIndicate: null
          }),
        ]
    });

    const onComplete = (error) => {
      if (error) this.emit('error', error);
      else this.emit('complete')
    };

    if (bleno.state === 'poweredOn') {
      bleno.setServices([primaryService], onComplete);
    } else {
      bleno.on('stateChange', (state) => {
        if (state === 'poweredOn') {
          bleno.setServices([primaryService], onComplete);
        }
      });
    }
  }
};