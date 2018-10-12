"use strict";

const SHA256 = require('crypto-js/sha256');
const Block = require('./simpleChain.js').Block;
const Blockchain = require('./simpleChain.js').Blockchain;
const levelSandbox = require('./levelSandbox.js');

// test generation of blockchain
console.log('create Blockchain object');
var blockchain = new Blockchain();
console.log('add eleven blocks');
for (var i = 0; i <= 10; i++) {
  blockchain.addBlock(new Block("test data " + i))
}

// test
let threshold = 10;
setTimeout(checkForError, 3000);

async function checkForError() {
  let height = await blockchain.getBlockHeight();
  console.log('height is ' + height + ', that is the bestblock has height ' + (height - 1) + ' and the next block will have this height of ' + height);

  if (height < 12) {
    threshold -= 1;
    if (threshold < 0) {
      await blockchain.validateChain();
      return;
    }
    setTimeout(checkForError, 1000);
  } else {
    await blockchain.validateChain();

    console.log('now invalidate hashes of blocks 5 (which also invalidates the backlink of block 6) and 12');

    // let block = await blockchain.getBlock(3);
    // block.previousHash = 'rrr';
    // block.hash = '';
    // block.hash = SHA256(JSON.stringify(block)).toString();
    //await levelSandbox.store(block.height, JSON.stringify(block));

    let block = await blockchain.getBlock(5);
    block.hash = 'qqq';
    await levelSandbox.store(block.height, JSON.stringify(block));

    block = await blockchain.getBlock(11);
    block.hash = 'ppp';
    await levelSandbox.store(block.height, JSON.stringify(block));

    await blockchain.validateChain();
  }
}
