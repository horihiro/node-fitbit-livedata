# node-fitbit-livedata
This project aims to getting `livedata` from Fitbit tracker

## !!! CAUTION !!!
This is an **UNOFFICIAL** and **EXPERIMENTAL** module.

Using this module sometimes forcibly logs out from fitbit application on your mobile device.

## Requirement
- Host Machine
    - macOS El Capitan
    - Windows10 Creators Update or later
    - Raspbian 4.9
- Runtime
    - node.js (v6 or later)
    - Java (v1.8.0 or later)
- Fitbit Account
- Fitbit Tracker(Device) registered in the above account
    - Ionic
    - Charge HR

## Remarks
### for Mac
Using this module on macOS, you need to use a tracker which you have connected to your macOS previously.

### for Windows
Because of using [noble-uwp](https://github.com/jasongin/noble-uwp) (it's very useful !), the version of your windows has to be Creators Update or later.<br>
And this module on Windows can't get heart rate from your trackers.

### for Raspbian
If you want to get heart rate from your trackers, you need to comment out [the line](https://github.com/sandeepmistry/bleno/blob/master/lib/hci-socket/bindings.js#L137) in `node_modules/bleno/lib/hci-socket/bindings.js` ([bleno's issue](https://github.com/sandeepmistry/bleno/issues/326))

### for Fitbit Trackers
\# 2017/11/17 updated

This module doesn't work for the following trackers.

- ~~Fitbit Ionic~~

The following trackers are not verified yet.<br>
\# I don't have them

- Charge 2
- Alta HR
- Blaze
- Flyer
- Flex 2
- Surge
- Charge
- Flex
- One
- Zip
- Ultra
- Force
- Aria 2


## Install
This moudle is not published on npm yet.
So you have to clone this project at first.

```
$ git clone https://github.com/horihiro/node-fitbit-livedata.git
$ cd node-fitbit-livedata
```

### Install as library

```
$ npm i .
```

### Install as CLI tool

```
$ npm i . -g
```

## Usage

### Usage as library

```javascript
import fitbit from 'fitbit-livedata';

fitbit.on('discover', (tracker) => {
  tracker.on('disconnected', (data) => {
    console.log('tracker is disconnected.');

    // if you want to re-connect automatically.
    tracker.connect();    
  });

  tracker.on('connecting', (data) => {
    console.log('connecting to the tracker');
  });
  tracker.on('connected', (data) => {
    console.log('tracker is connected.');
  });
  tracker.on('openingSession', (data) => {
    console.log('start tracker session');
  });
  tracker.on('authenticating', (data) => {
    console.log('start tracker authention.');
  });
  tracker.on('sendAuth', (data) => {
    console.log('start tracker authention.');
  });
  tracker.on('authenticated', (data) => {
    debug('tracker')('authenticated');
  });
  tracker.on('data', (livedata) => {
    process.stdout.write(`${JSON.stringify(livedata)}\n`);
  });
  tracker.connect();
});
fitbit.on('error', (error) => {
  console.error(`${error}\n`);
  process.exit(1);
});

const accounts = [
  {
    username: fitbitUser1_Username,
    password: fitbitUser1_Password
  },
  {
    username: fitbitUser2_Username,
    password: fitbitUser2_Password
  },
//  :
];
const trackers = [];

accounts.reduce((prev, curr) => {
  return prev.then(() => {
    return new Promise((resolve) => {
      fitbit.getTrackers(curr)
        .then((trackerInfos) => {
          // login succeeded
          trackerInfos.forEach((trackerInfo) => {
            trackers.push(trackerInfo);
          });
          console.log(`${trackersInfos}\n`);
          resolve();
        })
        .catch((err) => {
          // login failed
          console.error(`login failed\n`);
          console.error(`${err}\n`);
          resolve();
        });
    });
  });
}, Promise.resolve()).then(() => {
  fitbit.scanTrackers(trackers);
});
```

### Usage as CLI tool

```sh
$ fitbit-livedata -u <USERNAME> -p <PASSWORD>
{"device":{"name":"Charge HR","address":"XX:XX:XX:XX:XX:XX","serialNumber":"0123456789ab"},"livedata":{"time":"YYYY-MM-DDThh:mm:dd.sssZ","steps":5700,"distance":4024236,"calories":1220,"elevation":13,"veryActive":2,"heartRate":80}}
{"device":{"name":"Charge HR","address":"XX:XX:XX:XX:XX:XX","serialNumber":"0123456789ab"},"livedata":{"time":"YYYY-MM-DDThh:mm:dd.sssZ","steps":5700,"distance":4024236,"calories":1220,"elevation":13,"veryActive":2,"heartRate":82}}
 :
```

## Memo
### Sequence Diagram between host, tracker and fitbit.com
![sequence.png](./sequence.png)

[Japanese memo on Qiita](https://qiita.com/horihiro/items/03c4bef3e71539eddaad)
