"use strict";

const express = require('express')
const app = express()
const Blockchain = require('./simpleChain.js').Blockchain;
const Block = require('./simpleChain.js').Block;
const levelSandbox = require('./levelSandbox.js');
const bitcoinMessage = require('bitcoinjs-message');

// 5 minutes = 300 seconds
var validationWindow = 5 * 60;

app.use(express.json());

let blockchain = new Blockchain();

async function getBlockFromBlockchainByHeight(blockheight) {
  return await blockchain.getBlock(blockheight);
}

async function getBlock(req, res) {
  let blockheight = req.params['blockheight'];
  let block = await getBlockFromBlockchainByHeight(blockheight);
  if (block) {
    try {
      block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
    } catch (error) {
      // noop
    }
    res.send(block);
  } else {
    res.status(404).send({error: 'block ' + blockheight + ' not found'});
  }
}

async function postBlock(req, res) {
  if (!req.body.address) {
    console.log('Error: request contains no address in body');
    res.status(400).send({error: 'no address provided'});
    return;
  }

  if (!req.body.star) {
    console.log('Error: request contains no star object in body');
    res.status(400).send({error: 'no star data provided'});
    return;
  }

  if (!req.body.star.ra) {
    console.log('Error: request contains no right ascension in star object');
    res.status(400).send({error: 'no right ascension in star data provided'});
    return;
  }

  if (!req.body.star.dec) {
    console.log('Error: request contains no declination in star object');
    res.status(400).send({error: 'no declination in star data provided'});
    return;
  }

  if (!req.body.star.story) {
    console.log('Error: request contains no story in star object');
    res.status(400).send({error: 'no story in star data provided'});
    return;
  }

  req.body.star.story = Buffer.from(req.body.star.story).toString('hex');

  if (Buffer.byteLength(req.body.star.story) > 500) {
    console.log('Error: request contains a story with more than 500 bytes length in star object');
    res.status(400).send({error: 'story with more than 500 bytes length provided'});
    return;
  }

  let grant = await levelSandbox.load("star_registration_granted_" + req.body.address);

  if (!grant) {
    res.status(401).send({error: 'not authorized to register a star'});
    return;
  }

  if (grant !== '0') {
    res.status(403).send({error: 'you are only allowed to register one star, and you already have'});
    return;
  }

  let newBlock = await blockchain.addBlock(new Block(req.body));
  let registrationTimestamp = new Date().getTime().toString().slice(0,-3);
  await levelSandbox.store("star_registration_granted_" + req.body.address, registrationTimestamp);

  res.send(newBlock);
}

async function requestValidation(req, res) {
  if (!req.body.address) {
    console.log('ERROR: Error: request contains no address in body');
    res.status(400).send({error: 'no address provided'});
    return;
  }

  let address = req.body.address;
  let requestTimestamp = new Date().getTime().toString().slice(0,-3);
console.log('DEBUG: requestTimestamp: ' + requestTimestamp);
  let storedTimestamp = '0';
  
console.log('DEBUG: loading star_registration_request_' + address);
  try {
    storedTimestamp = await levelSandbox.load("star_registration_request_" + address);
  } catch (error) {
    if (error.name === 'NotFoundError') {
console.log('DEBUG: star_registration_request_' + address + ' not found');
      // address not found, this is the first validation message request, just go ahead
    } else {
      res.status(500).send({error: 'technical error'});
      return;
    }
  }

  let requestTimestampInt = parseInt(requestTimestamp);
  let storedTimestampInt = parseInt(storedTimestamp);
  let remainingValidationWindow = validationWindow - (requestTimestampInt - storedTimestampInt);

  if (remainingValidationWindow > 0) {
    console.log('INFO : validation window still valid');
    let message = address + ":" + storedTimestamp + ":starRegistry";

    res.send({
      "address": address,
      "requestTimeStamp": storedTimestamp,
      "message": message,
      "validationWindow": remainingValidationWindow
    });

    return;
  } else {
    console.log('INFO : validation window exceeded, starting a new one');
  }
  
  let message = address + ":" + requestTimestamp + ":starRegistry";

console.log('DEBUG: store star_registration_request_' + address + ': ' + requestTimestamp);
  await levelSandbox.store("star_registration_request_" + address, requestTimestamp);
console.log('DEBUG: remove star_registration_granted_' + address);
  await levelSandbox.remove("star_registration_granted_" + address);

  res.send({
    "address": address,
    "requestTimeStamp": requestTimestamp,
    "message": message,
    "validationWindow": validationWindow
  });
}

