import path from 'path';
import http from 'http';
import * as oas3Tools from 'oas3-tools';
import { Oas3AppOptions } from 'oas3-tools/dist/middleware/oas3.options';
import {
  registerDID,
  resolveDID,
  updateDID,
  deactivateDID,
} from './controllers/Default';

const serverPort = process.env.PORT || 8080;

// swaggerRouter configuration
// @ts-ignore
const options: Oas3AppOptions = {
  routing: {
    controllers: {
      Default_resolve: resolveDID,
      Default_register: registerDID,
      Default_update: updateDID,
      Default_deactivate: deactivateDID,
    },
  },
  logging: {
    format: 'combined',
    errorLimit: 400,
  },
  openApiValidator: {
    apiSpec: '',
  },
};

const expressAppConfig = oas3Tools.expressAppConfig(
  path.join(__dirname, 'api/openapi.yml'),
  options
);

const app = expressAppConfig.getApp();

// Initialize the Swagger middleware
export const server = http.createServer(app).listen(serverPort, () => {
  console.log(
    'Your server is listening on port %d (http://localhost:%d)',
    serverPort,
    serverPort
  );
  console.log(
    'Swagger-ui is available on http://localhost:%d/docs',
    serverPort
  );
});
