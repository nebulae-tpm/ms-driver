"use strict";

const uuidv4 = require("uuid/v4");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const DriverDA = require("../../data/DriverDA");
const DriverValidatorHelper = require('./DriverValidatorHelper');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { of, interval } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, mapTo } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE
} = require("../../tools/customError");
const DriverBlocksDA =  require('../../data/DriverBlocksDA');



/**
 * Singleton instance
 */
let instance;

class DriverCQRS {
  constructor() {
  }

  /**  
   * Gets the Driver
   *
   * @param {*} args args
   */
  getDriver$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriver",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return DriverDA.getDriver$(args.id, businessId)
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(error))
    );
  }

  /**  
   * Gets the Driver list
   *
   * @param {*} args args
   */
  getDriverList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriverList",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return DriverDA.getDriverList$(filterInput, args.paginationInput);
      }),
      toArray(),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**  
   * Gets the amount of the Driver according to the filter
   *
   * @param {*} args args
   */
  getDriverListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriverListSize",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return DriverDA.getDriverSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
  * Create a driver
  */
 createDriver$({ root, args, jwt }, authToken) {
    const driver = args ? args.input: undefined;
    if(driver){
      driver._id = uuidv4();
      driver.creatorUser = authToken.preferred_username;
      driver.creationTimestamp = new Date().getTime();
      driver.modifierUser = authToken.preferred_username;
      driver.modificationTimestamp = new Date().getTime();
    }

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "createDriver$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => DriverValidatorHelper.checkDriverCreationDriverValidator$(driver, authToken, roles)),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverCreated",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: data.driver._id,
          data: data.driver,
          user: authToken.preferred_username
        })).mapTo(data)
      ),
      map(data => ({ code: 200, message: `Driver with id: ${data.driver._id} has been created` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * Edit the driver state
   */
  updateDriverGeneralInfo$({ root, args, jwt }, authToken) {
    const driver = {
      _id: args.id,
      generalInfo: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "updateDriverGeneralInfo$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        DriverDA.getDriver$(driver._id)
        .pipe(
          mergeMap(userMongo => DriverValidatorHelper.checkDriverUpdateDriverValidator$(driver, authToken, roles, userMongo))
        )              
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverGeneralInfoUpdated",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: driver._id,
          data: driver,
          user: authToken.preferred_username
        })).mapTo(data)
      ),
      map(data => ({ code: 200, message: `General info of the driver with id: ${data.driver._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  /**
   * Edit the driver state
   */
  updateDriverState$({ root, args, jwt }, authToken) {
    const driver = {
      _id: args.id,
      state: args.newState,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "updateDriverState$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        DriverDA.getDriver$(driver._id)
        .pipe( mergeMap(userMongo => DriverValidatorHelper.checkDriverUpdateDriverStateValidator$(driver, authToken, roles, userMongo)))
      ),
      mergeMap(data => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverStateUpdated",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: driver._id,
          data: driver,
          user: authToken.preferred_username
        })).mapTo(data)
      ),
      map(() => ({ code: 200, message: `State of the driver with id: ${driver._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**
   * Create the driver auth
   */
  createDriverAuth$({ root, args, jwt }, authToken) {
    const driver = {
      _id: args.id,
      authInput: args.input,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "createDriverAuth$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    ).pipe(
      mergeMap(roles => 
        DriverDA.getDriver$(driver._id)
        .pipe( mergeMap(userMongo => DriverValidatorHelper.checkDriverCreateDriverAuthValidator$(driver, authToken, roles, userMongo)))
      ),
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverAuthCreated",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: driver._id,
          data: driver,
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `Auth credential of the driver with id: ${driver._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  // /**
  //  * Removes the driver auth
  //  */
  // removeUserAuth$({ root, args, jwt }, authToken) {
  //   const driver = {
  //     _id: args.id,
  //     authInput: args.input,
  //     modifierUser: authToken.preferred_username,
  //     modificationTimestamp: new Date().getTime()
  //   };

  //   return RoleValidator.checkPermissions$(
  //     authToken.realm_access.roles,
  //     "Driver",
  //     "createDriverAuth$",
  //     PERMISSION_DENIED_ERROR_CODE,
  //     ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
  //   ).pipe(
  //     mergeMap(roles => 
  //       DriverDA.getDriver$(driver._id)
  //       .pipe( mergeMap(userMongo => DriverValidatorHelper.checkDriverCreateDriverAuthValidator$(driver, authToken, roles, userMongo)))
  //     ),
  //     mergeMap(() => eventSourcing.eventStore.emitEvent$(
  //       new Event({
  //         eventType: "DriverAuthCreated",
  //         eventTypeVersion: 1,
  //         aggregateType: "Driver",
  //         aggregateId: driver._id,
  //         data: driver,
  //         user: authToken.preferred_username
  //       })
  //     )
  //     ),
  //     map(() => ({ code: 200, message: `Auth credential of the driver with id: ${driver._id} has been updated` })),
  //     mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
  //     catchError(err => GraphqlResponseTools.handleError$(err))
  //   );
  // }



    /**
   * Edit the driver membership state
   */
  updateDriverMembershipState$({ root, args, jwt }, authToken) {
    const driver = {
      _id: args.id,
      state: args.newState,
      modifierUser: authToken.preferred_username,
      modificationTimestamp: new Date().getTime()
    };
    console.log('updateDriverMembershipState CQRS ', args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "updateDriverMembershipState$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverMembershipStateUpdated",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: driver._id,
          data: driver,
          user: authToken.preferred_username
        })
      )
      ),
      map(() => ({ code: 200, message: `Membership state of the driver with id: ${driver._id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  getDriverBlocks$({ root, args, jwt }, authToken) { 
    console.log(args);

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "driverBlocks",
      "getDriverBlocks$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN"]
    ).pipe(
      map(() => [{
        key: 'PICO_Y_PLACA',
        notes: 'PYP Ambiental',
        startTime: 0,
        endTime: 123456789,
        user: 'juan.ospina'
      }]),
      // mergeMap(() => DriverBlocksDA.findBlocksByDriver$(args.id)),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }

  removeDriverBlock$({ root, args, jwt }, authToken) { 
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "driverBlock",
      "removeDriverBlock$",
      PERMISSION_DENIED_ERROR_CODE,
      ["PLATFORM-ADMIN"]
    ).pipe(
      mergeMap(() => eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "DriverBlockRemoved",
          eventTypeVersion: 1,
          aggregateType: "Driver",
          aggregateId: args.id,
          data: { blockKey: args.blockKey},
          user: authToken.preferred_username
        })
      )),
      map(() => ({ code: 200, message: `Driver with id: ${args.id} has been updated` })),
      mergeMap(r => GraphqlResponseTools.buildSuccessResponse$(r)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );

  }


  //#endregion


}

/**
 * @returns {DriverCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new DriverCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