async function messageSignatureValidation(req, res) {
  let requestTimestamp = new Date().getTime().toString().slice(0,-3);
  let address = req.body.address;
  let signature = req.body.signature;
  let storedTimestamp;

  try {
console.log('DEBUG: loading star_registration_request_' + address);
    storedTimestamp = await levelSandbox.load("star_registration_request_" + address);

    if (!storedTimestamp) {
      console.log('ERROR: Error: address ' + address + ' has no timestamp in database (key: star_registration_request_' + address + ')');
      res.status(500).send({error: 'technical error'});
      return;
    } else {
      console.log('INFO : stored timestamp found: ' + storedTimestamp);
    }
  } catch (error) {
    if (error.name === 'NotFoundError') {
      console.log('ERROR: Error: address ' + address + ' not found in database (key: star_registration_request_' + address + ')');
      res.status(400).send({error: 'You need to request for validation first, please use the path /requestValidation to request a validation message.'});
      return;
    } else {
      console.log(error);
      res.status(500).send({error: 'technical error'});
      return;
    }
  }

  let requestTimestampInt = parseInt(requestTimestamp);
  let storedTimestampInt = parseInt(storedTimestamp);
  let remainingValidationWindow = validationWindow - (requestTimestampInt - storedTimestampInt);

  if (remainingValidationWindow <= 0) {
    console.log('INFO : signature validation request was not within validation window (' + Math.abs(remainingValidationWindow) + ' seconds too late)');
    res.status(400).send({error: 'Your validation window has expired, please use the path /requestValidation again to request a new validation message.'});
    return;
  } else {
    console.log('INFO : signature validation request was within validation window (' + remainingValidationWindow + ' seconds left)');
  }

  let message = address + ":" + storedTimestamp + ":starRegistry";
  let signatureValid = false;

  try {
    signatureValid = bitcoinMessage.verify(message, address, signature);
  } catch (error) {
    console.log(error);
    signatureValid = false;
  }

  if (!signatureValid) {
    console.log('ERROR: Error: invalid signature provided:');
    console.log('ERROR: message : ' + message);
    console.log('ERROR: address : ' + address);
    console.log('ERROR: signature: ' + signature);
    res.status(400).send({error: 'The signature could not be verified.'});
    return;
  }

console.log('DEBUG: store star_registration_granted_' + address + ': 0');
  await levelSandbox.store("star_registration_granted_" + address, '0');
console.log('DEBUG: removing star_registration_request_' + address);
  await levelSandbox.remove("star_registration_request_" + address);

  res.send({
    "registerStar": true,
    "status": {
      "address": address,
      "requestTimeStamp": storedTimestamp,
      "message": message,
      "validationWindow": remainingValidationWindow,
      "messageSignature": "valid"
    }
  });
}

async function getStar(req, res) {
  let path = req.params['data'];
  let index = path.indexOf(':');
  let identifier = path.substring(0, index);
  let data = path.substring(index + 1);

  if (identifier === 'address') {
    return getStarsByAddress(data, res);
  } else if (identifier === 'hash') {
    return getStarByHash(data, res);
  } else {
    console.log('Error cannot understand request');
    console.log('path part: ' + path);
    console.log('identifier: ' + identifier);
    console.log('data: ' + data);
    res.status(404).send({error: 'cannot understand request part: ' + path});
  }
}

async function getStarsByAddress(address, res) {
  console.log('look for address ' + address);

  let blockheight = await blockchain.getBlockHeight() - 1;
  let block = await blockchain.getBlock(blockheight);
  let run = true;
  let blocks = [];

  while (run) {
    if (block.body.address === address) {
      block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
      blocks.push(block);
    }

    if (block.previousBlockHash === '') {
      run = false;
    } else {
      blockheight = blockheight - 1;
      block = await blockchain.getBlock(blockheight);
    }
  }

  if (blocks.length > 0) {
    res.send(blocks);
  } else {
    res.status(404).send({error: 'no stars found for address ' + address});
  }
}

async function getStarByHash(hash, res) {
  console.log('look for hash ' + hash);

  let blockheight = await blockchain.getBlockHeight() - 1;
  let block = await blockchain.getBlock(blockheight);
  let run = true;
  let foundBlock;

  while (run) {
    if (block.hash === hash) {
      block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
      foundBlock = block
      run = false
    }

    if (block.previousBlockHash === '') {
      run = false;
    } else {
      blockheight = blockheight - 1;
      block = await blockchain.getBlock(blockheight);
    }
  }

  if (foundBlock) {
    res.send(foundBlock);
  } else {
    res.status(404).send({error: 'no star found for hash ' + hash});
  }
}

// app routes
app.get('/block/:blockheight', getBlock);
app.post('/block', postBlock);
app.post('/requestValidation', requestValidation);
app.post('/message-signature/validate', messageSignatureValidation);
app.get('/stars/:data', getStar);

app.post('/test/validationWindow', function(req, res) { // only for testing
  validationWindow = req.body.validationWindow;
  res.status(204).send();
});

app.listen(8000, () => console.log('Example app listening on port 8000!'))
