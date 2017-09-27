const FitbitLiveData = require('..').default;

const fitbit = new FitbitLiveData({
  username: 'FITBIT_COM_USER_NAME',
  password: 'FITBIT_COM_PASSWORD'
});

fitbit.scan();
fitbit.on('discover', (tracker) => {
  tracker.on('disconnect', (data) => {
    console.log('disconnect');
    tracker.connect();    
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
  tracker.connect();
});
