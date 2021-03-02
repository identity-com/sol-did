import { ServerResponse } from 'http';

export class ResponseContent<T> {
  constructor(readonly code: number = 200, readonly payload?: T) {}
}

export const writeJson = <T>(
  response: ServerResponse,
  responseContents: ResponseContent<T>
) => {
  const payloadString = JSON.stringify(responseContents.payload, null, 2);
  response.writeHead(responseContents.code, {
    'Content-Type': 'application/json',
  });
  response.end(payloadString);
};
