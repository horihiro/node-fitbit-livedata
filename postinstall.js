if (process.platform.toLowerCase() !== 'linux') process.exit(0);

const fs = require('fs');

const TARGET = './node_modules/bleno/lib/hci-socket/bindings.js';

const readFileAsync = path => new Promise((resolve, reject) => {
  fs.readFile(path, (err, data) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(data.toString());
  });
});

const renameFileAsync = (oldpath, newpath) => new Promise((resolve, reject) => {
  fs.rename(oldpath, newpath, (err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

const writeFileAsync = (path, content) => new Promise((resolve, reject) => {
  fs.writeFile(path, content, 'utf8', (err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

renameFileAsync(TARGET, `${TARGET}.orig`)
  .then(() => readFileAsync(`${TARGET}.orig`))
  .then((content) => {
    const lines = content.split(/\n/);
    const heads = [];
    const tails = [];
    while(true) {
      heads.push(lines.shift());
      if (lines.length === 81) break;
    }
    lines.reverse();
    while(true) {
      tails.push(lines.shift());
      if (lines.length === 4) break;
    }
    tails.reverse();
    lines.reverse();
    return heads.concat(lines.map(line => `// ${line}`)).concat(tails).join('\n');
  })
  .then(content => writeFileAsync(TARGET, content))
  .catch((err) => {
    console.error(err);
  });