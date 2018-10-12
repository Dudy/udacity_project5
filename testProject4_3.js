const fetch = require("node-fetch");
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib') // v3.x.x
const bitcoinMessage = require('bitcoinjs-message')

async function test_postStarData_good() {
    console.log('started test_postStarData_good()');
    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });
    let hashes = [];

    // first star
    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
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

    let star = {
        dec: 'dec1',
        ra: 'ra1',
        mag: 'mag1',
        con: 'con1',
        story: 'story1'
    };
    body = JSON.stringify({ address: address, star: star });
    response = await fetch('http://localhost:8000/block', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    hashes.push(json.hash);
    assert.equal(response.status, 200);

    // second star
    body = JSON.stringify({ address: address });
    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

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

    star = {
        dec: 'dec2',
        ra: 'ra2',
        mag: 'mag2',
        con: 'con2',
        story: 'story2'
    };
    body = JSON.stringify({ address: address, star: star });
    response = await fetch('http://localhost:8000/block', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    hashes.push(json.hash);
    assert.equal(response.status, 200);

    // read stars
    response = await fetch('http://localhost:8000/stars/address:' + address, { method: 'GET', headers: {"Content-Type": "application/json"} });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.ok(hashes.indexOf(json[0].hash) > -1);
    assert.ok(hashes.indexOf(json[1].hash) > -1);

    // done
    console.log('successfully finished test_postStarData_good()');
}

async function test_getByHash() {
    console.log('started test_getByHash()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    // first star
    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
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

    let star = {
        dec: 'dec1',
        ra: 'ra1',
        mag: 'mag1',
        con: 'con1',
        story: 'story1'
    };
    body = JSON.stringify({ address: address, star: star });
    response = await fetch('http://localhost:8000/block', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    let hash = json.hash;

    // read single star by hash
    response = await fetch('http://localhost:8000/stars/hash:' + hash, { method: 'GET', headers: {"Content-Type": "application/json"} });
    json = await response.json();
    assert.equal(hash, json.hash);

    // done
    console.log('successfully finished test_getByHash()');
}

async function test_badRequest1() {
    console.log('started test_badRequest1()');

    let response = await fetch('http://localhost:8000/stars/unknown:data', { method: 'GET', headers: {"Content-Type": "application/json"} });
    let json = await response.json();
    assert.equal(json.error, 'cannot understand request part: unknown:data');

    // done
    console.log('successfully finished test_badRequest1()');
}

async function test_badRequest2() {
    console.log('started test_badRequest2()');

    let response = await fetch('http://localhost:8000/stars/unknownDataWithoutColon', { method: 'GET', headers: {"Content-Type": "application/json"} });
    let json = await response.json();
    assert.equal(json.error, 'cannot understand request part: unknownDataWithoutColon');

    // done
    console.log('successfully finished test_badRequest2()');
}

async function test_getBlock() {
    console.log('started test_getBlock()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    // first star
    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
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

    let star = {
        dec: 'dec6',
        ra: 'ra6',
        mag: 'mag6',
        con: 'con6',
        story: 'story6'
    };
    body = JSON.stringify({ address: address, star: star });
    response = await fetch('http://localhost:8000/block', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);

    // read it again
    response = await fetch('http://localhost:8000/block/' + json.height, { method: 'GET', headers: {"Content-Type": "application/json"} });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.body.star.story, '73746f727936');

    // done
    console.log('successfully finished test_getBlock()');
}

async function runTests() {
    await test_postStarData_good();
    await test_getByHash();
    await test_badRequest1();
    await test_badRequest2();
    await test_getBlock();
}

runTests();

// TODO: more tests
