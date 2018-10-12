const fetch = require("node-fetch");
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib') // v3.x.x
const bitcoinMessage = require('bitcoinjs-message')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test_newMessageAfterUse() {
    console.log('started test_newMessageAfterUse()');
    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });
    let hashes = [];

    // first star
    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    let firstMessage = json.message;

    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

    let expectedTimestamp = json.requestTimeStamp;
    let expectedMessage = address + ':' + json.requestTimeStamp + ':starRegistry';
    let signature = bitcoinMessage.sign(json.message, keyPair.privateKey, keyPair.compressed)

    body = JSON.stringify({ address: address, signature: signature });
    response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.ok(json.registerStar);
    assert.equal(json.status.address, address);
    assert.equal(json.status.requestTimeStamp, expectedTimestamp);
    assert.equal(json.status.message, expectedMessage);
    assert.ok(parseInt(json.status.validationWindow) <= 300);
    assert.equal(json.status.messageSignature, 'valid');

    await sleep(2000);

    // second star
    body = JSON.stringify({ address: address });
    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    let secondMessage = json.message;

    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');
    assert.notEqual(firstMessage, secondMessage);

    expectedTimestamp = json.requestTimeStamp;
    expectedMessage = address + ':' + json.requestTimeStamp + ':starRegistry';
    signature = bitcoinMessage.sign(json.message, keyPair.privateKey, keyPair.compressed)

    body = JSON.stringify({ address: address, signature: signature });
    response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.status, 200);
    assert.ok(json.registerStar);
    assert.equal(json.status.address, address);
    assert.equal(json.status.requestTimeStamp, expectedTimestamp);
    assert.equal(json.status.message, expectedMessage);
    assert.ok(parseInt(json.status.validationWindow) <= 300);
    assert.equal(json.status.messageSignature, 'valid');

    // done
    console.log('successfully finished test_newMessageAfterUse()');
}


async function runTests() {
    await test_newMessageAfterUse();
}

runTests();
