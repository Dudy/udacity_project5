const fetch = require("node-fetch");
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib') // v3.x.x
const bitcoinMessage = require('bitcoinjs-message')

async function test_requestValidation_fail_noBody() {
    console.log('started test_requestValidation_fail_noBody()');
    const response = await fetch('http://localhost:8000/requestValidation', { method: 'POST' });
    const json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.error, "no address provided");
    console.log('successfully finished test_requestValidation_fail_noBody()');
}

async function test_requestValidation_fail_noAddress() {
    console.log('started test_requestValidation_fail_noAddress()');
    const response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', body: 'a=1' });
    const json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.error, "no address provided");
    console.log('successfully finished test_requestValidation_fail_noAddress()');
}

async function test_requestValidation_good_newAddress() {
    console.log('started test_requestValidation_good_newAddress()');

    let timestamp = new Date().getTime();
    timestamp = (timestamp - timestamp % 1000) / 1000;
    let newAddress = 'currentlyUnknownAddress_' + timestamp;

    let body = JSON.stringify({ address: newAddress });
    const response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, newAddress);
    assert.equal(json.message, newAddress + ':' + timestamp + ':starRegistry');
    console.log('successfully finished test_requestValidation_good_newAddress()');
}

async function test_requestValidation_good_sameAddressTwiceWithinValidationWindow() {
    console.log('started test_requestValidation_good_sameAddressTwiceWithinValidationWindow()');
    let timestamp = new Date().getTime();
    timestamp = (timestamp - timestamp % 1000) / 1000;
    let newAddress = 'currentlyUnknownAddress_' + timestamp;

    let body = JSON.stringify({ address: newAddress });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, newAddress);
    assert.equal(json.message, newAddress + ':' + timestamp + ':starRegistry');

    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, newAddress);
    assert.equal(json.message, newAddress + ':' + timestamp + ':starRegistry');

    console.log('successfully finished test_requestValidation_good_newAddress()');
}

async function test_requestValidation_good_sameAddressTwiceOutsideOfValidationWindow() {
    console.log('started test_requestValidation_good_sameAddressTwiceOutsideOfValidationWindow()');
    let timestamp = new Date().getTime();
    timestamp = (timestamp - timestamp % 1000) / 1000;
    let newAddress = 'currentlyUnknownAddress_' + timestamp;

    // bring validation window down to 5 seconds
    let body = JSON.stringify({ validationWindow: '5' });
    let response = await fetch('http://localhost:8000/test/validationWindow', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    assert.equal(response.status, 204);

    // send first request
    body = JSON.stringify({ address: newAddress });
    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, newAddress);
    assert.equal(json.message, newAddress + ':' + timestamp + ':starRegistry');

    // wait six seconds to run out of the validation window
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6000);

    // send second request, the message is different now!
    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, newAddress);
    assert.notEqual(json.message, newAddress + ':' + timestamp + ':starRegistry');

    // bring validation window back to five minutes
    body = JSON.stringify({ validationWindow: '300' });
    response = await fetch('http://localhost:8000/test/validationWindow', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    assert.equal(response.status, 204);

    // done
    console.log('successfully finished test_requestValidation_good_sameAddressTwiceOutsideOfValidationWindow()');
}

async function test_messageSignatureValidation_fail_noRegistration() {
    console.log('started test_messageSignatureValidation_fail_noRegistration()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });
    let signature = 'dummySignature';

    let body = JSON.stringify({ address: address, signature: signature });
    let response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    assert.equal(response.status, 400);
    console.log('successfully finished test_messageSignatureValidation_fail_noRegistration()');
}

async function test_messageSignatureValidation_fail_outsideOfValidationWindow() {
    console.log('started test_messageSignatureValidation_fail_outsideOfValidationWindow()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    // bring validation window down to 5 seconds
    let body = JSON.stringify({ validationWindow: '5' });
    let response = await fetch('http://localhost:8000/test/validationWindow', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    assert.equal(response.status, 204);

    // send first request
    body = JSON.stringify({ address: address });
    response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

    var signature = bitcoinMessage.sign(json.message, keyPair.privateKey, keyPair.compressed)

    // wait six seconds to run out of the validation window
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6000);

    // send signed message, but too late
    body = JSON.stringify({ address: address, signature: signature });
    response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.error, 'Your validation window has expired, please use the path /requestValidation again to request a new validation message.');

    // bring validation window back to five minutes
    body = JSON.stringify({ validationWindow: '300' });
    response = await fetch('http://localhost:8000/test/validationWindow', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    assert.equal(response.status, 204);

    // done
    console.log('successfully finished test_messageSignatureValidation_fail_outsideOfValidationWindow()');
}

async function test_messageSignatureValidation_good() {
    console.log('started test_messageSignatureValidation_good()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

    let expectedTimestamp = json.requestTimeStamp;
    let expectedMessage = address + ':' + json.requestTimeStamp + ':starRegistry';

    var signature = bitcoinMessage.sign(json.message, keyPair.privateKey, keyPair.compressed)

    // wait two seconds, but stay inside the validation window
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);

    // send signed message
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

    // done
    console.log('successfully finished test_messageSignatureValidation_good()');
}

async function test_messageSignatureValidation_fail_malformedSignature() {
    console.log('started test_messageSignatureValidation_fail_malformedSignature()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

    let signature = 'malformed signature';

    // send signed message
    body = JSON.stringify({ address: address, signature: signature });
    response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.error, 'The signature could not be verified.');

    // done
    console.log('successfully finished test_messageSignatureValidation_fail_malformedSignature()');
}

async function test_messageSignatureValidation_fail_wrongSignature() {
    console.log('started test_messageSignatureValidation_fail_wrongSignature()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });
    let secondKeyPair = bitcoin.ECPair.makeRandom();

    let body = JSON.stringify({ address: address });
    let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    let json = await response.json();
    assert.equal(response.status, 200);
    assert.equal(json.address, address);
    assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

    let signature = bitcoinMessage.sign(json.message, secondKeyPair.privateKey, secondKeyPair.compressed)

    // send signed message
    body = JSON.stringify({ address: address, signature: signature });
    response = await fetch('http://localhost:8000/message-signature/validate', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
    json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.error, 'The signature could not be verified.');

    // done
    console.log('successfully finished test_messageSignatureValidation_fail_wrongSignature()');
}

async function runTests() {
    await test_requestValidation_fail_noBody();
    await test_requestValidation_fail_noAddress();
    await test_requestValidation_good_newAddress();
    await test_requestValidation_good_sameAddressTwiceWithinValidationWindow();
    await test_requestValidation_good_sameAddressTwiceOutsideOfValidationWindow();
    await test_messageSignatureValidation_fail_noRegistration();
    await test_messageSignatureValidation_fail_outsideOfValidationWindow();
    await test_messageSignatureValidation_good();
    await test_messageSignatureValidation_fail_malformedSignature();
    await test_messageSignatureValidation_fail_wrongSignature();
};

runTests();
