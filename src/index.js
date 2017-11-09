import FitbitLiveData from './lib/fitbit-livedata';

process.env.NOBLE_MULTI_ROLE = 1;
export default new FitbitLiveData();
