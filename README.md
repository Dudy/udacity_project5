This is the Udacity Blockchain Nanodegree project of Dirk Podolak.

# Project Overview

The starting point of
the application is the index.js file, so you may start by running

```node index.js```

in a console.

After pulling this code from the git repository, you need to download all
necessary dependencies. npm does this by issuing this command in the git
project directory.

```npm install```

The implemented endpoints are as follows.

--------------------------------------------------------------------------------

# Get Block by height

Get one specific block from the blockchain that is denoted by the given
blockheight.

**URL** : `/block/:blockheight/`

**Method**: `GET`

## Query Parameters
None

## Path Parameters
:blockheight the height of the block that is requested

## Body
None

## Example
### Request

    http://localhost:8000/block/12

### Response
``` json
{
  "hash": "3c033eb3c7638ab76e5c18ceabea72b2e70120fbe1f6908d4492d3ed8802563a",
  "height": 8,
  "body": "test data 5",
  "time": "1534293440",
  "previousBlockHash": "621b90642c842833d676d22fd53a14b275906a18944979cdceacf49e8e59b96b"
}
```

--------------------------------------------------------------------------------

# Post new Block

Post the content of a new block as a "body" item in a JSON structure like
``` json
{
  "body":"block body contents"
}
```

This will be added to the blockchain as a new block. The new block will be
returned as if it was requested by the above mentioned GET method.

**URL** : `/block`

**Method**: `POST`

## Query Parameters
None

## Path Parameters
None

## Body
A JSON structure that contains a single "body" attribute that will be used
as the new block's data, see the following example.

## Example
### Request

    curl -X "POST" "http://localhost:8000/block"\
         -H 'Content-Type: application/json'\
         -d $'{"body":"block body contents"}'

### Response
``` json
{
  "hash": "0286c7f91ed2ed52f44cc9e62344939437c148fbcd13ea6fd080d942b2c17a39",
  "height": 15,
  "body": "block body contents",
  "time": "1535053866",
  "previousBlockHash": "b47e5b0a318c1d735aba8fb1117de5c8a4d793f78ef41772d7405c439a30f414"
}
```

--------------------------------------------------------------------------------

# Request Validation

Sends a request for validation of identity.
The user will be returned a message that he has to sign and submit to a second
URL (see below).
The body of this validation request call must include the users blockchain ID
(also called address, and it is also used as his public key). It is a single
attribute called "address".
The response also contains the timestamp of the request and a validation window
which denotes the number of seconds the user has time to sign and return the
message.

**URL** : `/requestValidation`

**Method**: `POST`

## Query Parameters
None

## Path Parameters
None

## Body
A JSON structure that contains a single "address" attribute that will be used
as the user's address.

## Example
### Request

    curl -X "POST" "http://localhost:8000/requestValidation"\
         -H 'Content-Type: application/json'\
         -d $'{"address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu"}'

### Response
``` json
{
    "address": "1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
    "requestTimeStamp": "1537607396",
    "message": "1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu:1537607396:starRegistry",
    "validationWindow": 300
}
```

--------------------------------------------------------------------------------

# Message Signature Validation

When a user wants to verify his identity, he does this by verifying that he
has access to a private key that belongs to a given address (blockchain ID),
which is just the public key of that private key.
On request validation (see above) he gets a message that he needs to sign
and return to the service. This endpoint is used for that.
The response contains some information of the identification process as well
as on the operation the user is allowed to do now ("registerStar").

**URL** : `/message-signature/validate`

**Method**: `POST`

## Query Parameters
None

## Path Parameters
None

## Body
A JSON structure that contains information on the identification status
of the user.

## Example
### Request

    curl -X "POST" "http://localhost:8000/message-signature/validate"\
         -H 'Content-Type: application/json'\
         -d $'{"address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu","signature":"1fd07e13db691b3037310f566b4b7cf40ff51ca4d26781839979ceb1fa454981200b08bb34f0246b7a6b45f5c5f598548c0a7aa3e85c074baae46345497701e383"}'

### Response
``` json
{
    "registerStar": true,
    "status":
    {
        "address": "1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
        "requestTimeStamp": "1537607396",
        "message": "1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu:1537607396:starRegistry",
        "validationWindow": 300,
        "messageSignature": "valid"
    }
}
```

--------------------------------------------------------------------------------

# Star registration

With this endpoint the user can register a single star. The request needs the
users blockchain ID (address) and some data on the star:

"right ascension (ra)", "declination (dec)", "magnitude (mag)",
"constellation (con)" and "star story (story)".

