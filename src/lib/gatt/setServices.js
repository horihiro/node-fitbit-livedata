import os from 'os';
import yosemite from './mac/yosemite';

export default function() {
  const platform = os.platform();
  if (platform === 'darwin') {
    var osRelease = parseFloat(os.release());
    
    if (osRelease < 13  ) {
      throw new Error('Unsupported platform');
    } else if (osRelease < 14) {
      throw new Error('Unsupported platform');
    } else {
      return yosemite;
    }
  } else if (platform === 'linux' || platform === 'freebsd' || platform === 'win32') {
    throw new Error('Unsupported platform');
    // return require('./hci-socket/bindings');
  } else {
    throw new Error('Unsupported platform'); 
  }
};