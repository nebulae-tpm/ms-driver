'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const DriverDA = require('../../data/DriverDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const DriverBlocksDA = require('../../data/DriverBlocksDA');

/**
 * Singleton instance
 */
let instance;

class DriverES {

    constructor() {
    }


    /**
     * Persists the driver on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleDriverCreated$(driverCreatedEvent) {  
        const driver = driverCreatedEvent.data;
        return DriverDA.createDriver$(driver)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `DriverDriverUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleDriverGeneralInfoUpdated$(driverGeneralInfoUpdatedEvent) {  
        const driverGeneralInfo = driverGeneralInfoUpdatedEvent.data;
        return DriverDA.updateDriverGeneralInfo$(driverGeneralInfoUpdatedEvent.aid, driverGeneralInfo)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `DriverDriverUpdatedSubscription`, result))
        );
    }

    /**
     * updates the driver state on the materialized view according to the received data from the event store.
     * @param {*} DriverStateUpdatedEvent events that indicates the new state of the driver
     */
    handleDriverStateUpdated$(DriverStateUpdatedEvent) {          
        return DriverDA.updateDriverState$(DriverStateUpdatedEvent.aid, DriverStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `DriverDriverUpdatedSubscription`, result))
        );
    }

    /**
     * updates the driver membership state on the materialized view according to the received data from the event store.
     * @param {*} DriverStateUpdatedEvent events that indicates the new state of the driver
     */
    handleDriverMembershipStateUpdated$(DriverMembershipStateUpdatedEvent) {          
        console.log('handleDriverMembershipStateUpdated ', DriverMembershipStateUpdatedEvent);
        return DriverDA.updateDriverMembershipState$(DriverMembershipStateUpdatedEvent.aid, DriverMembershipStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `DriverDriverUpdatedSubscription`, result))
        );
    }

      /**
     * updates the user state on the materialized view according to the received data from the event store.
     * @param {*} userAuthCreatedEvent events that indicates the new state of the user
     */
    handleDriverAuthCreated$(driverAuthCreatedEvent) {
        return DriverDA.updateUserAuth$(
            driverAuthCreatedEvent.aid,
            driverAuthCreatedEvent.data
        )
        .pipe(
            mergeMap(result => {
                return broker.send$(
                    MATERIALIZED_VIEW_TOPIC,
                    `DriverDriverUpdatedSubscription`,
                    result
                );
            })
        );
    }

    /**
     * Removes the user auth on the materialized view.
     * @param {*} userAuthDeletedEvent events that indicates the user to which the auth credentials will be deleted
     */
    handleDriverAuthDeleted$(driverAuthDeletedEvent) {
        return DriverDA.removeUserAuth$(
            driverAuthDeletedEvent.aid,
            driverAuthDeletedEvent.data
        )
        .pipe(
            mergeMap(result => {
                return broker.send$(
                    MATERIALIZED_VIEW_TOPIC,
                    `DriverDriverUpdatedSubscription`,
                    result
                );
            })
        );
    }

    handleDriverBlockRemoved$(driverBlockRemovedEvt){
        console.log('############### handleDriverBlockRemoved', driverBlockRemovedEvt);
        return of(driverBlockRemovedEvt)
        .pipe(
            map(() => ({driverId: driverBlockRemovedEvt.aid, blockKey: driverBlockRemovedEvt.data.blockKey }) ),
            mergeMap(args => DriverBlocksDA.removeBlockFromDevice$(args) ),
            tap(r => console.log(r.result))
        )

    }

    handleCleanExpiredDriverBlocks$(DriverBlockRemovedEvt){
        console.log('############### handleCleanExpiredBlocks$', DriverBlockRemovedEvt);
        return DriverBlocksDA.removeExpiredBlocks$(DriverBlockRemovedEvt.timestamp);
    }

}



/**
 * @returns {DriverES}
 */
module.exports = () => {
    if (!instance) {
        instance = new DriverES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};