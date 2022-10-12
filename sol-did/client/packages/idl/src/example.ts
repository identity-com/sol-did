export type Example = {
  "version": "0.1.0",
  "name": "example",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "solDidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "size",
          "type": "u32"
        }
      ]
    },
    {
      "name": "addService",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "solDidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "serviceType",
          "type": "string"
        },
        {
          "name": "serviceEndpoint",
          "type": "string"
        }
      ]
    }
  ]
};

export const IDL: Example = {
  "version": "0.1.0",
  "name": "example",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "solDidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "size",
          "type": "u32"
        }
      ]
    },
    {
      "name": "addService",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "solDidProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "serviceType",
          "type": "string"
        },
        {
          "name": "serviceEndpoint",
          "type": "string"
        }
      ]
    }
  ]
};
