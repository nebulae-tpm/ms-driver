import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  DriverCreateDriver,
  DriverUpdateDriverGeneralInfo,
  DriverUpdateDriverState,
  DriverDriver,
  DriverDriverUpdatedSubscription,
  DriverDriverBlocks,
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

  removeVehicleBlock$(id: String, blockKey: string) {
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
