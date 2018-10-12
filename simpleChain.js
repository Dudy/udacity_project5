"use strict";

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const levelSandbox = require('./levelSandbox.js');

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

const dispatchDelay = 3000;

class Block {
	constructor(data) {
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
  }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor()  {
		let self = this;
		this.getBlockHeight().then(function(blockheight) {
			if (blockheight === 0) {
				self.addBlock(new Block("First block in the chain - Genesis block"));
			}
		});
  }

	print() {
		levelSandbox.print();
	}

	async addBlock(newBlock) {
		newBlock.height = await this.getBlockHeight();
		newBlock.time = new Date().getTime().toString().slice(0,-3);

		if (newBlock.height > 0) {
			let bestblock = await this.getBlock(newBlock.height - 1);
			newBlock.previousBlockHash = bestblock.hash;
		}

		newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
		await levelSandbox.store(newBlock.height, JSON.stringify(newBlock));

		return newBlock;
	}

	async getBlockHeight() {
		return await levelSandbox.getBlockHeight();
  }

	async getBlock(blockHeight) {
		try {
			let block = await levelSandbox.load(blockHeight);
			return JSON.parse(block);
		} catch (error) {
			return '';
		}
  }

	async validateBlock(blockHeight) {
		let block = await this.getBlock(blockHeight);
		let blockHash = block.hash;
		block.hash = '';
		let validBlockHash = SHA256(JSON.stringify(block)).toString();
		if (blockHash === validBlockHash) {
			return true;
		} else {
			console.log('Block #' + blockHeight + ' invalid hash:\n' + blockHash + ' <> ' + validBlockHash);
			return false;
		}
	}

	async validateChain() {
		let height = await this.getBlockHeight();

		console.log('validate chain of height ' + height);

		let errorLog = [];

		for (let i = 0; i < height; i++) {
			let valid = await this.validateBlock(i);
			if (!valid) {
				errorLog.push(i);
			}

			if (i > 0) {
				let block = await this.getBlock(i);
				let previousBlock = await this.getBlock(i - 1);

				if (block.previousBlockHash !== previousBlock.hash) {
					errorLog.push(i);
				}
			}
		}

		if (errorLog.length > 0) {
			console.log('Block errors = ' + errorLog.length);
			console.log('Blocks: ' + errorLog);
		} else {
			console.log('No errors detected');
		}
	}
}

module.exports = {
 	Block: Block,
 	Blockchain: Blockchain
}
