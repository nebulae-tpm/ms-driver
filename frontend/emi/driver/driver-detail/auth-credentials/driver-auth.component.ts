////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormGroupDirective
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import {
  map,
  mergeMap,
  switchMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take
} from 'rxjs/operators';

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';

//////////// i18n ////////////
import {
  TranslateService
} from '@ngx-translate/core';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';

//////////// Others ////////////
import { KeycloakService } from 'keycloak-angular';
import { DriverDetailService } from '../driver-detail.service';
import { DialogComponent } from '../../dialog/dialog.component';
import { ToolbarService } from "../../../../toolbar/toolbar.service";

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'driver-auth',
  templateUrl: './driver-auth.component.html',
  styleUrls: ['./driver-auth.component.scss']
})
// tslint:disable-next-line:class-name
export class DriverAuthComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('pageType') pageType: string;
  @Input('driver') driver: any;

  userAuthForm: any;


  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private DriverDetailservice: DriverDetailService,
    private dialog: MatDialog,
    private toolbarService: ToolbarService
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.userAuthForm = this.createUserAuthForm();
  }

    /**
   * Creates the user auth reactive form
   */
  createUserAuthForm() {
    return this.formBuilder.group(
      {
        username: [
        {
          value: this.driver.auth ? this.driver.auth.username : '',
          disabled: (this.pageType !== 'new' && this.driver.auth && this.driver.auth.username)
        },
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9._-]{8,}$')
        ])
      ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            Validators.pattern(
              '^(?=[a-zA-Z0-9.]{8,}$)(?=.*?[a-z])(?=.*?[0-9]).*'
            )
          ])
        ],
        passwordConfirmation: ['', Validators.required],
        temporary: [false, Validators.required]
      },
      {
        validator: this.checkIfMatchingPasswords(
          'password',
          'passwordConfirmation'
        )
      }
    );
  }

  /**
   * Create the driver auth on Keycloak
   */
  createDriverAuth(formDirective: FormGroupDirective) {
    const data = this.userAuthForm.getRawValue();

    this.makeOperation$(this.DriverDetailservice.createDriverAuth$(this.driver._id, data))
    .subscribe(
        model => {
          this.showSnackBar('DRIVER.WAIT_OPERATION');
          formDirective.resetForm();
          this.driver.auth = {
            username: data.username
          };
          this.userAuthForm.reset();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  /**
   * Remove the user auth
   */
  removeDriverAuth() {

    this.makeOperation$(this.DriverDetailservice.removeDriverAuth$(this.driver._id))
    .subscribe(
        model => {
          this.showSnackBar('DRIVER.WAIT_OPERATION');
          this.driver.auth = null;
          this.userAuthForm.reset();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

    /**
   * Reset the user password
   */
  resetDriverPassword(formDirective: FormGroupDirective) {
    const data = this.userAuthForm.getRawValue();

    this.makeOperation$(this.DriverDetailservice.resetDriverPassword$(this.driver._id, data))
    .subscribe(
        model => {
          this.showSnackBar('DRIVER.WAIT_OPERATION');
          //this.userAuthForm.reset();
          formDirective.resetForm();
          this.userAuthForm = this.createUserAuthForm();
        },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  /**
   * Make observable operations
   */
  makeOperation$(observableOperation) {
    return this.showConfirmationDialog$('DRIVER.UPDATE_MESSAGE', 'DRIVER.UPDATE_TITLE')
    .pipe(
      mergeMap(ok => observableOperation),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter((resp: any) => !resp.errors || resp.errors.length === 0),
      takeUntil(this.ngUnsubscribe)
    );
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      // Opens confirm dialog
      .open(DialogComponent, {
        data: {
          dialogMessage,
          dialogTitle
        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
      );
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('DRIVER.CLOSE'), {
        duration: 6000
      });
  }

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response)))
      .pipe(
        tap((resp: any) => {
          this.showSnackBarError(resp);

          return resp;
        })
      );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    if (response.errors) {

      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(error => {
              this.showMessageSnackbar('ERRORS.' + error.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    let translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData)
      .subscribe(data => {
        this.snackBar.open(
          messageKey ? data[messageKey] : '',
          detailMessageKey ? data[detailMessageKey] : '',
          {
            duration: 2000
          }
        );
      });
  }

  /**
   * Checks if the passwords match, otherwise the form will be invalid.
   * @param passwordKey new Password
   * @param passwordConfirmationKey Confirmation of the new password
   */
  checkIfMatchingPasswords(
    passwordKey: string,
    passwordConfirmationKey: string
  ) {
    return (group: FormGroup) => {
      const passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];
      if (passwordInput.value !== passwordConfirmationInput.value) {
        return passwordConfirmationInput.setErrors({ notEquivalent: true });
      } else {
        return passwordConfirmationInput.setErrors(null);
      }
    };
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
