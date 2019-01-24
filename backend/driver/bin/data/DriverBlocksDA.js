"use strict";

let mongoDB = undefined;
const CollectionName = "driverBlocks";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverBlocksDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }


  static findBlocksByDriver$(driverId) {
    console.log("findBlocksByDriver$", driverId);
    const collection = mongoDB.db.collection(CollectionName);
    const query = {
      driverId: driverId
    };
    return defer(() => collection
      .find(query)
      .toArray()
    )
  }

  static removeBlockFromDevice$({driverId, blockKey}){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.deleteMany({driverId: driverId, key: blockKey}))
  }

  static removeExpiredBlocks$(timestamp){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.deleteMany( { endTime: { $$lte: timestamp } }))
  }

}
/**
 * @returns {DriverBlocksDA}
 */
module.exports = DriverBlocksDA;
