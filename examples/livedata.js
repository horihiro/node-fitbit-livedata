const FitbitLiveData = require('..').default;

const fitbit = new FitbitLiveData([{
  trackerId: 'XX:XX:XX:XX:XX:XX',
  auth: {
    btleClientAuthCredentials: {
      authSubKey: '0123456789ABCDEF0123456789ABCDEF', // [\dA-F]{32}
      nonce: 900279863 // \d+
    }
  }
}]);
fitbit.scan();
fitbit.on('discover', (tracker) => {
  tracker.on('disconnect', (data) => {
    console.log('disconnect');
  });

  tracker.on('connect', (data) => {
    console.log('connect');
  });
  tracker.on('openSession', (data) => {
    console.log('openSession');
  });
  tracker.on('authenticate', (data) => {
    console.log('authenticate');
  });
  tracker.on('sendAuth', (data) => {
    console.log('sendAuth');
  });
  tracker.on('authenticated', (data) => {
    console.log('authenticated');
  });
  tracker.on('data', (livedata) => {
    console.log(livedata);
  });
  tracker.connect(true);
});
