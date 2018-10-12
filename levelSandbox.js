"use strict";

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

function store(key, value) {
  return db.put(key, value);
}

function load(key) {
  return db.get(key);
}

function remove(key) {
  return db.del(key);
}

function getBlockHeight() {
  return new Promise(resolve => {
    let i = 0;
    db.createReadStream()
      .on('data', function(data) {
          if (!data.key.startsWith('star_registration')) {
            i++;
          }
        }).on('error', function(err) {
          resolve(0);
        }).on('close', function() {
          resolve(i);
        });
  });
}

function print() {
    db.createReadStream()
      .on('data', function(data) {
        console.log(JSON.parse(data.value));
      });
}

function printRaw() {
  db.createReadStream()
    .on('data', function(data) {
      console.log(data);
    });
}

module.exports = {
  load: load,
  store: store,
  remove: remove,
  getBlockHeight: getBlockHeight,
  print: print,
  printRaw: printRaw
}
