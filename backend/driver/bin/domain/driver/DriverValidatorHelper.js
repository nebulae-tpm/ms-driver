const DriverDA = require("../../data/DriverDA");
const DriverKeycloakDA = require("../../data/DriverKeycloakDA");
const { of, interval, forkJoin, throwError } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap, mapTo } = require('rxjs/operators');
const { 
  CustomError, 
  DefaultError,   
  USER_MISSING_DATA_ERROR_CODE,
  USERNAME_ALREADY_USED_CODE,
  EMAIL_ALREADY_USED_ERROR_CODE,
  PERMISSION_DENIED_ERROR_CODE,
  INVALID_USERNAME_FORMAT_ERROR_CODE,
  MISSING_BUSINESS_ERROR_CODE,
  USER_UPDATE_OWN_INFO_ERROR_CODE,
  USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE,
  USER_CREDENTIAL_EXIST_ERROR_CODE,
  USER_NOT_FOUND_ERROR_CODE,
  USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE,
  USER_WAS_NOT_DELETED
} = require("../../tools/customError");

const context = "Driver";
const userNameRegex = /^[a-zA-Z0-9._-]{8,}$/;

class DriverValidatorHelper {

  /**
   * Validates if the user can be created checking if the info is valid and the username and email have not been used
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverCreationDriverValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.driver.businessId) this.throwCustomError$(MISSING_BUSINESS_ERROR_CODE)}),
      //tap(data => this.checkIfUserBelongsToTheSameBusiness(data.driver, data.authToken, 'Driver', data.roles)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.driver.generalInfo.email).pipe(mapTo(data)))
    );
  }


  /**
   * Validates if the user can be updated checking if the info is valid and the username and email have not been used
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverUpdateDriverValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken)),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.driver.generalInfo.email, userMongo).pipe(mapTo(data)))    
    );
  }


  /**
   * Validates if the user can update its state
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverUpdateDriverStateValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken, 'Driver')),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
    );
  }

  /**
   * Validates if the user can resset its password
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverCreateDriverAuthValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => console.log('Data =======> ', data)),
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.authInput || !data.authInput.username.trim().match(userNameRegex)) this.throwCustomError$(INVALID_USERNAME_FORMAT_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      mergeMap(data => this.checkUsernameExistKeycloak$(data.authInput, data.driver.authInput.username).pipe(mapTo(data))),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(userMongo.generalInfo.email, userMongo).pipe(mapTo(data)))
    )
  }

    /**
   * Validates if the user can resset its password
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverUpdateDriverAuthValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(userMongo.generalInfo.email, userMongo).pipe(mapTo(data)))
    )
  }

  static checkDriverRemoveDriverAuthValidator$(driver, authToken, roles, userMongo) {
    return of({driver, authToken, roles, userMongo: userMongo})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError$(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError$(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => { if (!data.userMongo.auth || !data.userMongo.auth.username) this.throwCustomError(USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken)),
    );

  }

    /**
     * Check if the user was deleted from Keycloak. If the user exist return an error indicating that the user was not deleted
     * @param {*} userKeycloakId 
     */
    static checkIfUserWasDeletedOnKeycloak$(userKeycloakId){
      return of(userKeycloakId)
      .pipe(
        mergeMap(userKeycloakId => DriverKeycloakDA.getUserByUserId$(userKeycloakId)),
        tap(userKeycloak => { if (userKeycloak) this.throwCustomError$(USER_WAS_NOT_DELETED) })
      );
    }


  static checkIfUserIsTheSameUserLogged(user, authToken) {
    if (user._id == authToken.sub) {
      return this.throwCustomError$(USER_UPDATE_OWN_INFO_ERROR_CODE);
    }
  }

  /**
   * Checks if the user belongs to the same business of the user that is performing the operation
   * @param {*} userMongo 
   * @param {*} authToken 
   * @param {*} context 
   * @param {*} roles 
   */
  static checkIfUserBelongsToTheSameBusiness(userMongo, authToken, context, roles) {
    if (!userMongo || (!roles["PLATFORM-ADMIN"] && userMongo.businessId != authToken.businessId)){
      this.throwCustomError$(USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE)
    }
  }


  static checkEmailExistKeycloakOrMongo$(email, userMongo) {
    return of(email)
    .pipe(
      mergeMap(email => 
        forkJoin(
          DriverKeycloakDA.getUser$(null, email),
          DriverDA.getDriverByEmail$(email)
      )),
      mergeMap(([keycloakResult, mongoResult]) => {
        const userKeycloakId = userMongo && userMongo.auth && userMongo.auth.userKeycloakId ? userMongo.auth.userKeycloakId: undefined;
        if (keycloakResult && keycloakResult.length > 0 && (!userKeycloakId || userKeycloakId != keycloakResult[0].id)) {
          return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
         if (mongoResult && mongoResult.length > 0 && (!userKeycloakId || userKeycloakId != mongoResult._id)) {
          return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
        return of(email);
      })
    );

  }

  static checkUsernameExistKeycloak$(user, username) {
    return DriverKeycloakDA.getUser$(username)
    .pipe(
      mergeMap(userFound => {
        if(userFound && userFound.length > 0){
           return this.throwCustomError$(USERNAME_ALREADY_USED_CODE);
         }
         return of(user);
       }
     )
    );
  }

  static checkUserEmailExistKeycloak$(user, email) {
    return DriverKeycloakDA.getUser$(null, email)
    .pipe(
      mergeMap(userFound => {
        if(userFound && userFound.length > 0){
           return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
         }
         return of(user);
       }
     )
    );
  }

/**
   * Creates a custom error observable
   * @param {*} errorCode Error code
   */
  static throwCustomError$(errorCode) {
    return throwError(
      new CustomError(
        context,
        'Driver',
        errorCode.code,
        errorCode.description
      )
    );
  }
}

module.exports = DriverValidatorHelper;
