export type SolDid = {
  "version": "3.3.0",
  "name": "sol_did",
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
      "name": "resize",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "size",
          "type": "u32"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "close",
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
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "addVerificationMethod",
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
        }
      ],
      "args": [
        {
          "name": "verificationMethod",
          "type": {
            "defined": "VerificationMethod"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "removeVerificationMethod",
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
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
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
        }
      ],
      "args": [
        {
          "name": "service",
          "type": {
            "defined": "Service"
          }
        },
        {
          "name": "allowOverwrite",
          "type": "bool"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "removeService",
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
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "setVmFlags",
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
        }
      ],
      "args": [
        {
          "name": "flagsVm",
          "type": {
            "defined": "UpdateFlagsVerificationMethod"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "setControllers",
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
        }
      ],
      "args": [
        {
          "name": "setControllersArg",
          "type": {
            "defined": "SetControllersArg"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "update",
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
        }
      ],
      "args": [
        {
          "name": "updateArg",
          "type": {
            "defined": "UpdateArg"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "migrate",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "legacyDidData",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "didAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "Version identifier"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce, for protecting against replay attacks around secp256k1 signatures."
            ],
            "type": "u64"
          },
          {
            "name": "initialVerificationMethod",
            "docs": [
              "The initial authority key, automatically being added to the array of all Verification Methods."
            ],
            "type": {
              "defined": "VerificationMethod"
            }
          },
          {
            "name": "verificationMethods",
            "docs": [
              "All verification methods"
            ],
            "type": {
              "vec": {
                "defined": "VerificationMethod"
              }
            }
          },
          {
            "name": "services",
            "docs": [
              "Services"
            ],
            "type": {
              "vec": {
                "defined": "Service"
              }
            }
          },
          {
            "name": "nativeControllers",
            "docs": [
              "Controller (native) - did:sol:<controller>"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "docs": [
              "Controller (others) - all others"
            ],
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "SetControllersArg",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nativeControllers",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateFlagsVerificationMethod",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fragment",
            "type": "string"
          },
          {
            "name": "flags",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "UpdateArg",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "verificationMethods",
            "docs": [
              "All verification methods"
            ],
            "type": {
              "vec": {
                "defined": "VerificationMethod"
              }
            }
          },
          {
            "name": "services",
            "docs": [
              "Services"
            ],
            "type": {
              "vec": {
                "defined": "Service"
              }
            }
          },
          {
            "name": "nativeControllers",
            "docs": [
              "Controller (native) - did:sol:<controller>"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "docs": [
              "Controller (others) - all others"
            ],
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "VerificationMethod",
      "docs": [
        "The native authority key for a [`DidAccount`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fragment",
            "docs": [
              "fragment"
            ],
            "type": "string"
          },
          {
            "name": "flags",
            "docs": [
              "The permissions this key has"
            ],
            "type": "u16"
          },
          {
            "name": "methodType",
            "docs": [
              "The actual verification method"
            ],
            "type": "u8"
          },
          {
            "name": "keyData",
            "docs": [
              "Dynamically sized key matching the given VerificationType"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "Service",
      "docs": [
        "A Service Definition [`DidAccount`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
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
    },
    {
      "name": "Secp256k1RawSignature",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "recoveryId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "VerificationMethodType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Ed25519VerificationKey2018"
          },
          {
            "name": "EcdsaSecp256k1RecoveryMethod2020"
          },
          {
            "name": "EcdsaSecp256k1VerificationKey2019"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "VmFragmentNotFound",
      "msg": "No VM with the given fragment exists"
    },
    {
      "code": 6001,
      "name": "VmFragmentAlreadyInUse",
      "msg": "Given VM fragment is already in use"
    },
    {
      "code": 6002,
      "name": "VmGuardedFlagOnAdd",
      "msg": "Cannot add a verification method with guarded flag (OwnershipProof or Protected)"
    },
    {
      "code": 6003,
      "name": "VmCannotRemoveLastAuthority",
      "msg": "Removing the last verification method would lead to a lockout"
    },
    {
      "code": 6004,
      "name": "ServiceFragmentAlreadyInUse",
      "msg": "Service already exists in current service list"
    },
    {
      "code": 6005,
      "name": "ServiceFragmentNotFound",
      "msg": "Service doesn't exists in current service list"
    },
    {
      "code": 6006,
      "name": "InvalidOtherControllers",
      "msg": "Invalid other controllers. Invalid DID format or did:sol:<did>"
    },
    {
      "code": 6007,
      "name": "InvalidNativeControllers",
      "msg": "Invalid native controllers. Cannot set itself as a controller"
    },
    {
      "code": 6008,
      "name": "InsufficientInitialSize",
      "msg": "Initial Account size is insufficient for serialization"
    },
    {
      "code": 6009,
      "name": "ConversionError",
      "msg": "Could not convert between data types"
    },
    {
      "code": 6010,
      "name": "InvalidControllerChain",
      "msg": "Invalid chain of controlling DidAccounts"
    },
    {
      "code": 6011,
      "name": "ErrorValidatingSecp256k1Signature",
      "msg": "An error occurred while validating Secp256k1 signature"
    },
    {
      "code": 6012,
      "name": "WrongAuthorityForDid",
      "msg": "Wrong Authority for given DID"
    },
    {
      "code": 6013,
      "name": "VmCannotRemoveProtected",
      "msg": "Cannot remove a protected verification method. You need to first remove the Protected Verification Method Flag in order for this operation to succeed"
    }
  ]
};

export const IDL: SolDid = {
  "version": "3.3.0",
  "name": "sol_did",
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
      "name": "resize",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "size",
          "type": "u32"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "close",
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
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "addVerificationMethod",
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
        }
      ],
      "args": [
        {
          "name": "verificationMethod",
          "type": {
            "defined": "VerificationMethod"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "removeVerificationMethod",
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
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
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
        }
      ],
      "args": [
        {
          "name": "service",
          "type": {
            "defined": "Service"
          }
        },
        {
          "name": "allowOverwrite",
          "type": "bool"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "removeService",
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
        }
      ],
      "args": [
        {
          "name": "fragment",
          "type": "string"
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "setVmFlags",
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
        }
      ],
      "args": [
        {
          "name": "flagsVm",
          "type": {
            "defined": "UpdateFlagsVerificationMethod"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "setControllers",
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
        }
      ],
      "args": [
        {
          "name": "setControllersArg",
          "type": {
            "defined": "SetControllersArg"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "update",
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
        }
      ],
      "args": [
        {
          "name": "updateArg",
          "type": {
            "defined": "UpdateArg"
          }
        },
        {
          "name": "ethSignature",
          "type": {
            "option": {
              "defined": "Secp256k1RawSignature"
            }
          }
        }
      ]
    },
    {
      "name": "migrate",
      "accounts": [
        {
          "name": "didData",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "legacyDidData",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "didAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "Version identifier"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump"
            ],
            "type": "u8"
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce, for protecting against replay attacks around secp256k1 signatures."
            ],
            "type": "u64"
          },
          {
            "name": "initialVerificationMethod",
            "docs": [
              "The initial authority key, automatically being added to the array of all Verification Methods."
            ],
            "type": {
              "defined": "VerificationMethod"
            }
          },
          {
            "name": "verificationMethods",
            "docs": [
              "All verification methods"
            ],
            "type": {
              "vec": {
                "defined": "VerificationMethod"
              }
            }
          },
          {
            "name": "services",
            "docs": [
              "Services"
            ],
            "type": {
              "vec": {
                "defined": "Service"
              }
            }
          },
          {
            "name": "nativeControllers",
            "docs": [
              "Controller (native) - did:sol:<controller>"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "docs": [
              "Controller (others) - all others"
            ],
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "SetControllersArg",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nativeControllers",
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateFlagsVerificationMethod",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fragment",
            "type": "string"
          },
          {
            "name": "flags",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "UpdateArg",
      "docs": [
        "Argument"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "verificationMethods",
            "docs": [
              "All verification methods"
            ],
            "type": {
              "vec": {
                "defined": "VerificationMethod"
              }
            }
          },
          {
            "name": "services",
            "docs": [
              "Services"
            ],
            "type": {
              "vec": {
                "defined": "Service"
              }
            }
          },
          {
            "name": "nativeControllers",
            "docs": [
              "Controller (native) - did:sol:<controller>"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "otherControllers",
            "docs": [
              "Controller (others) - all others"
            ],
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "VerificationMethod",
      "docs": [
        "The native authority key for a [`DidAccount`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fragment",
            "docs": [
              "fragment"
            ],
            "type": "string"
          },
          {
            "name": "flags",
            "docs": [
              "The permissions this key has"
            ],
            "type": "u16"
          },
          {
            "name": "methodType",
            "docs": [
              "The actual verification method"
            ],
            "type": "u8"
          },
          {
            "name": "keyData",
            "docs": [
              "Dynamically sized key matching the given VerificationType"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "Service",
      "docs": [
        "A Service Definition [`DidAccount`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
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
    },
    {
      "name": "Secp256k1RawSignature",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "signature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "recoveryId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "VerificationMethodType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Ed25519VerificationKey2018"
          },
          {
            "name": "EcdsaSecp256k1RecoveryMethod2020"
          },
          {
            "name": "EcdsaSecp256k1VerificationKey2019"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "VmFragmentNotFound",
      "msg": "No VM with the given fragment exists"
    },
    {
      "code": 6001,
      "name": "VmFragmentAlreadyInUse",
      "msg": "Given VM fragment is already in use"
    },
    {
      "code": 6002,
      "name": "VmGuardedFlagOnAdd",
      "msg": "Cannot add a verification method with guarded flag (OwnershipProof or Protected)"
    },
    {
      "code": 6003,
      "name": "VmCannotRemoveLastAuthority",
      "msg": "Removing the last verification method would lead to a lockout"
    },
    {
      "code": 6004,
      "name": "ServiceFragmentAlreadyInUse",
      "msg": "Service already exists in current service list"
    },
    {
      "code": 6005,
      "name": "ServiceFragmentNotFound",
      "msg": "Service doesn't exists in current service list"
    },
    {
      "code": 6006,
      "name": "InvalidOtherControllers",
      "msg": "Invalid other controllers. Invalid DID format or did:sol:<did>"
    },
    {
      "code": 6007,
      "name": "InvalidNativeControllers",
      "msg": "Invalid native controllers. Cannot set itself as a controller"
    },
    {
      "code": 6008,
      "name": "InsufficientInitialSize",
      "msg": "Initial Account size is insufficient for serialization"
    },
    {
      "code": 6009,
      "name": "ConversionError",
      "msg": "Could not convert between data types"
    },
    {
      "code": 6010,
      "name": "InvalidControllerChain",
      "msg": "Invalid chain of controlling DidAccounts"
    },
    {
      "code": 6011,
      "name": "ErrorValidatingSecp256k1Signature",
      "msg": "An error occurred while validating Secp256k1 signature"
    },
    {
      "code": 6012,
      "name": "WrongAuthorityForDid",
      "msg": "Wrong Authority for given DID"
    },
    {
      "code": 6013,
      "name": "VmCannotRemoveProtected",
      "msg": "Cannot remove a protected verification method. You need to first remove the Protected Verification Method Flag in order for this operation to succeed"
    }
  ]
};
