const fitbit = require('..').default;
const fitbit2 = require('..').default;

fitbit.addAccount({
  username: 'FITBIT_COM_USER_NAME',
  password: 'FITBIT_COM_PASSWORD'
})
  .then((trackers) => {
    if (!trackers || !trackers.length || trackers.length < 1) {
      console.log('There is no trackers you can use.');
      process.exit(0);
      return;
    }
    fitbit.on('discover', (tracker) => {
      tracker.on('disconnect', (data) => {
        console.log('disconnect');
        tracker.connect();    
        console.log(fitbit2.trackerStatus);
      });
    
      tracker.on('connect', (data) => {
        console.log('connect');
        console.log(fitbit2.trackerStatus);
      });
      tracker.on('openSession', (data) => {
        console.log('openSession');
        console.log(fitbit2.trackerStatus);
      });
      tracker.on('authenticate', (data) => {
        console.log('authenticate');
        console.log(fitbit2.trackerStatus);
      });
      tracker.on('sendAuth', (data) => {
        console.log('sendAuth');
        console.log(fitbit2.trackerStatus);
      });
      tracker.on('authenticated', (data) => {
        console.log('authenticated');
        console.log(fitbit2.trackerStatus);
      });
      tracker.on('data', (livedata) => {
        console.log(livedata);
      });
      tracker.connect();
    });
    fitbit.on('error', (error) => {
      process.stderr.write(`${error}\n`);
      process.exit(1);
    });
    fitbit.scanTrackers();
  })
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
    return;
  });

