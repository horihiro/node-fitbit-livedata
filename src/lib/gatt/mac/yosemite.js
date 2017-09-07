export default function(services) {
  this.sendCBMsg(12, null); // remove all services
  services = services || [];
  var attributeId = 1;

  this._attributes = [];
  this._setServicesError = undefined;

  if (services.length) {
    for (var i = 0; i < services.length; i++) {
      var service = services[i];

      var arg = {
        kCBMsgArgAttributeID: attributeId,
        kCBMsgArgAttributeIDs: [],
        kCBMsgArgCharacteristics: [],
        kCBMsgArgType: 1, // 1 => primary, 0 => included
        kCBMsgArgUUID: new Buffer(service.uuid, 'hex')
      };

      this._attributes[attributeId] = service;

      this._lastServiceAttributeId = attributeId;
      attributeId++;

      for (var j = 0; j < service.characteristics.length; j++) {
        var characteristic = service.characteristics[j];

        var properties = 0;
        var permissions = 0;

        if (characteristic.properties.indexOf('read') !== -1) {
          properties |= 0x02;

          if (characteristic.secure.indexOf('read') !== -1) {
            permissions |= 0x04;
          } else {
            permissions |= 0x01;
          }
        }

        if (characteristic.properties.indexOf('writeWithoutResponse') !== -1) {
          properties |= 0x04;

          if (characteristic.secure.indexOf('writeWithoutResponse') !== -1) {
            permissions |= 0x08;
          } else {
            permissions |= 0x02;
          }
        }

        if (characteristic.properties.indexOf('write') !== -1) {
          properties |= 0x08;

          if (characteristic.secure.indexOf('write') !== -1) {
            permissions |= 0x08;
          } else {
            permissions |= 0x02;
          }
        }

        if (characteristic.properties.indexOf('notify') !== -1) {
          if (characteristic.secure.indexOf('notify') !== -1) {
            properties |= 0x100;
          } else {
            properties |= 0x10;
          }
        }

        if (characteristic.properties.indexOf('indicate') !== -1) {
          if (characteristic.secure.indexOf('indicate') !== -1) {
            properties |= 0x200;
          } else {
            properties |= 0x20;
          }
        }

        var characteristicArg = {
          kCBMsgArgAttributeID: attributeId,
          kCBMsgArgAttributePermissions: permissions,
          kCBMsgArgCharacteristicProperties: properties,
          kCBMsgArgData: characteristic.value,
          kCBMsgArgDescriptors: [],
          kCBMsgArgUUID: new Buffer(characteristic.uuid, 'hex')
        };

        this._attributes[attributeId] = characteristic;

        for (var k = 0; k < characteristic.descriptors.length; k++) {
          var descriptor = characteristic.descriptors[k];

          characteristicArg.kCBMsgArgDescriptors.push({
            kCBMsgArgData: descriptor.value,
            kCBMsgArgUUID: new Buffer(descriptor.uuid, 'hex')
          });
        }

        arg.kCBMsgArgCharacteristics.push(characteristicArg);

        attributeId++;
      }
      this.sendCBMsg(10, arg);
    }
  } else {
    this.emit('servicesSet');
  }
};
