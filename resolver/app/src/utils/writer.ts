import { ServerResponse } from 'http';

export class ResponseContent {
  constructor(readonly code: number = 200, readonly payload?: object) {}
}

export const writeJson = (
  response: ServerResponse,
  responseContents: ResponseContent
) => {
  const payloadString = JSON.stringify(responseContents.payload, null, 2);
  response.writeHead(responseContents.code, {
    'Content-Type': 'application/json',
  });
  response.end(payloadString);
};
