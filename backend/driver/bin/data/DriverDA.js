"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Driver";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverDA {
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

  /**
   * Gets a driver according to the query
   * @param {Object} filterQuery Query to filter
   */
  static getDriverByFilter$(filterQuery) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.findOne(filterQuery));
  }

  /**
   * Gets a driver by its id and business(Optional)
   */
  static getDriver$(id, businessId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }

  static getDriverList$(filter, pagination) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["generalInfo.name"] = { $regex: filter.name, $options: "i" };
    }

    if (filter.creationTimestamp) {
      query.creationTimestamp = filter.creationTimestamp;
    }

    if (filter.creatorUser) {
      query.creatorUser = { $regex: filter.creatorUser, $options: "i" };
    }

    if (filter.modifierUser) {
      query.modifierUser = { $regex: filter.modifierUser, $options: "i" };
    }

    const cursor = collection
      .find(query)
      .skip(pagination.count * pagination.page)
      .limit(pagination.count)
      .sort({ creationTimestamp: pagination.sort });

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }

  static getDriverSize$(filter) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["generalInfo.name"] = { $regex: filter.name, $options: "i" };
    }

    if (filter.creationTimestamp) {
      query.creationTimestamp = filter.creationTimestamp;
    }

    if (filter.creatorUser) {
      query.creatorUser = { $regex: filter.creatorUser, $options: "i" };
    }

    if (filter.modifierUser) {
      query.modifierUser = { $regex: filter.modifierUser, $options: "i" };
    }

    return collection.count(query);
  }

  /**
   * Creates a new Driver
   * @param {*} driver driver to create
   */
  static createDriver$(driver) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(driver));
  }

      /**
   * modifies the general info of the indicated Driver 
   * @param {*} id  Driver ID
   * @param {*} DriverGeneralInfo  New general information of the Driver
   */
  static updateDriverGeneralInfo$(id, DriverGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {generalInfo: DriverGeneralInfo.generalInfo, modifierUser: DriverGeneralInfo.modifierUser, modificationTimestamp: DriverGeneralInfo.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the Driver state 
   * @param {string} id Driver ID
   * @param {boolean} newDriverState boolean that indicates the new Driver state
   */
  static updateDriverState$(id, newDriverState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {state: newDriverState.state, modifierUser: newDriverState.modifierUser, modificationTimestamp: newDriverState.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

    /**
   * Updates the Driver membership state 
   * @param {string} id Driver ID
   * @param {boolean} newDriverState boolean that indicates the new Driver membership state
   */
  static updateDriverMembershipState$(id, newDriverMembershipState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {'membership.active': newDriverMembershipState.state, modifierUser: newDriverMembershipState.modifierUser, modificationTimestamp: newDriverMembershipState.modificationTimestamp}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the user auth
   * @param {*} userId User ID
   * @param {*} userAuth Object
   * @param {*} userAuth.userKeycloakId user keycloak ID
   * @param {*} userAuth.username username
   */
  static updateUserAuth$(userId, userAuth) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $set: {auth: userAuth}
          },{
            returnOriginal: false
          }
        )
    )
    .pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

    /**
   * Removes the user auth
   * @param {*} userId User ID
   * @param {*} userAuth Object
   * @param {*} userAuth.userKeycloakId user keycloak ID
   * @param {*} userAuth.username username
   */
  static removeUserAuth$(userId, userAuth) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: userId },
          {
            $unset: {auth: ""}
          },{
            returnOriginal: false
          }
        )
    )
    .pipe(
      map(result => result && result.value ? result.value : undefined)
    )
  }

    /**
   * Gets user by email
   * @param {String} email User email
   * @param {String} ignoreUserId if this value is enter, this user will be ignore in the query 
   */
  static getDriverByEmail$(email, ignoreUserId) {
    let query = {      
      'generalInfo.email': email
    };
    if(ignoreUserId){
      query._id = {$ne: ignoreUserId};
    }
    return this.getDriverByFilter$(query);
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