The values in parenthesis are the json attribute names of the body object.

"magnitude" and "constellation" are optional.

The "star story" must be in hey encoded ascii format and may not be larger
then 500 bytes.

The response contains the block as it is stored in the blockchain.

**URL** : `/block`

**Method**: `POST`

## Query Parameters
None

## Path Parameters
None

## Body
A JSON structure that contains information about a star.

## Example
### Request

    curl -X "POST" "http://localhost:8000/message-signature/validate"\
         -H 'Content-Type: application/json'\
         -d $'{"address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu","star":{"dec":"dec2","ra":"ra2","mag":"mag2","con":"con2","story":"story2"}}'

### Response
``` json
{
    "hash": "d00964cec243b586c0597b435b93fa37b759dff580d01b1e297dd837b1030526",
    "height": 206,
    "body":
    {
        "address": "1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
        "star":
        {
            "dec": "dec2",
            "ra": "ra2",
            "mag": "mag2",
            "con": "con2",
            "story": "73746f727932"
        }
    },
    "time": "1537607396",
    "previousBlockHash": "6153465c9603ce345fb2596d54f2f9e3403bb2e2fd87f43933ad73b59f6bfb6f"
}
```

--------------------------------------------------------------------------------

# Star retrieval for an address

With this endpoint a user can read all stars from the blockchain that have been
registered by a specific address. this will return a list of all blocks from the
blockchain.

The story of the stars, that are hex encoded, will be decoded and added to the
star's data structure as attribute "storyDecoded".

**URL** : `/stars/address:[ADDRESS]`

**Method**: `GET`

## Query Parameters
None

## Path Parameters
The dynamic part of the path [ADDRESS] must be replaced with a blockchain id.

## Body
A JSON structure that contains information about some stars.

## Example
### Request

    curl http://localhost:8000/stars/address:1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu\
     -H 'Content-Type: application/json'

### Response
``` json
[
    {
        "hash":"d00964cec243b586c0597b435b93fa37b759dff580d01b1e297dd837b1030526",
        "height":206,
        "body":
        {
            "address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
            "star":
            {
                "dec":"dec2",
                "ra":"ra2",
                "mag":"mag2",
                "con":"con2",
                "story":"73746f727932",
                "storyDecoded":"story2"
            }
        },
        "time":"1537607396",
        "previousBlockHash":"6153465c9603ce345fb2596d54f2f9e3403bb2e2fd87f43933ad73b59f6bfb6f"
    },
    {
        "hash":"6153465c9603ce345fb2596d54f2f9e3403bb2e2fd87f43933ad73b59f6bfb6f",
        "height":205,
        "body":
        {
            "address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
            "star":
            {
                "dec":"dec1",
                "ra":"ra1",
                "mag":"mag1",
                "con":"con1",
                "story":"73746f727931",
                "storyDecoded":"story1"
            }
        },
        "time":"1537607396",
        "previousBlockHash":"d996ccd100fc04dd4050942353d856c4f4df856efe411ddeb53bd21d08e37a75"
    }
]
```

--------------------------------------------------------------------------------

# Star retrieval of a single star

With this endpoint a user can read a single star from the blockchain by it's
blockchain hash value.

The story of the star, that is hex encoded, will be decoded and added to the
star's data structure as attribute "storyDecoded".

**URL** : `/stars/hash:[HASH]`

**Method**: `GET`

## Query Parameters
None

## Path Parameters
The dynamic part of the path [HASH] must be replaced with a blockchain hash.

## Body
A JSON structure that contains information about a star.

## Example
### Request

    curl http://localhost:8000/stars/hash:6153465c9603ce345fb2596d54f2f9e3403bb2e2fd87f43933ad73b59f6bfb6f\
     -H 'Content-Type: application/json'

### Response
``` json
{
    "hash":"6153465c9603ce345fb2596d54f2f9e3403bb2e2fd87f43933ad73b59f6bfb6f",
    "height":205,
    "body":
    {
        "address":"1DQTxDi3mptaZNrA9o5uk3YgKF1D7D6Gyu",
        "star":
        {
            "dec":"dec1",
            "ra":"ra1",
            "mag":"mag1",
            "con":"con1",
            "story":"73746f727931",
            "storyDecoded":"story1"
        }
    },
    "time":"1537607396",
    "previousBlockHash":"d996ccd100fc04dd4050942353d856c4f4df856efe411ddeb53bd21d08e37a75"
}
```

--------------------------------------------------------------------------------
