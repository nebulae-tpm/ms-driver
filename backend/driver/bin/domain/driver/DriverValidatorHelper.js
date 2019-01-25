const UserDA = require("../data/UserDA");
const { of, interval, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');
const RoleValidator = require("../tools/RoleValidator");
const { 
  CustomError, 
  DefaultError,   
  USER_MISSING_DATA_ERROR_CODE,
  USER_NAME_ALREADY_USED_CODE,
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
} = require("../tools/customError");

const context = "Driver";
const userNameRegex = /^[a-zA-Z0-9._-]{8,}$/;

class DriverValidatorHelper {

  /**
   * Validates if the user can be created checking if the info is valid and the username and email have not been used
   * @param {*} driver 
   * @param {*} authToken 
   * @param {*} roles 
   */
  static checkDriverCreationDriverValidator$(driver, authToken, roles) {
    return of({driver, authToken, roles})
    .pipe(
      tap(data => { if (!data.driver) this.throwCustomError(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.driver.businessId) this.throwCustomError(MISSING_BUSINESS_ERROR_CODE)}),
      //tap(data => this.checkIfUserBelongsToTheSameBusiness(data.driver, data.authToken, 'Driver', data.roles)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(null, null, data.driver.generalInfo.email).pipe(mapTo(data)))
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
      tap(data => { if (!data.driver) this.throwCustomError(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken, method)),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.driver._id, null, data.driver.generalInfo.email).pipe(mapTo(data)))    
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
      tap(data => { if (!data.driver) this.throwCustomError(USER_MISSING_DATA_ERROR_CODE)}),
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
      tap(data => { if (!data.driver) this.throwCustomError(USER_MISSING_DATA_ERROR_CODE)}),
      mergeMap(data=> DriverDA.getUserById$(userId)
        .pipe(
          map(user => {
            data.userMongo = user;
            return data;
          }))
      ),
      tap(data => { if (!data.authInput || !data.authInput.username.trim().match(userNameRegex)) this.throwCustomError(INVALID_USERNAME_FORMAT_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken, method)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.driver._id, null, data.driver.generalInfo.email).pipe(mapTo(data)))
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
      tap(data => { if (!data.driver) this.throwCustomError(USER_MISSING_DATA_ERROR_CODE)}),
      tap(data => { if (!data.userMongo) this.throwCustomError(USER_NOT_FOUND_ERROR_CODE)}),
      tap(data => this.checkIfUserBelongsToTheSameBusiness(data.userMongo, data.authToken, 'Driver', data.roles)),
      tap(data => this.checkIfUserIsTheSameUserLogged(data.driver, authToken, method)),
      mergeMap(data => this.checkEmailExistKeycloakOrMongo$(data.driver._id, null, data.driver.generalInfo.email).pipe(mapTo(data)))
    )
  }



  //Validates if the user can resset its password
  static validateUpdateUserAuth$(data, authToken) {
    const method = "updateUserAuth$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          return Rx.Observable.of(roles)
          .mergeMap(() => UserDA.getUserById$(data.args.userId))
          .map(user => [roles, user])
        })
        .mergeMap(([roles, user]) => {
          const userId = data.args ? data.args.userId : undefined;
          const username = data.args ? data.args.username : undefined;
          const userPasswordInput = data.args ? data.args.input : undefined;

          //Validate if required parameters were sent
          const invalidUserMissingData =
            !userId ||
            (!username || username.trim().length == 0) || 
            !userPasswordInput ||
            !user.businessId || 
            !user.name ||
            !user.lastname;


          //Evaluate if the username has a valid format
          const invalidUserNameFormat =
            !username || !user.username.trim().match(userNameRegex);

          if (invalidUserMissingData || invalidUserNameFormat) {
            return this.createCustomError$(
              invalidUserMissingData
                ? USER_MISSING_DATA_ERROR_CODE
                : INVALID_USERNAME_FORMAT_ERROR_CODE, method
            );
          }

          //If the user that is performing the operation is not PLATFORM-ADMIN,
          // we must check that the business id match with the id of the token
          return this.checkIfUserBelongsToTheSameBusiness$(user, authToken, method, roles);
        })
        .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))
        .mergeMap(user => this.checkUsernameExistKeycloak$(user, user.username))
        .mergeMap(user => this.checkUserEmailExistKeycloak$(user, user.email))
    );
  }



    //Validates if the user can resset its password
    static validateRemoveUserAuth$(data, authToken) {
      const method = "removeUserAuth$()";
      //Validate if the user that is performing the operation has the required role.
      return (this.checkRole$(authToken, method)
          .mergeMap(roles => {
            return Rx.Observable.of(roles)
            .mergeMap(() => UserDA.getUserById$(data.args.userId))
            .map(user => [roles, user])
          })
          .mergeMap(([roles, user]) => {
            if(!user){
              return this.createCustomError$(USER_NOT_FOUND_ERROR_CODE, method);
            }

            if(!user.auth || !user.auth.username){
              return this.createCustomError$(USER_DOES_NOT_HAVE_AUTH_CREDENTIALS_ERROR_CODE, method);
            }
  
            return this.checkIfUserBelongsToTheSameBusiness$(user, authToken, method, roles);
          })
          .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))
      );
    }

    /**
     * Check if the user was deleted from Keycloak
     * @param {*} userKeycloakId 
     */
    static checkIfUserWasDeletedOnKeycloak$(userKeycloakId){
      return Rx.Observable.of(userKeycloakId)
      .mergeMap(userKeycloakId => UserDA.getUserByUserId$(userKeycloakId))
      .mergeMap(userKeycloak => {
        if(userKeycloak){
          return Rx.Observable.of(userKeycloakId)
        }else{
          return this.createCustomError$(USER_WAS_NOT_DELETED, method);
        }
      })
      .catch(error => Rx.Observable.of(userKeycloakId));
    }


  //Validates if the user can resset its password
  static validatePasswordReset$(data, authToken) {
    const method = "resetUserPassword$()";
    //Validate if the user that is performing the operation has the required role.
    return (this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const businessId = data.args ? (data.args.businessId ? data.args.businessId.trim(): undefined) : undefined
          return Rx.Observable.of(roles)
          .mergeMap(() => UserDA.getUserById$(data.args.userId, businessId))
          .map(user => [roles, user])
        })
        .mergeMap(([roles, userMongo]) => {
          const userPassword = data.args ? data.args.input:undefined;

          const user = {
            _id: data.args ? data.args.userId : undefined,
            userKeycloakId: userMongo.auth.userKeycloakId,
            password: {
              temporary: userPassword.temporary || false,
              value: userPassword.password
            }
          };

          if (!user._id || !userPassword || !userPassword.password) {
            return this.createCustomError$(USER_MISSING_DATA_ERROR_CODE, method);
          }

          //Checks if the user that is being updated exists on the same business of the user that is performing the operation
          return this.checkIfUserBelongsToTheSameBusiness$(
            user,
            authToken,
            method,
            roles
          );
          //return Rx.Observable.of(user);
        })
        .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))        

    );
  }

  //Validates if info to update the roles of an user
  static validateUserRoles$(data, authToken) {
    const method = "addRolesToTheUser$() | removeRolesFromUser$()";
    //Validate if the user that is performing the operation has the required role.
    return (
      this.checkRole$(authToken, method)
        .mergeMap(roles => {
          const user = {
            _id: data.args ? data.args.userId : undefined,
            userRoles: data.args ? data.args.input : undefined,
          };
          if (!user._id || !user.userRoles) {
            return this.createCustomError$(
              USER_MISSING_DATA_ERROR_CODE,
              method
            );
          }
          return this.checkIfUserBelongsToTheSameBusiness$(user, authToken, method, roles);
        })
        .mergeMap(user => this.checkIfUserIsTheSameUserLogged$(user, authToken))
    );
  }

  // /**
  //  * Checks if the user that is performing the operation is the same user that is going to be updated. If so, an error is throw.
  //  * @param {*} user
  //  * @param {*} authToken
  //  * @returns error if its trying to update its user
  //  */
  // static checkIfUserIsTheSameUserLogged$(user, authToken, method) {
  //   if (user._id == authToken.sub) {
  //     return this.createCustomError$(USER_UPDATE_OWN_INFO_ERROR_CODE, method);
  //   }
  //   return of(user);
  // }

  static checkIfUserIsTheSameUserLogged(user, authToken) {
    if (user._id == authToken.sub) {
      return this.throwCustomError(USER_UPDATE_OWN_INFO_ERROR_CODE, method);
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
      this.throwCustomError(USER_BELONG_TO_OTHER_BUSINESS_ERROR_CODE)
    }
  }

  /**
   * Checks if the user that is performing the operation has the needed permissions to execute the operation
   * @param {*} authToken Token of the user
   * @param {*} context Name of the microservice
   * @param {*} method Method where the verification is being done
   */
  static checkRole$(authToken, method) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      context,
      method,
      PERMISSION_DENIED_ERROR_CODE.code,
      PERMISSION_DENIED_ERROR_CODE.description,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER"]
    );
  }

  static checkEmailExistKeycloakOrMongo$(userId, userKeycloakId, email) {
    return of(email)
    .pipe(
      mergeMap(email => 
        forkJoin(
          DriverKeycloakDA.getUserKeycloak$(null, email),
          DriverDA.getUserByEmailMongo$(email),
          !userId ? userKeycloakId : DriverDA.getUserById$(userId).pipe(
            map(user => user.auth.userKeycloakId) 
          )
      )),
      mergeMap(([keycloakResult, mongoResult, userKeycloakId]) => {
        if (keycloakResult && keycloakResult.length > 0 && (!userKeycloakId || userKeycloakId != keycloakResult[0].id)) {
          return this.throwCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
         if (mongoResult && mongoResult.length > 0 && (!userKeycloakId || userKeycloakId != mongoResult._id)) {
          return this.createCustomError$(EMAIL_ALREADY_USED_ERROR_CODE);
        }
        return of(email);
      })
    );

  }

  static checkUsernameExistKeycloak$(user, username) {
    return UserDA.getUserKeycloak$(username)
    .mergeMap(userFound => {
       if(userFound && userFound.length > 0){
          return this.createCustomError$(USER_NAME_ALREADY_USED_CODE, 'Error');
        }
        return Rx.Observable.of(user);
      }
    );
  }

  static checkUserEmailExistKeycloak$(user, email) {
    return UserDA.getUserKeycloak$(null, email)
    .mergeMap(userFound => {
       if(userFound && userFound.length > 0){
          return this.createCustomError$(EMAIL_ALREADY_USED_ERROR_CODE, 'Error');
        }
        return Rx.Observable.of(user);
      }
    );
  }

/**
   * Creates a custom error observable
   * @param {*} errorCode Error code
   * @param {*} methodError Method where the error was generated
   */
  static throwCustomError(errorCode) {
    return Rx.Observable.throw(
      new CustomError(
        context,
        'Driver',
        errorCode.code,
        errorCode.description
      )
    );
  }

  // /**
  //  * Creates a custom error observable
  //  * @param {*} errorCode Error code
  //  * @param {*} methodError Method where the error was generated
  //  */
  // static createCustomError$(errorCode) {
  //   return Rx.Observable.throw(
  //     new CustomError(
  //       context,
  //       'Driver',
  //       errorCode.code,
  //       errorCode.description
  //     )
  //   );
  // }
}

module.exports = DriverValidatorHelper;
