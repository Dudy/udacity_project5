const fetch = require("node-fetch");
const assert = require('assert');
const bitcoin = require('bitcoinjs-lib') // v3.x.x
const bitcoinMessage = require('bitcoinjs-message')

function test_postStarData_good() {
    console.log('started test_postStarData_good()');

    let keyPair = bitcoin.ECPair.makeRandom();
    let publicKey = keyPair.publicKey;
    let { address } = bitcoin.payments.p2pkh({ pubkey: publicKey });

    (async () => {
        let body = JSON.stringify({ address: address });
        let response = await fetch('http://localhost:8000/requestValidation', { method: 'POST', headers: {"Content-Type": "application/json"}, body: body });
        let json = await response.json();
        assert.equal(response.status, 200);
        assert.equal(json.address, address);
        assert.equal(json.message, address + ':' + json.requestTimeStamp + ':starRegistry');

        let expectedTimestamp = json.requestTimeStamp;
        let expectedMessage = address + ':' + json.requestTimeStamp + ':starRegistry';

        var signature = bitcoinMessage.sign(json.message, keyPair.privateKey, keyPair.compressed)

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

        // send star data
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

        console.log(json);

        // done
        console.log('successfully finished test_postStarData_good()');
    })();
}

test_postStarData_good();

// TODO: more tests