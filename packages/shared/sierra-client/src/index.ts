import {APIResponse, errorResponse, ResponseStatus, successResponse, unhandledError} from '@weco/identity-common';
import type {AxiosInstance} from 'axios';
import axios from 'axios';
import {extractRecordNumberFromCreate, PatronRecord, toCreatePatron, toPatronRecord} from './patron';

export default class SierraClient {

  apiRoot: string;
  clientKey: string;
  clientSecret: string;

  constructor(apiRoot: string, clientKey: string, clientSecret: string) {
    this.apiRoot = apiRoot;
    this.clientKey = clientKey;
    this.clientSecret = clientSecret;
  }

  async validateCredentials(barcode: string, pin: string): Promise<APIResponse<{}>> {
    return this.getInstance().then(instance => {
      return instance.post('/v6/patrons/validate', {
        barcode: barcode,
        pin: pin
      }, {
        validateStatus: status => status === 204
      }).then(() =>
        successResponse({})
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 400:
              return errorResponse('Invalid Patron credentials for barcode [' + barcode + ']', ResponseStatus.InvalidCredentials, error);
          }
        }
        return unhandledError(error);
      });
    });
  }

  async getPatronRecordByRecordNumber(recordNumber: number): Promise<APIResponse<PatronRecord>> {
    return this.getInstance().then(instance => {
      return instance.get('/v6/patrons/' + recordNumber, {
        params: {
          fields: 'varFields'
        },
        validateStatus: status => status === 200
      }).then(response =>
        successResponse(toPatronRecord(response.data))
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 404:
              return errorResponse('Patron record with record number [' + recordNumber + '] not found', ResponseStatus.NotFound, error);
          }
        }
        return unhandledError(error);
      });
    });
  }

  async getPatronRecordByBarcode(barcode: string): Promise<APIResponse<PatronRecord>> {
    return this.getInstance().then(instance => {
      return instance.get('/v6/patrons/find', {
        params: {
          varFieldTag: 'b',
          varFieldContent: barcode,
          fields: 'varFields'
        },
        validateStatus: status => status === 200
      }).then(response =>
        successResponse(toPatronRecord(response.data))
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 404:
              return errorResponse('Patron record with barcode [' + barcode + '] not found', ResponseStatus.NotFound, error);
          }
        }
        return unhandledError(error);
      });
    });
  }

  async getPatronRecordByEmail(email: string): Promise<APIResponse<PatronRecord>> {
    return this.getInstance().then(instance => {
      return instance.get('/v6/patrons/find', {
        params: {
          varFieldTag: 'z',
          varFieldContent: email.toLowerCase(),
          fields: 'varFields'
        },
        validateStatus: status => status === 200
      }).then(response =>
        successResponse(toPatronRecord(response.data))
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 404:
              return errorResponse('Patron record with email address [' + email + '] not found', ResponseStatus.NotFound, error);
          }
        }
        return unhandledError(error);
      });
    });
  }

  async createPatronRecord(title: string, firstName: string, lastName: string, pin: string): Promise<APIResponse<number>> {
    return this.getInstance().then(instance => {
      return instance.post('/v6/patrons', toCreatePatron(title, firstName, lastName, pin), {
        validateStatus: status => status === 200
      }).then(response =>
        successResponse(extractRecordNumberFromCreate(response.data.link))
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 400:
              return errorResponse('Malformed or invalid Patron record creation request', ResponseStatus.MalformedRequest, error);
          }
        }
        return unhandledError(error);
      });
    });
  }

  async updatePatronRecord(recordNumber: number, email: string): Promise<APIResponse<PatronRecord>> {
    return this.getInstance().then(instance => {
      return instance.put('/v6/patrons/' + recordNumber, {
        emails: [email],
        barcodes: [recordNumber.toString()]
      }, {
        validateStatus: status => status === 204
      }).then(() =>
        this.getPatronRecordByRecordNumber(recordNumber)
      ).catch(error => {
        if (error.response) {
          switch (error.response.status) {
            case 400:
              return errorResponse('Malformed or invalid Patron barcode update request', ResponseStatus.MalformedRequest, error);
          }
        }
        return unhandledError(error);
      });
    })
  }

  private async getInstance(): Promise<AxiosInstance> {
    return axios.post(this.apiRoot + '/token', {}, {
      auth: {
        username: this.clientKey,
        password: this.clientSecret
      },
      validateStatus: status => status === 200
    }).then(response => {
      return axios.create({
        baseURL: this.apiRoot,
        headers: {
          Authorization: 'Bearer ' + response.data.access_token
        }
      });
    });
  }
}
