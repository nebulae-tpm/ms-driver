"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Driver";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverKeycloakDA {

/**
   * Gets the users by user keycloak ID
   */
  static getUserByUserId$(userKeycloakId) {
    //Gets the amount of user registered on Keycloak
    return (
      Rx.Observable.defer(() => {
        const optionsFilter = {
          userId: userKeycloakId
        };
        return KeycloakDA.keycloakClient.users.find(
          process.env.KEYCLOAK_BACKEND_REALM_NAME,
          optionsFilter);
      }).map(result => {
          const attributes = result.attributes;
          const user = {
            id: result.id,
            businessId: !attributes || !attributes.businessId
            ? undefined
            : attributes.businessId[0],
            username: result.username,
            generalInfo: {
              name: result.firstName ? result.firstName : "",
              lastname: result.lastName ? result.lastName : "",
              documentType:
                !attributes || !attributes.documentType
                  ? undefined
                  : attributes.documentType[0],
              documentId:
                !attributes || !attributes.documentId
                  ? undefined
                  : attributes.documentId[0],
              email: result.email,
              phone:
                !attributes || !attributes.phone
                  ? undefined
                  : attributes.phone[0]
            },
            state: result.enabled
          };
          return user;
        })
    );
  }

  /**
   * Gets the users paging
   * @param {*} username Username filter
   * @param {*} email Email filter
   */
  static getUser$(username, email) {
    const optionsFilter = {
      max: 1
    };

    if(username){
      optionsFilter.username = username;      
    }

    if(email){
      optionsFilter.email = email;
    }
    return Rx.Observable.of(optionsFilter)
    .mergeMap(filter => {
      return KeycloakDA.keycloakClient.users.find(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        filter
      );
    })
  }


  /**
   * Creates a new user on Keycloak
   * @param {*} user user to create
   */
  static createUser$(user, authInput) { 
    const attributes = {};
    attributes["businessId"] = user.businessId;
    

    const userKeycloak = {
      username: authInput.username,
      firstName: user.generalInfo.name,
      lastName: user.generalInfo.lastname,
      attributes: attributes,
      email: user.generalInfo.email,
      enabled: user.state,
      id: user._id
    };

    return defer(() =>
      KeycloakDA.keycloakClient.users.create(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

    /**
   * Updates the user info on Keycloak
   * @param {*} userKeycloakId User ID
   * @param {*} generalInfo info to change on the user
   */
  static updateUserGeneralInfo$(userKeycloakId, generalInfo) {
    //const attributes = {};
    //attributes["businessId"] = user.businessId;

    const userKeycloak = {
      id: userKeycloakId,
      //username: user.auth.username,
      firstName: generalInfo.name,
      lastName: generalInfo.lastname,
      //attributes: attributes,
      email: generalInfo.email
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

    /**
   * Updates the state of the user on Keycloak
   * @param {*} userKeycloakId User keycloak ID
   * @param {*} newUserState boolean that indicates the new user state
   */
  static updateUserState$(userKeycloakId, newUserState) {
    const userKeycloak = {
      id: userKeycloakId,
      enabled: newUserState
    };

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.update(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloak
      )
    );
  }

  /**
   * Resets the password of the user on Keycloak
   * @param {*} userKeycloakId id of the user to modify
   * @param {*} userPassword New password data
   */
  static resetUserPassword$(userKeycloakId, userPassword) {
    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.resetPassword(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloakId,
        userPassword
      )
    );
  }

  /**
   * Remove an user from Keycloak
   * @param {*} userKeycloakId id of user to remove
   */
  static removeUser$(userKeycloakId) {

    return Rx.Observable.defer(() =>
      KeycloakDA.keycloakClient.users.remove(
        process.env.KEYCLOAK_BACKEND_REALM_NAME,
        userKeycloakId
      )
    );
  }

}
/**
 * @returns {DriverKeycloakDA}
 */
module.exports = DriverKeycloakDA;
