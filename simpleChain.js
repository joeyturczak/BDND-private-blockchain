/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');


/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = '',
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ''
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    // Create genesis block
    let genesisBlock = new Block("First block in the chain - Genesis block");
    genesisBlock.height = 0;
    genesisBlock.time = 1530393985;
    genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
    addDataToLevelDB(genesisBlock.height, JSON.stringify(genesisBlock).toString());
  }

  // Add new block
  addBlock(newBlock){
    this.getBlockHeight().then(function(height) {
      // Block height
      newBlock.height = (height + 1);
      // UTC timestamp
      newBlock.time = new Date().getTime().toString().slice(0,-3);
      // previous block hash
      return height;
    }).then(function(height) {
      // Get previous block
      return getDataFromLevelDB(height);
    }).then(function(previousBlock) {
      newBlock.previousBlockHash = JSON.parse(previousBlock).hash;
      // Block hash with SHA256 using newBlock and converting to a string
      newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
      // Store newBlock in LevelDB
      addDataToLevelDB(newBlock.height, JSON.stringify(newBlock).toString());
    }).catch(function() {
      console.log('Error adding block');
    });
  }

  // Get block height
  getBlockHeight(){
    return new Promise((resolve, reject) => {
      let i = 0;
      db.createReadStream().on('data', function (data) {
        i++;
      })
      .on('error', function (err) {
        console.log('Oh my!', err);
      })
      .on('close', function () {
        var height = i - 1;
        console.log('Height: ' + (height).toString())
        resolve(height);
      });
    });
  }

  // get block
  getBlock(blockHeight){
    return getDataFromLevelDB(blockHeight).then(function(block) {
      // print block as a single string
      console.log(JSON.parse(block));
      return block;
    });
  }

  // validate block
  validateBlock(blockHeight){
    return new Promise((resolve, reject) => {
      this.getBlock(blockHeight).then(function(data) {
        // get block object
        let block = JSON.parse(data);
        // get block hash
        let blockHash = block.hash;
        // remove block hash to test block integrity
        block.hash = '';
        // generate block hash
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        // Compare
        if (blockHash===validBlockHash) {
          console.log('Block validated');
          resolve(true);
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          resolve(false);
        }
      }).catch(function() {
        console.log('Error: Could not find block');
      });
    });
  }

  // Validate blockchain
  validateChain(){
    let errorLog = [];
    var that = this;

    that.getBlockHeight().then(function(height) {
      var currentBlock;
      var nextBlock;
      
      for (let i = 0; i < height; i++) {
        that.getBlock(i).then(function(block) {
          // Get block
          currentBlock = JSON.parse(block);
          return that.getBlock(i + 1);
        }).then(function(block) {
          // Get next block in chain
          nextBlock = JSON.parse(block);
          // compare blocks hash link
          if(currentBlock.hash !== nextBlock.hash) {
            errorLog.push(i);
          }
          return that.validateBlock(i);
        }).then(function(valid) {
          if(!valid) {
            errorLog.push(i);
          }
        });
      }
      return that.validateBlock(height);
    }).then(function(valid) {
      // validate final block
      if(!valid) {
        errorLog.push(height);
      }
    }).then(function() {
      // print errors if any
      if (errorLog.length > 0) {
        console.log('Block errors = ' + errorLog.length);
        console.log('Blocks: ' + errorLog);
      } else {
        console.log('No errors detected');
      }
    });
  }
}

// Add data to levelDB with key/value pair
function addDataToLevelDB(key, value) {
  db.put(key, value, function(err) {
    if (err) return console.log('Block ' + key + ' submission failed', err);
  });
}

// Get data from levelDB with key
function getDataFromLevelDB(key) {
  return db.get(key);
}