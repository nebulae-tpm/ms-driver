import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  DriverCreateDriver,
  DriverUpdateDriverGeneralInfo,
  DriverUpdateDriverState,
  DriverUpdateDriverMembershipState,
  DriverDriver,
  DriverDriverUpdatedSubscription,
  DriverDriverBlocks,
  DriverCreateDriverAuth,
  DriverRemoveDriverAuth,
  DriverResetDriverPassword,
  RemoveDriverBlocking
} from '../gql/driver.js';

@Injectable()
export class DriverDetailService {

  lastOperation = null;

  driver = null;

  constructor(private gateway: GatewayService) {

  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the CREATE operation
   */
  createOperation$(driver: any) {
    return of('CREATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.driver = driver;
      })
    );
  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the UPDATE operation
   */
  updateOperation$(driver: any) {
    return of('UPDATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.driver = driver;
      })
    );
  }

  /**
   * Unregisters an operation, this is useful to indicate that we are not longer waiting for the response of the last operation
   */
  resetOperation$(){
    return of('').pipe(
      tap(() => {
        this.lastOperation = null;
        this.driver = null;
      })
    );
  }

  createDriverDriver$(driver: any) {
    console.log('DRIVER ======> ', driver);
    return this.createOperation$(driver)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: DriverCreateDriver,
          variables: {
            input: driver
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateDriverDriverGeneralInfo$(id: String, driverGeneralInfo: any) {
    console.log('DRIVER ======> ', driverGeneralInfo);
    return this.updateOperation$(driverGeneralInfo)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: DriverUpdateDriverGeneralInfo,
          variables: {
            id: id,
            input: driverGeneralInfo
          },
          errorPolicy: 'all'
        });
      })
    );
  }



  updateDriverDriverState$(id: String, newState: boolean) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: DriverUpdateDriverState,
        variables: {
          id: id,
          newState: newState
        },
        errorPolicy: 'all'
      });
  }

  updateDriverDriverMembershipState$(driverId: String, newState: boolean) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: DriverUpdateDriverMembershipState,
        variables: {
          id: driverId,
          newState: newState
        },
        errorPolicy: 'all'
      });
  }

    /**
   * Create auth for the driver.
   * @param driverId driverId
   * @param userPassword Password object
   * @param userPassword.username username
   * @param userPassword.password new password
   * @param userPassword.temporary Booleand that indicates if the password is temporal
   */
  createDriverAuth$(driverId, userPassword): Observable<any> {
    const authInput = {
      username: userPassword.username,
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: DriverCreateDriverAuth,
      variables: {
        id: driverId,
        username: userPassword.username,
        input: authInput
      },
      errorPolicy: 'all'
    });
  }

  /**
   * Removes auth credentials from user
   * @param id Id of the driver
   */
  removeDriverAuth$(id): Observable<any> {
    return this.gateway.apollo.mutate<any>({
      mutation: DriverRemoveDriverAuth,
      variables: {
        id: id
      },
      errorPolicy: 'all'
    });
  }

    /**
   * Resets the user password.
   * @param id id of the driver
   * @param userPassword new password
   * @param businessId Id of the business to which the user belongs
   */
  resetDriverPassword$(id, userPassword): Observable<any> {
    const userPasswordInput = {
      password: userPassword.password,
      temporary: userPassword.temporary || false
    };

    return this.gateway.apollo.mutate<any>({
      mutation: DriverResetDriverPassword,
      variables: {
        id: id,
        input: userPasswordInput
      },
      errorPolicy: "all"
    });
  }

  removeDriverBlock$(id: String, blockKey: string) {
    console.log('removeDriverBlock$', id, blockKey);
    return this.gateway.apollo
      .mutate<any>({
        mutation: RemoveDriverBlocking,
        variables: {
          id: id,
          blockKey: blockKey
        },
        errorPolicy: 'all'
      });
  }

  getDriverDriver$(entityId: string) {
    return this.gateway.apollo.query<any>({
      query: DriverDriver,
      variables: {
        id: entityId
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

  getDriverDriverBlocks$(driverId: string){
    return this.gateway.apollo.query<any>({
      query: DriverDriverBlocks,
      variables: {
        id: driverId
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

  }

/**
 * Event triggered when a business is created, updated or deleted.
 */
subscribeDriverDriverUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: DriverDriverUpdatedSubscription
  });
}

}
