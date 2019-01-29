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
  FormArray
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
  selector: 'driver-general-info',
  templateUrl: './driver-general-info.component.html',
  styleUrls: ['./driver-general-info.component.scss']
})
// tslint:disable-next-line:class-name
export class DriverDetailGeneralInfoComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('pageType') pageType: string;
  @Input('driver') driver: any;

  driverGeneralInfoForm: any;
  driverStateForm: any;

  documentTypes= ['CC', 'PASSPORT'];
  genders = ['FEMALE', 'MALE'];

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
    const englishState = this.driver ? this.driver.generalInfo.languages.find(language => language.name === 'english'): false;
    this.driverGeneralInfoForm = new FormGroup({
      documentType: new FormControl(this.driver ? (this.driver.generalInfo || {}).documentType : '', [Validators.required]),
      document: new FormControl(this.driver ? (this.driver.generalInfo || {}).document : '', [Validators.required]),
      name: new FormControl(this.driver ? (this.driver.generalInfo || {}).name : '', [Validators.required]),
      lastname: new FormControl(this.driver ? (this.driver.generalInfo || {}).lastname : '', [Validators.required]),
      email: new FormControl(this.driver ? (this.driver.generalInfo || {}).email : '', [Validators.required, Validators.email]),
      phone: new FormControl(this.driver ? (this.driver.generalInfo || {}).phone : '', [Validators.required]),
      gender: new FormControl(this.driver ? (this.driver.generalInfo || {}).gender : '', [Validators.required]),
      pmr: new FormControl(this.driver ? (this.driver.generalInfo || {}).pmr : false, [Validators.required]),
      languages: new FormArray([
        new FormGroup({
          name: new FormControl('english'),
          active: new FormControl(englishState ? englishState.active : false)
        }),
      ])
    });



    this.driverStateForm = new FormGroup({
      state: new FormControl(this.driver ? this.driver.state : true)
    });
  }

  createDriver() {
    this.toolbarService.onSelectedBusiness$
    .pipe(
      take(1),
      tap(selectedBusiness => {
        if(!selectedBusiness){
          this.showSnackBar('DRIVER.SELECT_BUSINESS');
        }
      }),
      filter(selectedBusiness => selectedBusiness != null && selectedBusiness.id != null),
      mergeMap(selectedBusiness => {
        return this.showConfirmationDialog$("DRIVER.CREATE_MESSAGE", "DRIVER.CREATE_TITLE")
        .pipe(
          mergeMap(() => {
            this.driver = {
              generalInfo: this.driverGeneralInfoForm.getRawValue(),
              state: this.driverStateForm.getRawValue().state,
              businessId: selectedBusiness.id
            };
            return this.DriverDetailservice.createDriverDriver$(this.driver);
          }),
          mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
          filter((resp: any) => !resp.errors || resp.errors.length === 0),
        )
      }),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(result => {
        this.showSnackBar('DRIVER.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
    );
  }

  updateDriverGeneralInfo() {
    this.showConfirmationDialog$("DRIVER.UPDATE_MESSAGE", "DRIVER.UPDATE_TITLE")
      .pipe(
        mergeMap(ok => {
          const generalInfoinput = {
            documentType: this.driverGeneralInfoForm.getRawValue().documentType,
            document: this.driverGeneralInfoForm.getRawValue().document,
            name: this.driverGeneralInfoForm.getRawValue().name,
            lastname: this.driverGeneralInfoForm.getRawValue().lastname,
            email: this.driverGeneralInfoForm.getRawValue().email,
            phone: this.driverGeneralInfoForm.getRawValue().phone,
            gender: this.driverGeneralInfoForm.getRawValue().gender,
            pmr: this.driverGeneralInfoForm.getRawValue().pmr,
            languages:  this.driverGeneralInfoForm.getRawValue().languages
          };
          console.log('this.driverGeneralInfoForm.getRawValue() => ', this.driverGeneralInfoForm.getRawValue());
          return this.DriverDetailservice.updateDriverDriverGeneralInfo$(this.driver._id, generalInfoinput);
        }),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(result => {
        this.showSnackBar('DRIVER.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
      );

  }

  onDriverStateChange() {
    this.showConfirmationDialog$("DRIVER.UPDATE_MESSAGE", "DRIVER.UPDATE_TITLE")
      .pipe(
        mergeMap(ok => {
          return this.DriverDetailservice.updateDriverDriverState$(this.driver._id, this.driverStateForm.getRawValue().state);
        }),
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(result => {
        this.showSnackBar('DRIVER.WAIT_OPERATION');
      },
        error => {
          this.showSnackBar('DRIVER.ERROR_OPERATION');
          console.log('Error ==> ', error);
        });
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      //Opens confirm dialog
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



  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
