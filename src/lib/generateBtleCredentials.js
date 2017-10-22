const axios = require('axios');
const qs = require('querystring');

axios.defaults.baseURL = 'https://android-cdn-api.fitbit.com';

const SCOPE = '';// activity heartrate location nutrition profile settings sleep social weight mfa_ok';
const GRANT_TYPE_AUTHCODE = 'authorization_code';
const GRANT_TYPE_PASSWORD = 'password';
const REDIRECT_URI = 'https://horihiro.github.io/node-fitbit-livedata/';
const AUTHORIZATION = 'Basic MjI4VlNSOjQ1MDY4YTc2Mzc0MDRmYzc5OGEyMDhkNmMxZjI5ZTRm';

const URL_OAUTH = 'https://android-api.fitbit.com/oauth2/token';
const PATH_DEVICES_TYPES = '/1.1/devices/types.json';
const PATH_USER_DEVICES = '/1/user/-/devices.json';
const PATH_GENBLECREDS = '/1/user/-/devices/tracker/generateBtleClientAuthCredentials.json';

export default (accounts) => {
  const accountArray = (() => (accounts instanceof Array ? accounts : [accounts]))();
  return Promise.all(accountArray.map((account) => {
    const params = (() => {
      const queries = {
        scope: SCOPE,
      };
      if (account.username && account.password) {
        queries.username = account.username;
        queries.password = account.password;
        queries.grant_type = GRANT_TYPE_PASSWORD;
      } else if (account.authCode) {
        queries.code = account.authCode;
        queries.redirect_uri = REDIRECT_URI;
        queries.grant_type = GRANT_TYPE_AUTHCODE;
      } else {
        return null;
      }
      return qs.stringify(queries);
    })();
    if (!params) return null;
    const options = {
      headers: {
        Authorization: AUTHORIZATION,
      },
    };
    return axios.post(URL_OAUTH, params, options);
  })).then((responses) => {
    const tokens = responses.map(response => response.data.access_token);
    const promises = tokens.map(token => axios.get(PATH_USER_DEVICES, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }));
    promises.push(axios.get(PATH_DEVICES_TYPES, {
      headers: {
        Authorization: `Bearer ${tokens[0]}`,
      },
    }));
    return Promise.all(promises).then(results => ({
      responses: results,
      tokens,
    }));
  }).then((results) => {
    const devicesTypes = results.responses.pop().data.deviceTypes;
    const { tokens } = results;
    const allDevices = results.responses.reduce((prev, curr, index) => {
      const userDevices = curr.data;
      return prev.concat(userDevices.map((device) => {
        const serialNumber = device.wireId;
        const address = device.mac.match(/.{2}/g).reverse().join(':');
        const metadata = devicesTypes.filter(type => type.name === device.deviceVersion);
        const params = qs.stringify({
          serialNumber: device.wireId,
        });
        return axios.post(PATH_GENBLECREDS, params, {
          headers: {
            Authorization: `Bearer ${tokens[index]}`,
          },
        })
          .then((res2) => {
            const auth = res2.data;
            if (metadata.length === 1) {
              auth.type = metadata[0].authType;
            }

            return {
              name: metadata[0].name,
              auth,
              serialNumber,
              address,
            };
          });
      }));
    }, []);
    return Promise.all(allDevices);
  });
};
