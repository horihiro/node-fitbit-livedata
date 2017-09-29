const axios = require('axios');
const qs = require('querystring');

axios.defaults.baseURL = 'https://android-cdn-api.fitbit.com';

const SCOPE = 'activity heartrate location nutrition profile settings sleep social weight mfa_ok';
const GRANT_TYPE = 'password';
const AUTHORIZATION = 'Basic MjI4VlNSOjQ1MDY4YTc2Mzc0MDRmYzc5OGEyMDhkNmMxZjI5ZTRm'

const URL_OAUTH = 'https://android-api.fitbit.com/oauth2/token';
const PATH_DEVICES_TYPES = '/1.1/devices/types.json';
const PATH_USER_DEVICES = '/1/user/-/devices.json';
const PATH_GENBLECREDS = '/1/user/-/devices/tracker/generateBtleClientAuthCredentials.json';

export default (account) => {
  return Promise.resolve().then(() => {
    const params = qs.stringify({
      username: account.username,
      password: account.password,
      scope: SCOPE,
      grant_type: GRANT_TYPE
    });
    const options = {
      headers: {
        Authorization: AUTHORIZATION
      }
    };
    return axios.post(URL_OAUTH, params, options);
  }).then((res) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
    return Promise.all([
      axios.get(PATH_DEVICES_TYPES),
      axios.get(PATH_USER_DEVICES)
    ]);
  }).then((res) => {
    const devicesTypes = res[0].data.deviceTypes;
    const userDevices = res[1].data;
    const requests = userDevices.map((device) => {
      const serialNumber = device.wireId;
      const address = device.mac.match(/.{2}/g).reverse().join(':');
      const metadata = devicesTypes.filter((deviceType) => {
        return deviceType.name === device.deviceVersion;
      });
      const params = qs.stringify({
        serialNumber: device.wireId
      });
      return axios.post(PATH_GENBLECREDS, params)
        .then((res2) => {
          const auth = res2.data;
          if (metadata.length === 1) {
            auth.type = metadata[0].authType;
          }

          return {
            auth,
            serialNumber,
            address
          }
        });
    });
    return Promise.all(requests);
  }).catch((ex) => {
    console.log(ex);
  });
};
